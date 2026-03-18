// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DEFAULT_QUERY_PARAMS } from '@lfx-one/shared/constants';
import { Request } from 'express';

import { ApiError } from '../helpers/api-error';

/**
 * LfxService - Unified upstream microservice communication layer
 *
 * Replaces both MicroserviceProxyService and ApiClientService with a single,
 * flattened class that handles all Go microservice communication.
 *
 * Features:
 * - Native fetch with AbortSignal.timeout
 * - User bearer token forwarding by default
 * - Query parameter building with DEFAULT_QUERY_PARAMS merge
 * - JSON request/response serialization
 * - Structured error handling via ApiError
 */
class LfxService {
  private readonly timeout = 30000;
  private readonly userAgent = 'LFX-Server/1.0';

  // --- Public API ---

  public async get<T>(req: Request, path: string, query?: Record<string, any>): Promise<T> {
    return this.request<T>(req, 'GET', path, undefined, query);
  }

  public async post<T>(req: Request, path: string, data?: any, query?: Record<string, any>): Promise<T> {
    return this.request<T>(req, 'POST', path, data, query);
  }

  public async put<T>(req: Request, path: string, data?: any, query?: Record<string, any>): Promise<T> {
    return this.request<T>(req, 'PUT', path, data, query);
  }

  public async patch<T>(req: Request, path: string, data?: any, query?: Record<string, any>): Promise<T> {
    return this.request<T>(req, 'PATCH', path, data, query);
  }

  public async delete<T>(req: Request, path: string, query?: Record<string, any>): Promise<T> {
    return this.request<T>(req, 'DELETE', path, undefined, query);
  }

  // --- Private ---

  private async request<T>(
    req: Request,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    data?: any,
    query?: Record<string, any>
  ): Promise<T> {
    const baseUrl = process.env['LFX_V2_SERVICE'] || 'http://lfx-api.k8s.orb.local';
    const mergedQuery = { ...query, ...DEFAULT_QUERY_PARAMS };
    const url = this.buildUrl(`${baseUrl}${path}`, mergedQuery);
    const token = req.bearerToken;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': this.userAgent,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.timeout),
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(method)) {
      init.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, init);

      if (!response.ok) {
        let errorBody: any = null;
        try {
          const text = await response.text();
          if (text) errorBody = JSON.parse(text);
        } catch {
          // ignore parse failures
        }

        const message = errorBody?.message || errorBody?.error || response.statusText;
        throw ApiError.upstream(message, response.status, path, errorBody);
      }

      const text = await response.text();
      return (text ? JSON.parse(text) : null) as T;
    } catch (error: unknown) {
      // Re-throw ApiErrors as-is
      if (error instanceof ApiError) throw error;

      if (error instanceof Error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
          throw ApiError.timeout(path, this.timeout);
        }

        throw ApiError.networkError(`Request failed: ${error.message}`, path);
      }

      throw error;
    }
  }

  private buildUrl(base: string, query?: Record<string, any>): string {
    if (!query) return base;

    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          params.append(key, String(item));
        }
      } else if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    }

    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }
}

export const lfxService = new LfxService();
