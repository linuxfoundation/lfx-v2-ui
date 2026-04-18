// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';
import { URL } from 'url';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { DocumentService } from '../services/document.service';

/**
 * Controller for handling My Documents HTTP requests
 */
export class DocumentController {
  private documentService: DocumentService = new DocumentService();

  /**
   * GET /documents/download?url=<encoded>&filename=<name> - proxy-download a file server-side
   */
  public async downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'download_document', {});

    try {
      const rawUrl = req.query['url'] as string | undefined;
      const filename = (req.query['filename'] as string | undefined) || 'download';

      if (!rawUrl) {
        throw ServiceValidationError.forField('url', 'url query parameter is required');
      }

      const parsed = new URL(rawUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw ServiceValidationError.forField('url', 'Only http and https URLs are supported');
      }

      const upstream = await fetch(rawUrl);
      if (!upstream.ok) {
        throw new Error(`Upstream responded with ${upstream.status}`);
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);

      const buffer = await upstream.arrayBuffer();
      logger.success(req, 'download_document', startTime, { filename, bytes: buffer.byteLength });
      res.send(Buffer.from(buffer));
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /documents - get all documents for the current user
   */
  public async getMyDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_my_documents', {
      query_params: logger.sanitize(req.query as Record<string, any>),
    });

    try {
      const documents = await this.documentService.getMyDocuments(req, req.query as Record<string, any>);

      logger.success(req, 'get_my_documents', startTime, {
        document_count: documents.length,
      });

      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
}
