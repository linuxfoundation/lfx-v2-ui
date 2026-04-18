// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { CredlyService } from '../services/credly.service';
import { EmailVerificationService } from '../services/email-verification.service';
import { logger } from '../services/logger.service';
import { getEffectiveEmail, getEffectiveSub, getUsernameFromAuth } from '../utils/auth-helper';

export class BadgesController {
  private readonly credlyService = new CredlyService();
  private readonly emailVerificationService = new EmailVerificationService();

  /**
   * GET /api/badges
   * Get badges for the authenticated user from Credly.
   * Resolves primary + alternate verified emails via email-verification.service
   * (NATS) so badges earned under secondary addresses are included.
   * The OIDC session email is always included as a safety net.
   * Falls back to OIDC email only if the service lookup fails.
   */
  public async getBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_badges');

    try {
      const emails = await this.resolveUserEmails(req);

      if (emails.length === 0) {
        logger.warning(req, 'get_badges', 'No resolvable email for authenticated user, returning empty badges', {});
        logger.success(req, 'get_badges', startTime, { email_count: 0, badge_count: 0 });
        res.json([]);
        return;
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
   * Resolve email addresses for the authenticated user.
   * Fetches primary + verified alternate emails via email-verification.service (NATS).
   * The OIDC/effective session email is always included to cover cases where the
   * service response doesn't include it. Falls back to session email only on failure.
   * Uses impersonation-aware helpers so badges resolve correctly during CTE sessions.
   */
  private async resolveUserEmails(req: Request): Promise<string[]> {
    const sessionEmail = getEffectiveEmail(req);

    try {
      const userSub = getEffectiveSub(req);

      if (!userSub) {
        const userIdentifier = await getUsernameFromAuth(req);
        if (!userIdentifier) {
          logger.debug(req, 'resolve_user_emails', 'No user identifier from auth, using session email only', {});
          return sessionEmail ? [sessionEmail] : [];
        }
        return await this.resolveEmailsFromService(req, userIdentifier, sessionEmail);
      }

      return await this.resolveEmailsFromService(req, userSub, sessionEmail);
    } catch (error) {
      logger.warning(req, 'resolve_user_emails', 'Failed to resolve emails, falling back to session email', {
        err: error instanceof Error ? error : new Error(String(error)),
      });
      return sessionEmail ? [sessionEmail] : [];
    }
  }

  /**
   * Fetch emails from email-verification.service and dedupe into a flat list.
   * Includes primary email, verified alternates, and the session email as a safety net.
   */
  private async resolveEmailsFromService(req: Request, userIdentifier: string, sessionEmail: string | null): Promise<string[]> {
    const emailData = await this.emailVerificationService.getUserEmails(req, userIdentifier);

    if (!emailData) {
      logger.debug(req, 'resolve_user_emails', 'Email service returned no data, using session email only', {});
      return sessionEmail ? [sessionEmail] : [];
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

    // Always include session email as safety net
    if (sessionEmail) {
      allEmails.add(sessionEmail.toLowerCase());
    }

    logger.debug(req, 'resolve_user_emails', 'Resolved emails via email-verification.service', {
      resolved_count: allEmails.size,
      source: 'email-verification',
    });

    return Array.from(allEmails);
  }
}
