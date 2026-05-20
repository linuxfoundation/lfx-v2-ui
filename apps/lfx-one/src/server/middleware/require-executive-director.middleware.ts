// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { AuthorizationError } from '../errors';
import { logger } from '../services/logger.service';
import { personaDetectionService } from '../utils/persona-helper';

const ED_PERSONA = 'executive-director';

/**
 * Express middleware that allows only Executive Director users through.
 * Re-checks persona via NATS detection on every request rather than trusting the
 * client-readable persona cookie, since this guard protects newsletter-send routes
 * which are sensitive (outbound email to large audiences).
 */
export async function requireExecutiveDirector(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await personaDetectionService.getPersonas(req);
    if (!result.personas.includes(ED_PERSONA)) {
      logger.warning(req, 'require_executive_director', 'Non-ED user attempted to access newsletter endpoint', {
        path: req.path,
        personas: result.personas,
      });
      return next(
        new AuthorizationError('Executive Director access required', {
          operation: 'require_executive_director',
          path: req.path,
        })
      );
    }
    next();
  } catch (error) {
    next(error);
  }
}
