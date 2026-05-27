// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NEWSLETTER_RAW_CONTENT_MAX_LENGTH, NEWSLETTER_SYSTEM_PROMPT_MAX_LENGTH } from '@lfx-one/shared/constants';
import {
  CreateNewsletterDraftRequest,
  EmailRecipientRecord,
  GenerateNewsletterRequest,
  Newsletter,
  NewsletterAnalytics,
  NewsletterContextType,
  NewsletterDailyOpens,
  NewsletterListParams,
  NewsletterRecipient,
  NewsletterRecipientCountPayload,
  NewsletterSendFailure,
  NewsletterSendPayload,
  NewsletterSendResult,
  NewsletterStatus,
  NewsletterTestSendPayload,
  UpdateNewsletterDraftRequest,
} from '@lfx-one/shared/interfaces';
import { stripHtml } from '@lfx-one/shared/utils';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { AiService } from '../services/ai.service';
import { EmailServiceClient } from '../services/email-service.client';
import { logger } from '../services/logger.service';
import { NewsletterServiceClient } from '../services/newsletter-service.client';

const EMAIL_SEND_CONCURRENCY = 5;

const VALID_CONTEXT_TYPES = new Set(['foundation', 'project']);
const SUBJECT_MAX_LENGTH = 200;
const BODY_MAX_LENGTH = 100_000;
const COMMITTEE_LIMIT = 50;
const CONTEXT_NAME_MAX_LENGTH = 200;

export class NewsletterController {
  private newsletterClient: NewsletterServiceClient = new NewsletterServiceClient();
  private emailServiceClient: EmailServiceClient = new EmailServiceClient();
  private aiService: AiService = new AiService();

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
      this.validateCommitteeUids(payload?.committeeUids, req.path, 'newsletter_recipient_count');

      const result = await this.newsletterClient.getRecipientCount(req, payload);

      logger.success(req, 'newsletter_recipient_count', startTime, { count: result.count });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/recipients
   * Body: { committeeUids: string[] }
   * Returns the deduplicated recipient list (email + firstName) across the committees.
   */
  public async getRecipients(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_recipients', {
      committee_count: Array.isArray(req.body?.committeeUids) ? req.body.committeeUids.length : 0,
    });

    try {
      const payload = req.body as NewsletterRecipientCountPayload;
      this.validateCommitteeUids(payload?.committeeUids, req.path, 'newsletter_recipients');

      const result = await this.newsletterClient.getRecipients(req, payload);

      logger.success(req, 'newsletter_recipients', startTime, { count: result.recipients.length });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/test-send
   * Body: { subject, bodyHtml, toEmail, contextType, contextUid, edReplyEmail }
   *
   * Sends a single preview email via lfx-v2-email-service. No group_id is
   * supplied — test sends auto-generate one server-side and stay out of the
   * newsletter analytics rollup.
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

      await this.emailServiceClient.sendEmail(req, {
        to: payload.toEmail,
        subject: payload.subject,
        html: payload.bodyHtml,
        text: stripHtml(payload.bodyHtml),
      });

      logger.success(req, 'newsletter_test_send', startTime, { to: payload.toEmail });
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/send
   * Body: { subject, bodyHtml, committeeUids, contextType, contextUid, edReplyEmail }
   *
   * Ad-hoc send (no prior saved draft). Creates a draft record on the Go
   * newsletter-service, fans out one email per recipient via email-service,
   * then flips the draft to `sent` with the shared group_id.
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
      this.validateCommitteeUids(payload.committeeUids, req.path, 'newsletter_send');

      const draft = await this.newsletterClient.createDraft(req, payload as CreateNewsletterDraftRequest);

      const result = await this.dispatchNewsletter(req, draft, 'newsletter_send');

      logger.success(req, 'newsletter_send', startTime, {
        newsletter_id: draft.id,
        group_id: result.groupId,
        total_recipients: result.totalRecipients,
        sent: result.sent,
        failed: result.failed,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/newsletters/drafts?contextType=...&contextUid=...
   */
  public async listDrafts(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_list_drafts', {
      context_type: req.query['contextType'],
      context_uid: req.query['contextUid'],
    });

    try {
      const contextType = String(req.query['contextType'] || '');
      const contextUid = String(req.query['contextUid'] || '');
      if (!VALID_CONTEXT_TYPES.has(contextType)) {
        throw ServiceValidationError.forField('contextType', "contextType must be 'foundation' or 'project'", {
          operation: 'newsletter_list_drafts',
          service: 'newsletter_controller',
          path: req.path,
        });
      }
      if (!contextUid) {
        throw ServiceValidationError.forField('contextUid', 'contextUid is required', {
          operation: 'newsletter_list_drafts',
          service: 'newsletter_controller',
          path: req.path,
        });
      }
      const result = await this.newsletterClient.listDrafts(req, contextType as NewsletterContextType, contextUid);
      logger.success(req, 'newsletter_list_drafts', startTime, { count: result.drafts.length });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/drafts
   * Body: CreateNewsletterDraftRequest
   */
  public async createDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_create_draft', {
      context_type: req.body?.contextType,
      context_uid: req.body?.contextUid,
    });

    try {
      const payload = req.body as CreateNewsletterDraftRequest;
      this.validateCommonPayload(payload, req.path, 'newsletter_create_draft');
      this.validateCommitteeUids(payload.committeeUids, req.path, 'newsletter_create_draft');

      const draft = await this.newsletterClient.createDraft(req, payload);
      logger.success(req, 'newsletter_create_draft', startTime, { draft_id: draft.id, version: draft.version });
      res.status(201).json(draft);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/newsletters/drafts/:id
   */
  public async getDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_get_draft', { draft_id: req.params['id'] });

    try {
      const id = String(req.params['id'] || '');
      if (!id) {
        throw ServiceValidationError.forField('id', 'id is required', {
          operation: 'newsletter_get_draft',
          service: 'newsletter_controller',
          path: req.path,
        });
      }
      const draft = await this.newsletterClient.getDraft(req, id);
      logger.success(req, 'newsletter_get_draft', startTime, { draft_id: draft.id, version: draft.version });
      res.json(draft);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/newsletters/drafts/:id
   * Body: UpdateNewsletterDraftRequest
   * Requires If-Match header for optimistic locking.
   */
  public async updateDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_update_draft', { draft_id: req.params['id'] });

    try {
      const id = String(req.params['id'] || '');
      const version = parseIfMatch(req);
      const payload = req.body as UpdateNewsletterDraftRequest;
      this.validateCommonPayloadShallow(payload, req.path, 'newsletter_update_draft');
      this.validateCommitteeUids(payload.committeeUids, req.path, 'newsletter_update_draft');

      const draft = await this.newsletterClient.updateDraft(req, id, version, payload);
      logger.success(req, 'newsletter_update_draft', startTime, { draft_id: draft.id, version: draft.version });
      res.json(draft);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/newsletters/drafts/:id
   */
  public async deleteDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_delete_draft', { draft_id: req.params['id'] });

    try {
      const id = String(req.params['id'] || '');
      await this.newsletterClient.deleteDraft(req, id);
      logger.success(req, 'newsletter_delete_draft', startTime, { draft_id: id });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/drafts/:id/send
   * Requires If-Match header for optimistic locking.
   *
   * Fetches the saved draft, fans out one email per recipient via the
   * email-service, then PATCHes the Go newsletter-service record with the
   * shared group_id and status=sent.
   */
  public async sendDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_send_draft', { draft_id: req.params['id'] });

    try {
      const id = String(req.params['id'] || '');
      const version = parseIfMatch(req);

      const draft = await this.newsletterClient.getDraft(req, id);
      const result = await this.dispatchNewsletter(req, draft, 'newsletter_send_draft', version);

      logger.success(req, 'newsletter_send_draft', startTime, {
        draft_id: id,
        group_id: result.groupId,
        total_recipients: result.totalRecipients,
        sent: result.sent,
        failed: result.failed,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/newsletters?contextType=...&contextUid=...&status=...&pageToken=...
   * Returns drafts and/or sent newsletters for the given context.
   */
  public async listNewsletters(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_list', {
      context_type: req.query['contextType'],
      context_uid: req.query['contextUid'],
      status: req.query['status'],
    });

    try {
      const contextType = String(req.query['contextType'] || '');
      const contextUid = String(req.query['contextUid'] || '');
      const statusParam = req.query['status'] ? String(req.query['status']) : undefined;
      const pageToken = req.query['pageToken'] ? String(req.query['pageToken']) : undefined;

      const fieldErrors: Record<string, string> = {};
      if (!VALID_CONTEXT_TYPES.has(contextType)) {
        fieldErrors['contextType'] = "contextType must be 'foundation' or 'project'";
      }
      if (!contextUid) {
        fieldErrors['contextUid'] = 'contextUid is required';
      }
      if (statusParam && statusParam !== 'draft' && statusParam !== 'sent') {
        fieldErrors['status'] = "status must be 'draft' or 'sent'";
      }
      if (Object.keys(fieldErrors).length > 0) {
        throw ServiceValidationError.fromFieldErrors(fieldErrors, 'Validation failed', {
          operation: 'newsletter_list',
          service: 'newsletter_controller',
          path: req.path,
        });
      }

      const params: NewsletterListParams = {
        contextType: contextType as NewsletterContextType,
        contextUid,
        status: statusParam as NewsletterStatus | undefined,
        pageToken,
      };
      const result = await this.newsletterClient.listNewsletters(req, params);

      logger.success(req, 'newsletter_list', startTime, {
        count: result.newsletters.length,
        has_more: !!result.nextPageToken,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/newsletters/:id/analytics
   * Returns engagement analytics for a sent newsletter.
   *
   * Source of truth is lfx-v2-email-service: we look up the newsletter to
   * read its `groupId`, then aggregate per-recipient EmailRecipientRecords
   * into the existing NewsletterAnalytics shape so the frontend doesn't have
   * to change.
   */
  public async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_analytics', { newsletter_id: req.params['id'] });

    try {
      const id = String(req.params['id'] || '');
      if (!id) {
        throw ServiceValidationError.forField('id', 'id is required', {
          operation: 'newsletter_analytics',
          service: 'newsletter_controller',
          path: req.path,
        });
      }

      const newsletter = await this.newsletterClient.getDraft(req, id);

      let analytics: NewsletterAnalytics;
      if (!newsletter.groupId) {
        // Fallback for newsletters sent before this integration shipped, and
        // for drafts (which legitimately have no engagement data). Returns an
        // empty NewsletterAnalytics payload so the analytics page renders.
        logger.debug(req, 'newsletter_analytics', 'Newsletter has no groupId — returning empty analytics', {
          newsletter_id: id,
          status: newsletter.status,
        });
        analytics = this.buildEmptyAnalytics(newsletter);
      } else {
        const records = await this.emailServiceClient.getStatusByGroup(req, newsletter.groupId);
        analytics = this.buildAnalyticsFromRecords(newsletter, records);
      }

      logger.success(req, 'newsletter_analytics', startTime, {
        newsletter_id: id,
        group_id: newsletter.groupId,
        unique_opens: analytics.uniqueOpens,
        total_opens: analytics.totalOpens,
      });
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/newsletters/generate
   * Body: { rawContent, contextType, contextName, systemPromptOverride? }
   */
  public async generate(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'newsletter_generate', {
      context_type: req.body?.contextType,
      has_prompt_override: !!req.body?.systemPromptOverride,
    });

    try {
      const payload = req.body as GenerateNewsletterRequest;
      const fieldErrors: Record<string, string> = {};

      if (!payload?.rawContent || typeof payload.rawContent !== 'string' || payload.rawContent.trim().length === 0) {
        fieldErrors['rawContent'] = 'rawContent is required';
      } else if (payload.rawContent.length > NEWSLETTER_RAW_CONTENT_MAX_LENGTH) {
        fieldErrors['rawContent'] = `rawContent must be ${NEWSLETTER_RAW_CONTENT_MAX_LENGTH} characters or fewer`;
      }

      if (!payload?.contextType || !VALID_CONTEXT_TYPES.has(payload.contextType)) {
        fieldErrors['contextType'] = "contextType must be 'foundation' or 'project'";
      }

      if (!payload?.contextName || typeof payload.contextName !== 'string' || payload.contextName.trim().length === 0) {
        fieldErrors['contextName'] = 'contextName is required';
      } else if (payload.contextName.length > CONTEXT_NAME_MAX_LENGTH) {
        fieldErrors['contextName'] = `contextName must be ${CONTEXT_NAME_MAX_LENGTH} characters or fewer`;
      }

      if (payload?.systemPromptOverride !== undefined) {
        if (typeof payload.systemPromptOverride !== 'string') {
          fieldErrors['systemPromptOverride'] = 'systemPromptOverride must be a string';
        } else if (payload.systemPromptOverride.length > NEWSLETTER_SYSTEM_PROMPT_MAX_LENGTH) {
          fieldErrors['systemPromptOverride'] = `systemPromptOverride must be ${NEWSLETTER_SYSTEM_PROMPT_MAX_LENGTH} characters or fewer`;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        throw ServiceValidationError.fromFieldErrors(fieldErrors, 'Validation failed', {
          operation: 'newsletter_generate',
          service: 'newsletter_controller',
          path: req.path,
        });
      }

      const result = await this.aiService.generateNewsletter(req, {
        rawContent: payload.rawContent,
        contextType: payload.contextType,
        contextName: payload.contextName,
        systemPromptOverride: payload.systemPromptOverride,
      });

      logger.success(req, 'newsletter_generate', startTime, {
        subject_length: result.subject.length,
        body_html_length: result.bodyHtml.length,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Per-recipient email-service fan-out + sent-state persistence.
   *
   * Resolves recipients from the newsletter's committeeUids, mints a UUID
   * group_id, dispatches one send_email per recipient with bounded
   * concurrency, then PATCHes the newsletter to status=sent unless every
   * recipient failed (matches the previous behavior of not flipping status
   * on total failure).
   *
   * Validations BEFORE any email goes out (cheaper to fail here than to
   * dispatch and then discover the Go service will reject the markSent):
   *   - Already-sent newsletters are rejected to prevent duplicate-send
   *     races (e.g., double-clicking "Send now" while the first request
   *     is in flight).
   *   - Empty recipient lists are rejected — the UI shouldn't allow this,
   *     but a committee with zero resolvable members would otherwise mint
   *     a group_id, send no emails, and silently no-op.
   */
  private async dispatchNewsletter(req: Request, newsletter: Newsletter, operation: string, ifMatchVersion?: number): Promise<NewsletterSendResult> {
    if (newsletter.status === 'sent') {
      throw ServiceValidationError.forField('status', 'Newsletter has already been sent', {
        operation,
        service: 'newsletter_controller',
        path: req.path,
      });
    }

    const recipientsResponse = await this.newsletterClient.getRecipients(req, { committeeUids: newsletter.committeeUids });
    const recipients = recipientsResponse.recipients;

    if (recipients.length === 0) {
      throw ServiceValidationError.forField('committeeUids', 'Selected committees resolved to zero recipients; nothing to send', {
        operation,
        service: 'newsletter_controller',
        path: req.path,
      });
    }

    const groupId = randomUUID();

    logger.debug(req, operation, 'Dispatching newsletter via email-service', {
      newsletter_id: newsletter.id,
      group_id: groupId,
      recipient_count: recipients.length,
    });

    const { sent, failures } = await this.fanOutEmails(req, newsletter, recipients, groupId);

    if (sent > 0) {
      const versionToUse = ifMatchVersion ?? newsletter.version;
      try {
        await this.newsletterClient.markSent(req, newsletter.id, { groupId, ifMatchVersion: versionToUse });
      } catch (error) {
        // Emails went out but the status flip failed. Log loudly so the
        // group_id stays recoverable from logs and the operator can retry.
        logger.error(req, operation, Date.now(), error, {
          newsletter_id: newsletter.id,
          group_id: groupId,
          sent,
          failed: failures.length,
          message: 'Emails delivered but newsletter mark-sent PATCH failed; group_id captured in logs for manual recovery',
        });
        throw error;
      }
    }

    return {
      totalRecipients: recipients.length,
      sent,
      failed: failures.length,
      failures,
      groupId,
    };
  }

  /**
   * Sends one email per recipient with a bounded number of in-flight
   * requests. NATS round-trips are fast (~25ms in dev) but a fully parallel
   * Promise.all would still saturate the connection for large committees.
   */
  private async fanOutEmails(
    req: Request,
    newsletter: Pick<Newsletter, 'subject' | 'bodyHtml'>,
    recipients: NewsletterRecipient[],
    groupId: string
  ): Promise<{ sent: number; failures: NewsletterSendFailure[] }> {
    const text = stripHtml(newsletter.bodyHtml);
    const failures: NewsletterSendFailure[] = [];
    let sent = 0;
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < recipients.length) {
        const index = cursor++;
        const recipient = recipients[index];

        try {
          await this.emailServiceClient.sendEmail(req, {
            to: recipient.email,
            subject: newsletter.subject,
            html: newsletter.bodyHtml,
            text,
            group_id: groupId,
          });
          sent++;
        } catch (error) {
          failures.push({
            email: recipient.email,
            reason: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };

    const workerCount = Math.min(EMAIL_SEND_CONCURRENCY, recipients.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return { sent, failures };
  }

  /**
   * Empty-shape analytics for newsletters that don't have a groupId yet —
   * drafts, or sent newsletters that predate this integration.
   */
  private buildEmptyAnalytics(newsletter: Newsletter): NewsletterAnalytics {
    return {
      newsletterId: newsletter.id,
      subject: newsletter.subject,
      status: newsletter.status,
      sentAt: newsletter.sentAt,
      totalRecipients: 0,
      delivered: 0,
      failed: 0,
      totalOpens: 0,
      uniqueOpens: 0,
      openRate: 0,
      dailyOpens: [],
    };
  }

  /**
   * Aggregate per-recipient EmailRecipientRecords into the existing
   * NewsletterAnalytics shape so the frontend (which expects daily-opens
   * chart data) keeps working unchanged.
   *
   * Note: the email-service tracks "opened" as a boolean per recipient (no
   * multi-open count), so totalOpens == uniqueOpens for our purposes.
   */
  private buildAnalyticsFromRecords(newsletter: Newsletter, records: EmailRecipientRecord[]): NewsletterAnalytics {
    const totalRecipients = records.length;
    const delivered = records.filter((r) => r.delivered).length;
    const failed = records.filter((r) => r.failed).length;
    const opensCount = records.filter((r) => r.opened).length;
    const openRate = delivered > 0 ? opensCount / delivered : 0;

    const dailyOpens = this.aggregateDailyOpens(records);

    const eventTimestamps: number[] = [];
    for (const record of records) {
      if (record.opened_at) {
        eventTimestamps.push(new Date(record.opened_at).getTime());
      }
      if (record.delivered_at) {
        eventTimestamps.push(new Date(record.delivered_at).getTime());
      }
    }
    const lastEventAt = eventTimestamps.length > 0 ? new Date(Math.max(...eventTimestamps)).toISOString() : undefined;

    return {
      newsletterId: newsletter.id,
      subject: newsletter.subject,
      status: newsletter.status,
      sentAt: newsletter.sentAt,
      totalRecipients,
      delivered,
      failed,
      totalOpens: opensCount,
      uniqueOpens: opensCount,
      openRate,
      dailyOpens,
      lastEventAt,
    };
  }

  private aggregateDailyOpens(records: EmailRecipientRecord[]): NewsletterDailyOpens[] {
    const buckets = new Map<string, number>();
    for (const record of records) {
      if (!record.opened || !record.opened_at) {
        continue;
      }
      const day = record.opened_at.slice(0, 10);
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }

    return Array.from(buckets.entries())
      .map(([date, opens]) => ({ date, opens, uniqueOpens: opens }))
      .sort((a, b) => a.date.localeCompare(b.date));
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

  /**
   * Validate update-draft payloads which omit contextType / contextUid (those
   * are immutable once a draft is created).
   */
  private validateCommonPayloadShallow(payload: { subject?: string; bodyHtml?: string; edReplyEmail?: string }, path: string, operation: string): void {
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

  /**
   * Shared committeeUids validation used by /recipient-count, /recipients,
   * /send, /drafts (create), and /drafts/:id (update).
   */
  private validateCommitteeUids(uids: unknown, path: string, operation: string): void {
    const fieldErrors: Record<string, string> = {};

    if (!Array.isArray(uids)) {
      fieldErrors['committeeUids'] = 'committeeUids must be an array of strings';
    } else if (uids.length === 0) {
      fieldErrors['committeeUids'] = 'committeeUids must contain at least one UID';
    } else if (uids.length > COMMITTEE_LIMIT) {
      fieldErrors['committeeUids'] = `committeeUids must contain at most ${COMMITTEE_LIMIT} UIDs`;
    } else if (!uids.every((uid) => typeof uid === 'string' && uid.length > 0)) {
      fieldErrors['committeeUids'] = 'committeeUids must contain non-empty strings';
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

/**
 * Parse the If-Match header into a version integer. Used by update/send draft
 * routes for optimistic concurrency control.
 */
function parseIfMatch(req: Request): number {
  const raw = (req.header('If-Match') || '').trim();
  if (!raw) {
    throw ServiceValidationError.forField('If-Match', 'If-Match header is required', {
      operation: 'newsletter_if_match',
      service: 'newsletter_controller',
      path: req.path,
    });
  }
  const cleaned = raw.replace(/^W\//i, '').replace(/^"|"$/g, '');
  const version = Number(cleaned);
  if (!Number.isFinite(version) || !Number.isInteger(version) || version < 1) {
    throw ServiceValidationError.forField('If-Match', 'If-Match must be a positive integer version', {
      operation: 'newsletter_if_match',
      service: 'newsletter_controller',
      path: req.path,
    });
  }
  return version;
}
