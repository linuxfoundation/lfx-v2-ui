// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, any>;

  public constructor(message: string, statusCode: number, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // --- Factory methods for common errors ---

  public static badRequest(message: string, details?: Record<string, any>): ApiError {
    return new ApiError(message, 400, 'BAD_REQUEST', details);
  }

  public static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError(message, 401, 'UNAUTHORIZED');
  }

  public static forbidden(message = 'Access denied'): ApiError {
    return new ApiError(message, 403, 'FORBIDDEN');
  }

  public static notFound(message = 'Resource not found'): ApiError {
    return new ApiError(message, 404, 'NOT_FOUND');
  }

  public static timeout(path: string, timeoutMs: number): ApiError {
    return new ApiError(`Request timeout after ${timeoutMs}ms`, 408, 'TIMEOUT', { path });
  }

  public static upstream(message: string, statusCode: number, path: string, errorBody?: any): ApiError {
    return new ApiError(message, statusCode, statusCode >= 500 ? 'UPSTREAM_ERROR' : 'UPSTREAM_CLIENT_ERROR', {
      path,
      ...(errorBody && { errorBody }),
    });
  }

  public static networkError(message: string, path: string): ApiError {
    return new ApiError(message, 502, 'NETWORK_ERROR', { path });
  }

  public toResponse(): Record<string, any> {
    return {
      error: this.message,
      code: this.code,
      ...(this.details && { details: this.details }),
    };
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
