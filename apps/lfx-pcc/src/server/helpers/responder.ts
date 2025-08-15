// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Response } from 'express';
import { ApiErrorResponse, ValidationError, PaginationInfo } from '@lfx-pcc/shared/interfaces';

/**
 * Response helper for consistent API responses
 */
export class Responder {
  /**
   * Sends an error response with proper formatting
   */
  public static error(
    res: Response,
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      errors?: ValidationError[];
      details?: Record<string, any>;
    } = {}
  ): void {
    const { statusCode = 500, code, errors, details } = options;

    const response: ApiErrorResponse = {
      error: message,
      ...(code && { code }),
      ...(errors && { errors }),
      ...(details && { details }),
    };

    res.status(statusCode).json(response);
  }

  /**
   * Sends a bad request error (400)
   */
  public static badRequest(res: Response, message = 'Bad request', details?: Record<string, any>): void {
    this.error(res, message, { statusCode: 400, code: 'BAD_REQUEST', details });
  }

  /**
   * Sends an unauthorized error (401)
   */
  public static unauthorized(res: Response, message = 'Unauthorized'): void {
    this.error(res, message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }

  /**
   * Sends a forbidden error (403)
   */
  public static forbidden(res: Response, message = 'Forbidden'): void {
    this.error(res, message, { statusCode: 403, code: 'FORBIDDEN' });
  }

  /**
   * Sends a not found error (404)
   */
  public static notFound(res: Response, message = 'Resource not found'): void {
    this.error(res, message, { statusCode: 404, code: 'NOT_FOUND' });
  }

  /**
   * Sends a conflict error (409)
   */
  public static conflict(res: Response, message = 'Resource conflict'): void {
    this.error(res, message, { statusCode: 409, code: 'CONFLICT' });
  }

  /**
   * Sends a precondition failed error (412) - useful for ETag conflicts
   */
  public static preconditionFailed(res: Response, message = 'Resource has been modified. Please refresh and try again.'): void {
    this.error(res, message, { statusCode: 412, code: 'PRECONDITION_FAILED' });
  }

  /**
   * Sends a validation error (400) with field-specific errors
   */
  public static validationError(res: Response, errors: ValidationError[], message = 'Validation failed'): void {
    res.status(400).json({
      error: message,
      code: 'VALIDATION_ERROR',
      errors,
    });
  }

  /**
   * Sends an internal server error (500)
   */
  public static internalError(res: Response, message = 'Internal server error'): void {
    this.error(res, message, { statusCode: 500, code: 'INTERNAL_ERROR' });
  }

  /**
   * Creates pagination metadata from query parameters and total count
   */
  public static createPagination(page: number, limit: number, total: number): PaginationInfo {
    const pages = Math.ceil(total / limit);

    return {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    };
  }

  /**
   * Handles different types of errors and sends appropriate response
   */
  public static handle(res: Response, error: any, operation = 'operation'): void {
    // Handle validation errors
    if (error.validationErrors) {
      this.validationError(res, error.validationErrors);
      return;
    }

    // Handle ETag errors
    if (error.code === 'NOT_FOUND') {
      this.notFound(res, error.message);
      return;
    }

    if (error.code === 'PRECONDITION_FAILED') {
      this.preconditionFailed(res, error.message);
      return;
    }

    if (error.code === 'ETAG_MISSING') {
      this.internalError(res, 'ETag header missing from upstream service');
      return;
    }

    // Handle HTTP status code errors
    const statusCode = error.statusCode || 500;
    const message = error.message || `Failed to ${operation.replace('_', ' ')}`;

    this.error(res, message, {
      statusCode,
      code: statusCode >= 500 ? 'INTERNAL_ERROR' : undefined,
    });
  }
}
