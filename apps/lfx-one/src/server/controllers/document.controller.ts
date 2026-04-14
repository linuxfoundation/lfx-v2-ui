// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { logger } from '../services/logger.service';
import { getUsernameFromAuth } from '../utils/auth-helper';
import { DocumentService } from '../services/document.service';

/**
 * Controller for handling My Documents HTTP requests
 */
export class DocumentController {
  private documentService: DocumentService = new DocumentService();

  /**
   * GET /documents - get all documents for the current user
   */
  public async getMyDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    const username = getUsernameFromAuth(req);
    if (!username) {
      return next(new AuthenticationError('Authentication required'));
    }

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
      logger.error(req, 'get_my_documents', startTime, error, {});
      next(error);
    }
  }
}
