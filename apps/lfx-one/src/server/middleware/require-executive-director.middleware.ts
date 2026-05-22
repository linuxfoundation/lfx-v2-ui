// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { PERSONA_COOKIE_KEY } from '@lfx-one/shared/constants';
import type { PersistedPersonaState, PersonaType } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { AuthorizationError } from '../errors';
import { logger } from '../services/logger.service';

const ED: PersonaType = 'executive-director';

function readPersonaCookie(req: Request): PersistedPersonaState | null {
  const raw = req.cookies?.[PERSONA_COOKIE_KEY];
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return JSON.parse(decoded) as PersistedPersonaState;
  } catch {
    return null;
  }
}

export function requireExecutiveDirector(req: Request, res: Response, next: NextFunction): void {
  const persona = readPersonaCookie(req);
  const isED = persona?.primary === ED || persona?.all?.includes(ED) === true;

  if (isED) {
    next();
    return;
  }

  logger.warning(req, 'require_executive_director', 'Non-ED user attempted ED-only endpoint', {
    path: req.path,
    primary: persona?.primary ?? null,
  });

  next(
    new AuthorizationError('Executive Director access required for this resource', {
      operation: 'require_executive_director',
      service: 'authorization',
      path: req.path,
      code: 'EXECUTIVE_DIRECTOR_REQUIRED',
    })
  );
}
