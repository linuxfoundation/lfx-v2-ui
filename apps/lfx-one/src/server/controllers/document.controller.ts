// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';
import { Readable } from 'stream';
import { URL } from 'url';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { DocumentService } from '../services/document.service';

const UID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Patterns that match private/reserved IP ranges to prevent SSRF
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^0\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/, // link-local / AWS IMDS
  /^::1$/,
  /^fc[0-9a-f]{2}:/i, // IPv6 ULA
  /^fe80:/i, // IPv6 link-local
];

function isAllowedDownloadHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (PRIVATE_IP_PATTERNS.some((p) => p.test(host))) return false;
  // Require at least one dot to rule out single-label hostnames (e.g. 'metadata')
  if (!host.includes('.')) return false;
  return true;
}

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

      if (!isAllowedDownloadHost(parsed.hostname)) {
        throw ServiceValidationError.forField('url', 'URL hostname is not allowed');
      }

      // redirect: 'error' prevents redirect-based SSRF — any redirect causes fetch to throw
      const upstream = await fetch(rawUrl, { redirect: 'error' });
      if (!upstream.ok) {
        throw new Error(`Upstream responded with ${upstream.status}`);
      }

      const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
      const contentLength = upstream.headers.get('content-length');
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      if (contentLength) res.setHeader('Content-Length', contentLength);

      logger.success(req, 'download_document', startTime, { filename });

      // Stream directly to the client instead of buffering the entire file in memory
      Readable.fromWeb(upstream.body as any).pipe(res);
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
      const { project_uid, committee_uid } = req.query as Record<string, string | undefined>;

      if (project_uid && !UID_PATTERN.test(project_uid)) {
        throw ServiceValidationError.forField('project_uid', 'Invalid project_uid format');
      }
      if (committee_uid && !UID_PATTERN.test(committee_uid)) {
        throw ServiceValidationError.forField('committee_uid', 'Invalid committee_uid format');
      }

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
