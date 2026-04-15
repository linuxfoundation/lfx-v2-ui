// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { logger } from '../services/logger.service';
import { ImpersonationService } from '../services/impersonation.service';

export class ImpersonationController {
  private impersonationService: ImpersonationService = new ImpersonationService();

  public async startImpersonation(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'start_impersonation', {
      target_user: req.body?.targetUser,
    });

    try {
      if (!this.impersonationService.isConfigured()) {
        res.status(501).json({ error: 'Impersonation is not configured' });
        return;
      }

      const targetUser = req.body?.targetUser;
      if (!targetUser || typeof targetUser !== 'string' || targetUser.trim() === '') {
        res.status(400).json({ error: 'targetUser is required and must be a non-empty string' });
        return;
      }

      const tokenPayload = this.impersonationService.decodeJwtPayload(req.bearerToken || '');
      if (!tokenPayload || tokenPayload['http://lfx.dev/claims/can_impersonate'] !== true) {
        res.status(403).json({ error: 'Insufficient permissions to impersonate users' });
        return;
      }

      const tokenResponse = await this.impersonationService.exchangeToken(req, targetUser.trim());
      const targetClaims = this.impersonationService.decodeJwtPayload(tokenResponse.access_token);

      if (!targetClaims) {
        throw new Error('Failed to decode target user claims from CTE response');
      }

      const profile = await this.impersonationService.fetchTargetUserProfile(req, targetClaims['sub']);
      this.impersonationService.startImpersonation(req, tokenResponse, targetClaims, profile);

      logger.success(req, 'start_impersonation', startTime, {
        target_sub: targetClaims['sub'],
      });

      res.json({
        impersonating: true,
        targetUser: {
          sub: targetClaims['sub'] || '',
          email: targetClaims['http://lfx.dev/claims/email'] || '',
          username: targetClaims['http://lfx.dev/claims/username'] || '',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async stopImpersonation(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'stop_impersonation');

    try {
      this.impersonationService.stopImpersonation(req);

      logger.success(req, 'stop_impersonation', startTime);

      res.json({ impersonating: false });
    } catch (error) {
      next(error);
    }
  }

  public async getImpersonationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_impersonation_status');

    try {
      const status = this.impersonationService.getImpersonationStatus(req);

      logger.success(req, 'get_impersonation_status', startTime, {
        impersonating: status.impersonating,
      });

      res.json(status);
    } catch (error) {
      next(error);
    }
  }
}
