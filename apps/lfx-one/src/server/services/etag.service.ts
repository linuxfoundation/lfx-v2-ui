// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HTTP_HEADERS } from '@lfx-one/shared/constants';
import { ETagError, ETagResult } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/**
 * Service for handling ETag-based operations with microservices
 */
export class ETagService {
  private microserviceProxy: MicroserviceProxyService = new MicroserviceProxyService();

  /**
   * Fetches a resource with ETag header for safe operations
   */
  public async fetchWithETag<T>(req: Request, service: 'LFX_V2_SERVICE', path: string, operation: string): Promise<ETagResult<T>> {
    logger.startOperation(req, operation, { step: 'fetch_with_etag', path }, { silent: true });

    const response = await this.microserviceProxy.proxyRequestWithResponse<T>(req, service, path, 'GET');

    if (!response.data) {
      const error: ETagError = {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        statusCode: 404,
      };
      throw error;
    }

    const etag = response.headers[HTTP_HEADERS.ETAG.toLowerCase()] || response.headers[HTTP_HEADERS.ETAG];

    if (!etag) {
      logger.warning(req, operation, 'ETag header not found in response', {
        path,
        available_headers: Object.keys(response.headers),
      });

      const error: ETagError = {
        code: 'ETAG_MISSING',
        message: 'Unable to obtain ETag header for safe operation',
        statusCode: 500,
        headers: response.headers,
      };
      throw error;
    }

    logger.debug(req, operation, 'Resource fetched successfully with ETag', {
      step: 'resource_fetched',
      path,
      has_etag: true,
    });

    return {
      data: response.data,
      etag,
      headers: response.headers,
    };
  }

  /**
   * Performs a safe update operation using If-Match header
   */
  public async updateWithETag<T>(req: Request, service: 'LFX_V2_SERVICE', path: string, etag: string, data: any, operation: string): Promise<T> {
    logger.startOperation(req, operation, { step: 'update_with_etag', path, etag_value: etag }, { silent: true });

    return await this.microserviceProxy.proxyRequest<T>(req, service, path, 'PUT', {}, data, { [HTTP_HEADERS.IF_MATCH]: etag });
  }

  /**
   * Performs a safe delete operation using If-Match header
   */
  public async deleteWithETag(req: Request, service: 'LFX_V2_SERVICE', path: string, etag: string, operation: string): Promise<void> {
    logger.startOperation(req, operation, { step: 'delete_with_etag', path, etag_value: etag }, { silent: true });

    await this.microserviceProxy.proxyRequest(req, service, path, 'DELETE', {}, undefined, { [HTTP_HEADERS.IF_MATCH]: etag });
  }
}
