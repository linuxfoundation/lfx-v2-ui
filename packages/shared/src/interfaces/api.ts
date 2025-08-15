// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export interface ApiClientConfig {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface MicroserviceUrls {
  LFX_V2_SERVICE: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  service?: string;
  path?: string;
  originalMessage?: string;
}

export interface ApiErrorOptions {
  message: string;
  status?: number;
  code?: string;
  service?: string;
  path?: string;
  originalMessage?: string;
  originalError?: Error;
  response?: any;
}

export interface QueryServiceItem<T = unknown> {
  type: string;
  id: string;
  data: T;
}

export interface QueryServiceResponse<T = unknown> {
  resources: QueryServiceItem<T>[];
}

export interface ETagResult<T> {
  data: T;
  etag: string;
  headers: Record<string, string>;
}

export interface ETagError {
  code: 'NOT_FOUND' | 'ETAG_MISSING' | 'NETWORK_ERROR' | 'PRECONDITION_FAILED';
  message: string;
  statusCode: number;
  headers?: Record<string, string>;
}

/**
 * Standard API error response interface
 */
export interface ApiErrorResponse {
  error: string;
  code?: string;
  errors?: ValidationError[];
  details?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
