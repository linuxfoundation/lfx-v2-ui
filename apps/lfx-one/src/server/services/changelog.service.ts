// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CHANGELOG_CONFIG } from '@lfx-one/shared/constants';
import { ChangelogViewMarkViewedResponse, ChangelogViewUnseenResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { MicroserviceError } from '../errors';
import { getEffectiveSub } from '../utils/auth-helper';
import { logger } from './logger.service';

/**
 * Service for the LFX Changelog "views" tracking API.
 * Authenticates server-to-server with an API key (changelogs:read scope) and identifies
 * the viewer via the Auth0 `sub` so unread counts and read-receipts are scoped per user.
 */
export class ChangelogService {
  // Resolved lazily on first access so dotenv has finished loading,
  // then memoized — env is stable after startup.
  private _apiUrl: string | undefined;
  private _apiKey: string | undefined;
  private _productId: string | undefined;

  private get apiUrl(): string {
    return (this._apiUrl ??= (process.env['CHANGELOG_API_URL'] || CHANGELOG_CONFIG.DEFAULT_API_URL).replace(/\/+$/, ''));
  }

  private get apiKey(): string {
    return (this._apiKey ??= process.env['CHANGELOG_API_KEY'] || '');
  }

  private get productId(): string {
    return (this._productId ??= process.env['CHANGELOG_PRODUCT_ID'] || '');
  }

  /**
   * Get unseen changelog count for the authenticated user against the configured product.
   */
  public async getUnseenCount(req: Request): Promise<ChangelogViewUnseenResponse> {
    const viewerId = getEffectiveSub(req);
    if (!viewerId) {
      throw new MicroserviceError('User authentication required', 401, 'CHANGELOG_UNAUTHENTICATED', {
        operation: 'get_changelog_unseen',
        service: 'changelog_service',
      });
    }

    const url = new URL(CHANGELOG_CONFIG.ENDPOINTS.UNSEEN, this.apiUrl);
    url.searchParams.set('viewerId', viewerId);
    url.searchParams.set('productId', this.productId);

    logger.debug(req, 'get_changelog_unseen', 'Fetching unseen changelog count', { product_id: this.productId });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new MicroserviceError(`Changelog unseen request failed: ${response.statusText}`, response.status, 'CHANGELOG_UNSEEN_ERROR', {
        operation: 'get_changelog_unseen',
        service: 'changelog_service',
        errorBody: errorText,
      });
    }

    return this.parseJson<ChangelogViewUnseenResponse>(response, 'get_changelog_unseen', 'CHANGELOG_UNSEEN_ERROR');
  }

  /**
   * Mark the configured product's changelog as viewed for the authenticated user.
   */
  public async markViewed(req: Request): Promise<ChangelogViewMarkViewedResponse> {
    const viewerId = getEffectiveSub(req);
    if (!viewerId) {
      throw new MicroserviceError('User authentication required', 401, 'CHANGELOG_UNAUTHENTICATED', {
        operation: 'mark_changelog_viewed',
        service: 'changelog_service',
      });
    }

    const url = new URL(CHANGELOG_CONFIG.ENDPOINTS.MARK_VIEWED, this.apiUrl).toString();

    logger.debug(req, 'mark_changelog_viewed', 'Marking changelog as viewed', { product_id: this.productId });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ viewerId, productId: this.productId }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new MicroserviceError(`Changelog mark-viewed request failed: ${response.statusText}`, response.status, 'CHANGELOG_MARK_VIEWED_ERROR', {
        operation: 'mark_changelog_viewed',
        service: 'changelog_service',
        errorBody: errorText,
      });
    }

    return this.parseJson<ChangelogViewMarkViewedResponse>(response, 'mark_changelog_viewed', 'CHANGELOG_MARK_VIEWED_ERROR');
  }

  /**
   * Parse a fetch Response as JSON, but first verify the Content-Type is JSON.
   * If the upstream returns HTML (e.g. an SPA fallback or an auth challenge page)
   * we want a clear MicroserviceError instead of a cryptic JSON.parse failure.
   */
  private async parseJson<T>(response: Response, operation: string, code: string): Promise<T> {
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      const bodyPreview = (await response.text()).slice(0, 200);
      throw new MicroserviceError(`Changelog API returned non-JSON response (content-type: ${contentType || 'unknown'})`, 502, code, {
        operation,
        service: 'changelog_service',
        errorBody: bodyPreview,
      });
    }
    return (await response.json()) as T;
  }
}
