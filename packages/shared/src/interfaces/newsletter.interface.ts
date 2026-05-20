// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export type NewsletterContextType = 'foundation' | 'project';

export interface NewsletterRecipientCountPayload {
  committeeUids: string[];
}

export interface NewsletterRecipientCount {
  count: number;
}

export interface NewsletterTestSendPayload {
  subject: string;
  bodyHtml: string;
  toEmail: string;
  contextType: NewsletterContextType;
  contextUid: string;
  edReplyEmail: string;
}

export interface NewsletterSendPayload {
  subject: string;
  bodyHtml: string;
  committeeUids: string[];
  contextType: NewsletterContextType;
  contextUid: string;
  edReplyEmail: string;
}

export interface NewsletterSendFailure {
  email: string;
  reason: string;
}

export interface NewsletterSendResult {
  totalRecipients: number;
  sent: number;
  failed: number;
  failures: NewsletterSendFailure[];
}
