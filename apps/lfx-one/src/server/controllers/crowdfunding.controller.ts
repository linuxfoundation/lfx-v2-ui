// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { logger } from '../services/logger.service';
import { CrowdfundingService } from '../services/crowdfunding.service';
import { getUsernameFromAuth, stripAuthPrefix } from '../utils/auth-helper';

export class CrowdfundingController {
  private readonly crowdfundingService = new CrowdfundingService();

  /**
   * GET /api/crowdfunding/initiatives
   * Get crowdfunding initiatives for the authenticated user
   */
  public async getMyInitiatives(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_my_initiatives');

    try {
      const rawUsername = await getUsernameFromAuth(req);

      if (!rawUsername) {
        throw new AuthenticationError('User authentication required', {
          operation: 'get_my_initiatives',
        });
      }

      const username = stripAuthPrefix(rawUsername);
      const initiatives = await this.crowdfundingService.getMyInitiatives(req, username);

      logger.success(req, 'get_my_initiatives', startTime, {
        result_count: initiatives.data.length,
      });

      res.json(initiatives);
    } catch (error) {
      next(error);
    }
  }
}
