// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  EmailRecipientRecord,
  Newsletter,
  NewsletterAnalytics,
  NewsletterDailyOpens,
  NewsletterRecipient,
  NewsletterSendFailure,
  NewsletterSendResult,
} from '@lfx-one/shared/interfaces';
import { stripHtml } from '@lfx-one/shared/utils';
import { randomUUID } from 'crypto';
import { Request } from 'express';

import { MicroserviceError, ServiceValidationError } from '../errors';
import { EmailServiceClient } from './email-service.client';
import { logger } from './logger.service';
import { NewsletterServiceClient } from './newsletter-service.client';

const EMAIL_SEND_CONCURRENCY = 5;
const MARK_SENT_MAX_ATTEMPTS = 3;
const MARK_SENT_BACKOFF_BASE_MS = 100;

/**
 * Business-logic layer for the newsletter send + analytics flow. Orchestrates
 * lfx-v2-email-service (NATS) for delivery and aggregates per-recipient
 * engagement records back into the NewsletterAnalytics shape consumed by the
 * frontend. The controller is intentionally thin and delegates here.
 */
export class NewsletterService {
  private readonly newsletterClient: NewsletterServiceClient;
  private readonly emailServiceClient: EmailServiceClient;

  public constructor(newsletterClient?: NewsletterServiceClient, emailServiceClient?: EmailServiceClient) {
    this.newsletterClient = newsletterClient ?? new NewsletterServiceClient();
    this.emailServiceClient = emailServiceClient ?? new EmailServiceClient();
  }

  /**
   * Per-recipient email-service fan-out + sent-state persistence.
   *
   * Pre-dispatch guards (cheap, before any email is sent):
   *   - Already-sent newsletters are rejected to prevent the duplicate-send
   *     race on double-click. The Go service's status='draft' check would
   *     catch a stale request too, but only after emails were already out.
   *   - Empty resolved recipient lists are rejected with a clear error —
   *     a committee with zero resolvable members would otherwise mint a
   *     group_id and silently no-op.
   *
   * Mark-sent uses a small retry loop to ride out transient NATS / HTTP
   * blips on the lfx-v2-newsletter-service hop. If every retry exhausts,
   * we surface the error to the caller; emails are already out and the
   * group_id stays available in the structured logs for manual recovery.
   *
   * NOTE: full operator-retry idempotency (i.e., recovering from
   * "emails dispatched but mark-sent persistently failed" without
   * sending duplicates) requires persisting the group_id on the draft
   * BEFORE the fan-out — that needs an additive endpoint on
   * lfx-v2-newsletter-service. Tracked as a follow-up.
   */
  public async dispatchNewsletter(req: Request, newsletter: Newsletter, operation: string, ifMatchVersion?: number): Promise<NewsletterSendResult> {
    if (newsletter.status === 'sent') {
      throw ServiceValidationError.forField('status', 'Newsletter has already been sent', {
        operation,
        service: 'newsletter_service',
        path: req.path,
      });
    }

    const recipientsResponse = await this.newsletterClient.getRecipients(req, { committeeUids: newsletter.committeeUids });
    const recipients = recipientsResponse.recipients;

    if (recipients.length === 0) {
      throw ServiceValidationError.forField('committeeUids', 'Selected committees resolved to zero recipients; nothing to send', {
        operation,
        service: 'newsletter_service',
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
      await this.markSentWithRetry(req, newsletter.id, groupId, versionToUse, operation, sent, failures.length);
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
   * Return engagement analytics for a sent newsletter. Falls back to an empty
   * NewsletterAnalytics payload (rather than erroring) when:
   *   - the newsletter has no persisted group_id (drafts, or sent rows
   *     predating this integration), OR
   *   - the email-service returns an error envelope (e.g. "not found" if the
   *     KV record hasn't propagated yet, or the SES event poller hasn't
   *     recorded any deliveries). The empty payload lets the analytics page
   *     render without a 502.
   */
  public async getAnalytics(req: Request, newsletter: Newsletter): Promise<NewsletterAnalytics> {
    if (!newsletter.groupId) {
      logger.debug(req, 'newsletter_analytics', 'Newsletter has no groupId — returning empty analytics', {
        newsletter_id: newsletter.id,
        status: newsletter.status,
      });
      return this.buildEmptyAnalytics(newsletter);
    }

    let records: EmailRecipientRecord[];
    try {
      records = await this.emailServiceClient.getStatusByGroup(req, newsletter.groupId);
    } catch (error) {
      if (error instanceof MicroserviceError && error.code === 'EMAIL_SERVICE_ERROR') {
        logger.warning(req, 'newsletter_analytics', 'email-service returned no records for groupId; falling back to empty analytics', {
          newsletter_id: newsletter.id,
          group_id: newsletter.groupId,
          err: error,
        });
        return this.buildEmptyAnalytics(newsletter);
      }
      throw error;
    }

    return this.buildAnalyticsFromRecords(newsletter, records);
  }

  /**
   * Sends one email per recipient with a bounded number of in-flight
   * requests. Per-recipient failures are captured (not thrown) so a single
   * bad address can't fail the whole batch — the caller still gets a
   * partial-success NewsletterSendResult.
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
   * Retry markSent on transient failures (network blips, upstream 5xx). Logs
   * each failure as a warning with `err` (preserves stack via Pino's err
   * serializer); the central apiErrorHandler logs the final error if all
   * attempts fail. Validation-type errors (4xx MicroserviceError) surface
   * immediately without retry.
   */
  private async markSentWithRetry(
    req: Request,
    newsletterId: string,
    groupId: string,
    ifMatchVersion: number,
    operation: string,
    sent: number,
    failed: number
  ): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= MARK_SENT_MAX_ATTEMPTS; attempt++) {
      try {
        await this.newsletterClient.markSent(req, newsletterId, { groupId, ifMatchVersion });
        return;
      } catch (error) {
        lastError = error;
        const errorRetryable = this.isRetryable(error);
        const willRetry = errorRetryable && attempt < MARK_SENT_MAX_ATTEMPTS;
        // Final-attempt message keeps the recovery hint operators search
        // for ("group_id captured ... for manual recovery"); intermediate
        // attempts log briefly.
        const message = willRetry
          ? 'mark-sent failed; will retry'
          : 'mark-sent failed after all retries; emails delivered, group_id captured in logs for manual recovery';
        logger.warning(req, operation, message, {
          newsletter_id: newsletterId,
          group_id: groupId,
          attempt,
          error_retryable: errorRetryable,
          will_retry: willRetry,
          err: error,
          sent,
          failed,
        });
        if (!willRetry) {
          break;
        }
        await this.sleep(MARK_SENT_BACKOFF_BASE_MS * 2 ** (attempt - 1));
      }
    }
    throw lastError;
  }

  /**
   * Anything that's not a clear 4xx is retryable. That covers:
   *   - 5xx MicroserviceError (upstream availability)
   *   - Raw transport errors (DNS hiccups, ECONNRESET, ETIMEDOUT,
   *     "fetch failed"). MicroserviceProxyService re-throws those
   *     unwrapped — they aren't MicroserviceError at all — so treating
   *     non-MicroserviceError as retryable catches them.
   * We deliberately do NOT retry 4xx: those mean the request itself is
   * wrong (version mismatch, validation) and a retry won't help.
   */
  private isRetryable(error: unknown): boolean {
    if (error instanceof MicroserviceError) {
      return error.statusCode >= 500 && error.statusCode < 600;
    }
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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
   * Aggregate per-recipient EmailRecipientRecords into NewsletterAnalytics.
   *
   * Open semantics (post lfx-v2-email-service "track all opens" change):
   *   - `totalOpens` is the sum of `open_count` across all records — i.e.
   *     every open event, including repeat opens by the same recipient.
   *   - `uniqueOpens` is the count of recipients with `opened === true` —
   *     i.e. distinct recipients who opened at least once.
   *   - `openRate` is `uniqueOpens / delivered` (reach, not frequency).
   *
   * For backwards compatibility against the pre-change schema (records
   * with no `opened_at_list` / `open_count`), `open_count ?? 0` and
   * `opened_at_list ?? []` degrade to the older "first-open-only" shape:
   * `totalOpens` reads zero (we have no count) but `uniqueOpens` still
   * counts `opened === true` records correctly. The daily-opens chart
   * is empty under that fallback, which is the best we can do without
   * per-event timestamps.
   */
  private buildAnalyticsFromRecords(newsletter: Newsletter, records: EmailRecipientRecord[]): NewsletterAnalytics {
    const totalRecipients = records.length;
    const delivered = records.filter((r) => r.delivered).length;
    const failed = records.filter((r) => r.failed).length;
    const uniqueOpens = records.filter((r) => r.opened).length;
    const totalOpens = records.reduce((sum, r) => sum + (r.open_count ?? 0), 0);
    const openRate = delivered > 0 ? uniqueOpens / delivered : 0;

    const dailyOpens = this.aggregateDailyOpens(records);

    const eventTimestamps: number[] = [];
    for (const record of records) {
      if (record.last_opened_at) {
        eventTimestamps.push(new Date(record.last_opened_at).getTime());
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
      totalOpens,
      uniqueOpens,
      openRate,
      dailyOpens,
      lastEventAt,
    };
  }

  /**
   * Bucket every open event by UTC day. Two parallel counters per bucket:
   *   - `opens`: total events that day (matches `totalOpens` headline).
   *   - `uniqueOpens`: distinct recipients that opened that day, deduped
   *     by `email_id` (one recipient who opened five times on the same
   *     day counts once in `uniqueOpens` but five in `opens`).
   */
  private aggregateDailyOpens(records: EmailRecipientRecord[]): NewsletterDailyOpens[] {
    const opensPerDay = new Map<string, number>();
    const uniqueOpenersPerDay = new Map<string, Set<string>>();

    for (const record of records) {
      const events = record.opened_at_list ?? [];
      for (const event of events) {
        if (!event.opened_at) {
          continue;
        }
        const day = event.opened_at.slice(0, 10);
        opensPerDay.set(day, (opensPerDay.get(day) ?? 0) + 1);
        let openers = uniqueOpenersPerDay.get(day);
        if (!openers) {
          openers = new Set<string>();
          uniqueOpenersPerDay.set(day, openers);
        }
        openers.add(record.email_id);
      }
    }

    return Array.from(opensPerDay.keys())
      .map((date) => ({
        date,
        opens: opensPerDay.get(date) ?? 0,
        uniqueOpens: uniqueOpenersPerDay.get(date)?.size ?? 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
