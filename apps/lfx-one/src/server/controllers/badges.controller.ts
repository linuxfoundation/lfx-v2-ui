// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { CredlyService } from '../services/credly.service';
import { logger } from '../services/logger.service';
import { getUsernameFromAuth } from '../utils/auth-helper';

export class BadgesController {
  private readonly credlyService = new CredlyService();

  /**
   * GET /api/badges
   * Get badges for the authenticated user from Credly.
   * Currently resolves only the OIDC session email.
   * TODO: Migrate to email-verification.service to include secondary verified emails.
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
   * Resolve verified email addresses for the authenticated user.
   * TODO: Currently returns OIDC email only; migrate to email-verification.service
   * to retrieve all verified emails for a user.
   */
  private async resolveUserEmails(req: Request): Promise<string[]> {
    const oidcEmail = (req.oidc?.user?.['email'] as string)?.toLowerCase();

    try {
      const username = await getUsernameFromAuth(req);

      if (!username) {
        logger.debug(req, 'resolve_user_emails', 'No username from auth, using OIDC email only', {});
        return oidcEmail ? [oidcEmail] : [];
      }

      // TODO: Migrate to email-verification.service to resolve all verified emails
      logger.debug(req, 'resolve_user_emails', 'Using OIDC email only (pending email-verification migration)', {
        source: 'oidc',
      });
      return oidcEmail ? [oidcEmail] : [];
    } catch (error) {
      logger.warning(req, 'resolve_user_emails', 'Failed to resolve emails, falling back to OIDC email', {
        err: error instanceof Error ? error : new Error(String(error)),
      });
      return oidcEmail ? [oidcEmail] : [];
    }
  }
}
