// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NewsletterRecipientCountPayload, NewsletterSendPayload, NewsletterTestSendPayload } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { NewsletterSendService } from '../services/newsletter-send.service';
import { getEffectiveEmail, getEffectiveName, getEffectiveUsername } from '../utils/auth-helper';

const VALID_CONTEXT_TYPES = new Set(['foundation', 'project']);
const SUBJECT_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 100_000;
const COMMITTEE_LIMIT = 50;

export class NewsletterController {
  private newsletterSendService: NewsletterSendService = new NewsletterSendService();

  /**
   * POST /api/newsletters/recipient-count
   * Body: { committeeUids: string[] }
   */
  public async getRecipientCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_recipient_count', {
      committee_count: Array.isArray(req.body?.committeeUids) ? req.body.committeeUids.length : 0,
    });

    try {
      const payload = req.body as NewsletterRecipientCountPayload;
      const fieldErrors: Record<string, string> = {};

      if (!Array.isArray(payload?.committeeUids)) {
        fieldErrors['committeeUids'] = 'committeeUids must be an array of strings';
      } else if (payload.committeeUids.length === 0) {
        fieldErrors['committeeUids'] = 'committeeUids must contain at least one UID';
      } else if (payload.committeeUids.length > COMMITTEE_LIMIT) {
        fieldErrors['committeeUids'] = `committeeUids must contain at most ${COMMITTEE_LIMIT} UIDs`;
      } else if (!payload.committeeUids.every((uid) => typeof uid === 'string' && uid.length > 0)) {
        fieldErrors['committeeUids'] = 'committeeUids must contain non-empty strings';
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw ServiceValidationError.fromFieldErrors(fieldErrors, 'Validation failed', {
          operation: 'newsletter_recipient_count',
          service: 'newsletter_controller',
          path: req.path,
        });
      }

      const count = await this.newsletterSendService.getRecipientCount(req, payload.committeeUids);

      logger.success(req, 'newsletter_recipient_count', startTime, { count });
      res.json({ count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/test-send
   * Body: { subject, bodyHtml, toEmail, contextType, contextUid, edReplyEmail }
   */
  public async testSend(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_test_send', {
      context_type: req.body?.contextType,
      context_uid: req.body?.contextUid,
    });

    try {
      const payload = req.body as NewsletterTestSendPayload;
      this.validateCommonPayload(payload, req.path, 'newsletter_test_send');

      if (!payload.toEmail || typeof payload.toEmail !== 'string' || !payload.toEmail.includes('@')) {
        throw ServiceValidationError.forField('toEmail', 'A valid recipient email is required', {
          operation: 'newsletter_test_send',
          service: 'newsletter_controller',
          path: req.path,
        });
      }

      const edName = resolveEdName(req);
      await this.newsletterSendService.sendTest(req, payload, edName);

      logger.success(req, 'newsletter_test_send', startTime, { to: payload.toEmail });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/send
   * Body: { subject, bodyHtml, committeeUids, contextType, contextUid, edReplyEmail }
   */
  public async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_send', {
      context_type: req.body?.contextType,
      context_uid: req.body?.contextUid,
      committee_count: Array.isArray(req.body?.committeeUids) ? req.body.committeeUids.length : 0,
    });

    try {
      const payload = req.body as NewsletterSendPayload;
      this.validateCommonPayload(payload, req.path, 'newsletter_send');

      const fieldErrors: Record<string, string> = {};
      if (!Array.isArray(payload.committeeUids) || payload.committeeUids.length === 0) {
        fieldErrors['committeeUids'] = 'committeeUids must contain at least one UID';
      } else if (payload.committeeUids.length > COMMITTEE_LIMIT) {
        fieldErrors['committeeUids'] = `committeeUids must contain at most ${COMMITTEE_LIMIT} UIDs`;
      } else if (!payload.committeeUids.every((uid) => typeof uid === 'string' && uid.length > 0)) {
        fieldErrors['committeeUids'] = 'committeeUids must contain non-empty strings';
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw ServiceValidationError.fromFieldErrors(fieldErrors, 'Validation failed', {
          operation: 'newsletter_send',
          service: 'newsletter_controller',
          path: req.path,
        });
      }

      const edName = resolveEdName(req);
      const result = await this.newsletterSendService.send(req, payload, edName);

      logger.success(req, 'newsletter_send', startTime, {
        total_recipients: result.totalRecipients,
        sent: result.sent,
        failed: result.failed,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  private validateCommonPayload(
    payload: { subject?: string; bodyHtml?: string; contextType?: string; contextUid?: string; edReplyEmail?: string },
    path: string,
    operation: string
  ): void {
    const fieldErrors: Record<string, string> = {};

    if (!payload?.subject || typeof payload.subject !== 'string' || payload.subject.trim().length === 0) {
      fieldErrors['subject'] = 'Subject is required';
    } else if (payload.subject.length > SUBJECT_MAX_LENGTH) {
      fieldErrors['subject'] = `Subject must be ${SUBJECT_MAX_LENGTH} characters or fewer`;
    }

    if (!payload?.bodyHtml || typeof payload.bodyHtml !== 'string' || payload.bodyHtml.trim().length === 0) {
      fieldErrors['bodyHtml'] = 'Body is required';
    } else if (payload.bodyHtml.length > BODY_MAX_LENGTH) {
      fieldErrors['bodyHtml'] = `Body must be ${BODY_MAX_LENGTH} characters or fewer`;
    }

    if (!payload?.contextType || !VALID_CONTEXT_TYPES.has(payload.contextType)) {
      fieldErrors['contextType'] = "contextType must be 'foundation' or 'project'";
    }

    if (!payload?.contextUid || typeof payload.contextUid !== 'string') {
      fieldErrors['contextUid'] = 'contextUid is required';
    }

    if (!payload?.edReplyEmail || typeof payload.edReplyEmail !== 'string' || !payload.edReplyEmail.includes('@')) {
      fieldErrors['edReplyEmail'] = 'A valid edReplyEmail is required';
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw ServiceValidationError.fromFieldErrors(fieldErrors, 'Validation failed', {
        operation,
        service: 'newsletter_controller',
        path,
      });
    }
  }
}

function resolveEdName(req: Request): string {
  return getEffectiveName(req) || getEffectiveUsername(req) || getEffectiveEmail(req) || 'Executive Director';
}
