// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { CredlyService } from '../services/credly.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { logger } from '../services/logger.service';
import { getUsernameFromAuth } from '../utils/auth-helper';

export class BadgesController {
  private readonly credlyService = new CredlyService();
  private readonly emailVerificationService = new EmailVerificationService();

  /**
   * GET /api/badges
   * Get badges for the authenticated user from Credly.
   * Resolves all verified emails via email-verification.service (NATS) so badges
   * earned under secondary addresses are included. Falls back to OIDC email on failure.
   */
  public async getBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_badges');

    try {
      const emails = await this.resolveUserEmails(req);

      if (emails.length === 0) {
        return next(new AuthenticationError('User authentication required', { operation: 'get_badges' }));
      }

      const badges = await this.credlyService.getBadgesForEmails(req, emails);

      logger.success(req, 'get_badges', startTime, {
        email_count: emails.length,
        badge_count: badges.length,
      });

      res.json(badges);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Resolve all verified email addresses for the authenticated user.
   * Fetches primary + alternate emails via email-verification.service (NATS).
   * Falls back to the single OIDC session email if the lookup fails.
   */
  private async resolveUserEmails(req: Request): Promise<string[]> {
    const oidcEmail = (req.oidc?.user?.['email'] as string)?.toLowerCase();

    try {
      const userSub = req.oidc?.user?.['sub'] as string | undefined;

      if (!userSub) {
        const username = await getUsernameFromAuth(req);
        if (!username) {
          logger.debug(req, 'resolve_user_emails', 'No user identifier from auth, using OIDC email only', {});
          return oidcEmail ? [oidcEmail] : [];
        }
        // Fall back to username-based lookup
        return await this.resolveEmailsFromService(req, username, oidcEmail);
      }

      return await this.resolveEmailsFromService(req, userSub, oidcEmail);
    } catch (error) {
      logger.warning(req, 'resolve_user_emails', 'Failed to resolve emails, falling back to OIDC email', {
        err: error instanceof Error ? error : new Error(String(error)),
      });
      return oidcEmail ? [oidcEmail] : [];
    }
  }

  /**
   * Fetch emails from email-verification.service and dedupe into a flat list.
   */
  private async resolveEmailsFromService(req: Request, userIdentifier: string, oidcEmail: string | undefined): Promise<string[]> {
    const emailData = await this.emailVerificationService.getUserEmails(req, userIdentifier);

    if (!emailData) {
      logger.debug(req, 'resolve_user_emails', 'Email service returned no data, using OIDC email only', {});
      return oidcEmail ? [oidcEmail] : [];
    }

    // Collect primary + verified alternates, deduped and lowercased
    const allEmails = new Set<string>();

    if (emailData.primary_email) {
      allEmails.add(emailData.primary_email.toLowerCase());
    }

    for (const alt of emailData.alternate_emails ?? []) {
      if (alt.verified && alt.email) {
        allEmails.add(alt.email.toLowerCase());
      }
    }

    // Ensure OIDC email is included even if not in the service response
    if (oidcEmail) {
      allEmails.add(oidcEmail);
    }

    logger.debug(req, 'resolve_user_emails', 'Resolved verified emails via email-verification.service', {
      resolved_count: allEmails.size,
      source: 'email-verification',
    });

    return Array.from(allEmails);
  }
}
