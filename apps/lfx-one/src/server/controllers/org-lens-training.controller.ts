// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { SALESFORCE_ACCOUNT_ID_PATTERN } from '@lfx-one/shared/constants';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { OrgLensTrainingService } from '../services/org-lens-training.service';

/** HTTP boundary for OrgLensTrainingService — validation, lifecycle logging, error propagation. */
export class OrgLensTrainingController {
  private readonly service: OrgLensTrainingService;

  public constructor() {
    this.service = new OrgLensTrainingService();
  }

  /** GET /api/orgs/:accountId/lens/training/stats */
  public async getTrainingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const accountId = req.params['accountId'];
    const startTime = logger.startOperation(req, 'get_org_lens_training_stats', {
      account_id: accountId,
    });

    try {
      this.assertAccountId(accountId, 'get_org_lens_training_stats');

      const response = await this.service.getTrainingStats(accountId);

      logger.success(req, 'get_org_lens_training_stats', startTime, {
        account_id: accountId,
        certificates_earned: response.certificatesEarned,
        trainings_enrolled: response.trainingsEnrolled,
        employees_engaged: response.employeesEngaged,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  private assertAccountId(accountId: string | undefined, operation: string): asserts accountId is string {
    if (!accountId || typeof accountId !== 'string') {
      throw ServiceValidationError.forField('accountId', 'accountId path parameter is required', { operation });
    }
    if (!SALESFORCE_ACCOUNT_ID_PATTERN.test(accountId)) {
      throw ServiceValidationError.forField('accountId', 'Invalid Salesforce accountId format', { operation });
    }
  }
}
