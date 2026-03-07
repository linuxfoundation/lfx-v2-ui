// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Committee } from '@lfx-one/shared';
import { NextFunction, Request, Response } from 'express';

import { logger } from '../services/logger.service';
import { CommitteeService } from '../services/committee.service';
import { generateM2MToken } from '../utils/m2m-token.util';

/**
 * Controller for handling public committee HTTP requests (no authentication required)
 */
export class PublicCommitteeController {
  private committeeService: CommitteeService = new CommitteeService();

  /**
   * GET /public/api/committees
   * Returns all public committees using M2M token for upstream API access
   */
  public async getPublicCommittees(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_public_committees', {
      query_params: logger.sanitize(req.query as Record<string, any>),
    });

    try {
      // Generate M2M token for upstream API access (no user auth available)
      const m2mToken = await generateM2MToken(req);
      req.bearerToken = m2mToken;

      // Fetch all committees via the existing service
      const allCommittees = await this.committeeService.getCommittees(req, req.query);

      // Filter to only public committees
      const publicCommittees: Committee[] = allCommittees.filter((c) => c.public);

      logger.success(req, 'get_public_committees', startTime, {
        total_count: allCommittees.length,
        public_count: publicCommittees.length,
      });

      res.json(publicCommittees);
    } catch (error) {
      logger.error(req, 'get_public_committees', startTime, error, {});
      next(error);
    }
  }
}
