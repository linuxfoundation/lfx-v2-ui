// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Contracts for the lfx-v2-email-service NATS subjects.
 *
 * Subjects:
 *   lfx.email-service.send_email
 *   lfx.email-service.get_email_status
 *   lfx.email-service.get_email_engagement_analytics
 *
 * See: https://github.com/linuxfoundation/lfx-v2-email-service
 */

export interface EmailServiceSendRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
  group_id?: string;
}

export interface EmailServiceSendResponse {
  email_id: string;
  group_id: string;
}

export interface EmailRecipientRecord {
  email_id: string;
  group_id: string;
  to: string;
  subject: string;
  sent_at: string;
  delivered: boolean;
  delivered_at?: string;
  opened: boolean;
  opened_at?: string;
  failed: boolean;
}

export interface EmailServiceStatusByEmailRequest {
  email_id: string;
}

export interface EmailServiceStatusByGroupRequest {
  group_id: string;
}

export interface EmailServiceEngagementResponse {
  group_id: string;
  total_sent: number;
  delivered: number;
  opened: number;
  failed: number;
}

export interface EmailServiceErrorResponse {
  error: string;
}
