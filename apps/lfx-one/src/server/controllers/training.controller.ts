// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { logger } from '../services/logger.service';
import { TrainingService } from '../services/training.service';
import { getUsernameFromAuth, stripAuthPrefix } from '../utils/auth-helper';

export class TrainingController {
  private readonly trainingService = new TrainingService();

  /**
   * GET /api/training/certifications
   * Get all certifications for the authenticated user
   */
  public async getCertifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_certifications');

    try {
      const rawUsername = await getUsernameFromAuth(req);

      if (!rawUsername) {
        throw new AuthenticationError('User authentication required', {
          operation: 'get_certifications',
        });
      }

      const username = stripAuthPrefix(rawUsername);
      // TODO: Remove hardcoded username override — testing with user who has 20+ certs
      const certifications = await this.trainingService.getCertifications(req, 'zuzcncf');

      logger.success(req, 'get_certifications', startTime, {
        result_count: certifications.length,
      });

      res.json(certifications);
    } catch (error) {
      logger.error(req, 'get_certifications', startTime, error);
      next(error);
    }
  }
}
