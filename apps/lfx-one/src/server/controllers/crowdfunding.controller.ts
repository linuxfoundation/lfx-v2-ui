// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { CrowdfundingService } from '../services/crowdfunding.service';
import { logger } from '../services/logger.service';
import { getUsernameFromAuth, stripAuthPrefix } from '../utils/auth-helper';

export class CrowdfundingController {
  private readonly crowdfundingService = new CrowdfundingService();

  // GET /api/crowdfunding/initiatives
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

  // GET /api/crowdfunding/initiatives/stats
  public async getInitiativesStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_initiatives_stats');

    try {
      const rawUsername = await getUsernameFromAuth(req);

      if (!rawUsername) {
        throw new AuthenticationError('User authentication required', {
          operation: 'get_initiatives_stats',
        });
      }

      const username = stripAuthPrefix(rawUsername);
      const stats = await this.crowdfundingService.getInitiativesStats(req, username);

      logger.success(req, 'get_initiatives_stats', startTime);

      res.json(stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/crowdfunding/initiatives/:slug
   * Get a single initiative by slug for the authenticated user
   */
  public async getInitiativeBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_initiative_by_slug');

    try {
      const rawUsername = await getUsernameFromAuth(req);

      if (!rawUsername) {
        throw new AuthenticationError('User authentication required', {
          operation: 'get_initiative_by_slug',
        });
      }

      const username = stripAuthPrefix(rawUsername);
      const { slug } = req.params;
      const initiative = await this.crowdfundingService.getInitiativeBySlug(req, username, slug);

      if (!initiative) {
        res.status(404).json({ message: `Initiative '${slug}' not found` });
        return;
      }

      logger.success(req, 'get_initiative_by_slug', startTime, { slug });

      res.json(initiative);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/crowdfunding/initiatives/:slug/transactions
   * Get paginated transactions for an initiative
   */
  public async getInitiativeTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_initiative_transactions');

    try {
      const rawUsername = await getUsernameFromAuth(req);

      if (!rawUsername) {
        throw new AuthenticationError('User authentication required', {
          operation: 'get_initiative_transactions',
        });
      }

      const username = stripAuthPrefix(rawUsername);
      const { slug } = req.params;
      const { type, size, from } = req.query;

      const parseNonNegativeInt = (val: unknown): number | undefined => {
        if (val == null || val === '') return undefined;
        const n = Number(val);
        return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
      };

      const transactions = await this.crowdfundingService.getInitiativeTransactions(
        req,
        username,
        slug,
        type ? String(type) : undefined,
        parseNonNegativeInt(size),
        parseNonNegativeInt(from)
      );

      if (!transactions) {
        res.status(404).json({ message: `Initiative '${slug}' not found` });
        return;
      }

      logger.success(req, 'get_initiative_transactions', startTime, { slug, total: transactions.totalCount });

      res.json(transactions);
    } catch (error) {
      next(error);
    }
  }
}
