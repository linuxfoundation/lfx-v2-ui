// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { ApiError, isApiError } from '../helpers/api-error';
import { logger } from '../services/logger.service';

/**
 * Derives operation name from request path for logging context
 */
function getOperationFromPath(path: string): string {
  return (
    path
      .replace(/^\//, '')
      .replace(/\/[0-9a-f-]{36}/gi, '')
      .replace(/\/\d+/g, '')
      .replace(/\//g, '_')
      .replace(/_+$/, '') || 'api_request'
  );
}

/**
 * Centralized error handler middleware — the SINGLE place for error logging.
 *
 * Controllers and domain services do NOT log errors; they let errors propagate
 * naturally to Express error handling, which routes them here.
 */
export function apiErrorHandler(error: Error | ApiError, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  const operation = getOperationFromPath(req.path);
  const startTime = Date.now();

  if (isApiError(error)) {
    const logContext = {
      error_type: error.code,
      status_code: error.statusCode,
      request_id: req.id,
      path: req.path,
      method: req.method,
      user_agent: req.get('User-Agent'),
      details: error.details,
    };

    if (error.statusCode >= 500) {
      logger.error(req, operation, startTime, error, logContext);
    } else if (error.statusCode >= 400) {
      logger.warning(req, operation, `API error: ${error.message}`, { ...logContext, err: error });
    } else {
      logger.debug(req, operation, `API error: ${error.message}`, { ...logContext, err: error });
    }

    res.status(error.statusCode).json({
      ...error.toResponse(),
      path: req.path,
    });
    return;
  }

  // Unhandled errors
  logger.error(req, operation, startTime, error, {
    error_type: 'unhandled',
    path: req.path,
    method: req.method,
    user_agent: req.get('User-Agent'),
  });

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    path: req.path,
  });
}
