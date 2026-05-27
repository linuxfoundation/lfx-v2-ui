// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NATS_CONFIG } from '@lfx-one/shared/constants';
import { NatsSubjects } from '@lfx-one/shared/enums';
import { EmailRecipientRecord, EmailServiceEngagementResponse, EmailServiceSendRequest, EmailServiceSendResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { MicroserviceError } from '../errors';
import { logger } from './logger.service';
import { NatsService } from './nats.service';

/**
 * NATS client for lfx-v2-email-service. Wraps the three request/reply subjects
 * documented in the email-service README.
 *
 * Auth: email-service has no auth surface — NATS-level access is the only gate.
 * Do NOT pass M2M tokens in the payload.
 */
export class EmailServiceClient {
  private readonly natsService: NatsService;

  public constructor() {
    this.natsService = new NatsService();
  }

  /**
   * Send a single email through the email-service.
   *
   * One call per recipient. Newsletter sends share a caller-supplied group_id
   * so analytics queries can aggregate per-newsletter.
   */
  public async sendEmail(req: Request, payload: EmailServiceSendRequest): Promise<EmailServiceSendResponse> {
    logger.debug(req, 'email_service_send_email', 'Sending email via NATS', {
      to: payload.to,
      group_id: payload.group_id,
      subject_length: payload.subject.length,
    });

    const result = await this.requestJson<EmailServiceSendResponse>(req, NatsSubjects.EMAIL_SERVICE_SEND_EMAIL, payload, 'email_service_send_email');

    return result;
  }

  /**
   * Look up per-recipient delivery + engagement records for a group_id.
   *
   * Used by the analytics endpoint to derive the open-rate, daily-opens
   * time series, and last-event timestamp from per-email opened_at values.
   */
  public async getStatusByGroup(req: Request, groupId: string): Promise<EmailRecipientRecord[]> {
    logger.debug(req, 'email_service_status_by_group', 'Fetching email status by group via NATS', { group_id: groupId });

    const result = await this.requestJson<EmailRecipientRecord[] | EmailRecipientRecord>(
      req,
      NatsSubjects.EMAIL_SERVICE_GET_EMAIL_STATUS,
      { group_id: groupId },
      'email_service_status_by_group'
    );

    // The email-service returns an array for group_id queries, but normalize
    // defensively in case a single record sneaks through.
    return Array.isArray(result) ? result : [result];
  }

  /**
   * Quick group rollup: total_sent, delivered, opened, failed.
   * Cheaper than getStatusByGroup when the daily-opens chart isn't needed.
   */
  public async getEngagement(req: Request, groupId: string): Promise<EmailServiceEngagementResponse> {
    logger.debug(req, 'email_service_engagement', 'Fetching engagement analytics via NATS', { group_id: groupId });

    return this.requestJson<EmailServiceEngagementResponse>(
      req,
      NatsSubjects.EMAIL_SERVICE_GET_EMAIL_ENGAGEMENT_ANALYTICS,
      { group_id: groupId },
      'email_service_engagement'
    );
  }

  /**
   * Shared NATS request/reply helper: JSON encode, dispatch with the standard
   * timeout, decode, and surface the email-service `{error: "..."}` envelope as
   * a MicroserviceError so the centralized error handler renders a 502.
   */
  private async requestJson<T>(req: Request, subject: NatsSubjects, payload: unknown, operation: string): Promise<T> {
    const codec = this.natsService.getCodec();

    try {
      const response = await this.natsService.request(subject, codec.encode(JSON.stringify(payload)), {
        timeout: NATS_CONFIG.REQUEST_TIMEOUT,
      });

      const responseText = codec.decode(response.data);
      const parsed = JSON.parse(responseText) as T & { error?: string };

      if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string') {
        throw new MicroserviceError(parsed.error, 502, 'EMAIL_SERVICE_ERROR', {
          operation,
          service: 'email-service',
          errorBody: parsed,
        });
      }

      return parsed as T;
    } catch (error) {
      if (error instanceof MicroserviceError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const isTimeout = message.includes('timeout') || message.includes('TIMEOUT');

      throw new MicroserviceError(
        isTimeout ? 'Email service request timed out' : `Email service request failed: ${message}`,
        isTimeout ? 504 : 502,
        isTimeout ? 'EMAIL_SERVICE_TIMEOUT' : 'EMAIL_SERVICE_UNAVAILABLE',
        {
          operation,
          service: 'email-service',
          originalError: error instanceof Error ? error : undefined,
        }
      );
    }
  }
}
