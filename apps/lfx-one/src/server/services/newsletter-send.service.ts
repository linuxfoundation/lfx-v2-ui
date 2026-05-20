// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NATS_CONFIG } from '@lfx-one/shared/constants';
import {
  NewsletterContextType,
  NewsletterSendFailure,
  NewsletterSendPayload,
  NewsletterSendResult,
  NewsletterTestSendPayload,
} from '@lfx-one/shared/interfaces';
import { Request } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { htmlToText } from 'html-to-text';
import Mustache from 'mustache';
import pLimit from 'p-limit';
import sanitizeHtml from 'sanitize-html';

import { CommitteeService } from './committee.service';
import { logger } from './logger.service';
import { NatsService } from './nats.service';
import { ProjectService } from './project.service';

const EMAIL_SEND_SUBJECT = 'lfx.email-service.send_email';
const SEND_CONCURRENCY = 10;
const TEST_SUBJECT_PREFIX = '[TEST] ';

interface RenderedEmail {
  html: string;
  text: string;
}

interface RecipientContext {
  email: string;
  firstName?: string;
}

interface RenderInput {
  subject: string;
  bodyHtml: string;
  edName: string;
  logoUrl?: string;
  displayName: string;
  edReplyEmail: string;
  recipientFirstName?: string;
}

interface EmailServicePayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

interface EmailServiceErrorResponse {
  error?: string;
}

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'ol', 'ul', 'li', 'a', 'blockquote', 'hr', 'h2', 'h3'],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }),
  },
};

function resolveTemplateDir(): string {
  const bundlePath = join(dirname(fileURLToPath(import.meta.url)), 'email-templates', 'newsletter');
  if (existsSync(bundlePath)) return bundlePath;

  const devPath = join(process.cwd(), 'src', 'server', 'email-templates', 'newsletter');
  if (existsSync(devPath)) return devPath;

  return bundlePath;
}

const TEMPLATE_DIR = resolveTemplateDir();
const HTML_TEMPLATE = readFileSync(join(TEMPLATE_DIR, 'template.html'), 'utf8');
const TEXT_TEMPLATE = readFileSync(join(TEMPLATE_DIR, 'template.txt'), 'utf8');

export class NewsletterSendService {
  private committeeService: CommitteeService;
  private projectService: ProjectService;
  private natsService: NatsService;

  public constructor() {
    this.committeeService = new CommitteeService();
    this.projectService = new ProjectService();
    this.natsService = new NatsService();
  }

  /**
   * Resolves the unique recipient count across the given committees.
   */
  public async getRecipientCount(req: Request, committeeUids: string[]): Promise<number> {
    logger.debug(req, 'newsletter_recipient_count', 'Counting unique recipients', {
      committee_count: committeeUids.length,
    });

    const recipients = await this.resolveRecipients(req, committeeUids);
    return recipients.length;
  }

  /**
   * Sends a single test newsletter to the requesting ED's specified email.
   */
  public async sendTest(req: Request, payload: NewsletterTestSendPayload, edName: string): Promise<void> {
    logger.debug(req, 'newsletter_test_send', 'Preparing test send', {
      context_type: payload.contextType,
      context_uid: payload.contextUid,
      to: payload.toEmail,
    });

    const branding = await this.resolveBranding(req, payload.contextType, payload.contextUid);
    const sanitizedBody = sanitizeHtml(payload.bodyHtml, SANITIZE_OPTIONS);
    const rendered = this.renderEmail({
      subject: payload.subject,
      bodyHtml: sanitizedBody,
      edName,
      logoUrl: branding.logoUrl,
      displayName: branding.displayName,
      edReplyEmail: payload.edReplyEmail,
    });

    await this.publishEmail({
      to: payload.toEmail,
      subject: TEST_SUBJECT_PREFIX + payload.subject,
      html: rendered.html,
      text: rendered.text,
    });

    logger.info(req, 'newsletter_test_send', 'Test newsletter dispatched', {
      to: payload.toEmail,
      context_uid: payload.contextUid,
    });
  }

  /**
   * Resolves committee members, renders per-recipient HTML+text, and publishes to the email
   * service over NATS with bounded concurrency. Returns an aggregate result with failures.
   */
  public async send(req: Request, payload: NewsletterSendPayload, edName: string): Promise<NewsletterSendResult> {
    logger.debug(req, 'newsletter_send', 'Resolving recipients and branding', {
      context_type: payload.contextType,
      context_uid: payload.contextUid,
      committee_count: payload.committeeUids.length,
    });

    const [recipients, branding] = await Promise.all([
      this.resolveRecipients(req, payload.committeeUids),
      this.resolveBranding(req, payload.contextType, payload.contextUid),
    ]);

    const sanitizedBody = sanitizeHtml(payload.bodyHtml, SANITIZE_OPTIONS);
    const totalRecipients = recipients.length;

    logger.info(req, 'newsletter_send', 'Dispatching newsletter', {
      total_recipients: totalRecipients,
      committee_count: payload.committeeUids.length,
      context_uid: payload.contextUid,
    });

    if (totalRecipients === 0) {
      return { totalRecipients: 0, sent: 0, failed: 0, failures: [] };
    }

    const failures: NewsletterSendFailure[] = [];
    let sent = 0;
    const limit = pLimit(SEND_CONCURRENCY);

    await Promise.all(
      recipients.map((recipient) =>
        limit(async () => {
          try {
            const rendered = this.renderEmail({
              subject: payload.subject,
              bodyHtml: sanitizedBody,
              edName,
              logoUrl: branding.logoUrl,
              displayName: branding.displayName,
              edReplyEmail: payload.edReplyEmail,
              recipientFirstName: recipient.firstName,
            });
            await this.publishEmail({
              to: recipient.email,
              subject: payload.subject,
              html: rendered.html,
              text: rendered.text,
            });
            sent += 1;
          } catch (error) {
            const reason = error instanceof Error ? error.message : 'Unknown error';
            failures.push({ email: recipient.email, reason });
            logger.warning(req, 'newsletter_send_recipient', 'Failed to send newsletter to recipient', {
              email: recipient.email,
              reason,
            });
          }
        })
      )
    );

    logger.info(req, 'newsletter_send', 'Newsletter send completed', {
      total_recipients: totalRecipients,
      sent,
      failed: failures.length,
    });

    return {
      totalRecipients,
      sent,
      failed: failures.length,
      failures,
    };
  }

  /**
   * Resolves unique recipients (by lowercased email) across the given committees.
   * Bad / missing emails are filtered out.
   */
  private async resolveRecipients(req: Request, committeeUids: string[]): Promise<RecipientContext[]> {
    if (committeeUids.length === 0) return [];

    const memberLists = await Promise.all(committeeUids.map((uid) => this.committeeService.getCommitteeMembers(req, uid)));

    const byEmail = new Map<string, RecipientContext>();
    for (const members of memberLists) {
      for (const member of members) {
        const email = (member.email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) continue;
        if (!byEmail.has(email)) {
          byEmail.set(email, { email, firstName: member.first_name?.trim() || undefined });
        }
      }
    }

    return Array.from(byEmail.values());
  }

  /**
   * Loads display name + logo URL for the active foundation/project. Falls back to a sane
   * default if the upstream project record is missing branding fields.
   */
  private async resolveBranding(req: Request, contextType: NewsletterContextType, contextUid: string): Promise<{ displayName: string; logoUrl?: string }> {
    const project = await this.projectService.getProjectById(req, contextUid, false);
    return {
      displayName: project.name || (contextType === 'foundation' ? 'Foundation' : 'Project'),
      logoUrl: project.logo_url || undefined,
    };
  }

  private renderEmail(input: RenderInput): RenderedEmail {
    const bodyText = htmlToText(input.bodyHtml, { wordwrap: 80 });
    const html = Mustache.render(HTML_TEMPLATE, {
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      edName: input.edName,
      logoUrl: input.logoUrl,
      displayName: input.displayName,
      edReplyEmail: input.edReplyEmail,
      recipientFirstName: input.recipientFirstName,
    });
    const text = Mustache.render(TEXT_TEMPLATE, {
      subject: input.subject,
      bodyText,
      edName: input.edName,
      displayName: input.displayName,
      edReplyEmail: input.edReplyEmail,
      recipientFirstName: input.recipientFirstName,
    });
    return { html, text };
  }

  private async publishEmail(payload: EmailServicePayload): Promise<void> {
    const codec = this.natsService.getCodec();
    const data = codec.encode(JSON.stringify(payload));
    const msg = await this.natsService.request(EMAIL_SEND_SUBJECT, data, { timeout: NATS_CONFIG.REQUEST_TIMEOUT });
    const replyBody = codec.decode(msg.data);

    if (!replyBody) return;
    try {
      const parsed = JSON.parse(replyBody) as EmailServiceErrorResponse;
      if (parsed.error) {
        throw new Error(`Email service error: ${parsed.error}`);
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Email service error:')) {
        throw err;
      }
      // Non-JSON reply is treated as success (the service returns empty on success).
    }
  }
}
