// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { lfxColors } from '@lfx-one/shared/constants';
import { stripHtml } from '@lfx-one/shared/utils';

export interface NewsletterEmailChrome {
  subject: string;
  /**
   * Newsletter body HTML, interpolated verbatim into the envelope. Trust
   * boundary: the field is populated by authenticated writers via the
   * authoring UI; there is no programmatic HTML sanitizer (e.g. DOMPurify /
   * sanitize-html) between the form and this call. Quill's format whitelist
   * is not a security sanitizer. If we ever accept body content from a less
   * privileged source, sanitize upstream of this function.
   */
  bodyHtml: string;
  edName: string;
  edReplyEmail: string;
  displayName: string;
  logoUrl?: string;
  contextType: 'foundation' | 'project';
}

const COLOR_BLUE_500 = lfxColors.blue[500];
const COLOR_GRAY_50 = lfxColors.gray[50];
const COLOR_GRAY_200 = lfxColors.gray[200];
const COLOR_GRAY_400 = lfxColors.gray[400];
const COLOR_GRAY_500 = lfxColors.gray[500];
const COLOR_GRAY_800 = lfxColors.gray[800];
const COLOR_GRAY_900 = lfxColors.gray[900];

// Email clients reset font-family on every cell; declare the stack everywhere
// text lives so Outlook desktop in particular doesn't fall back to Times.
const FONT_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif`;

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Same routine as escapeHtml — attributes need the same five characters
// escaped. Kept as a named alias for call-site readability.
function escapeAttr(value: string): string {
  return escapeHtml(value);
}

/**
 * Build the email's outer HTML envelope mirroring the in-app preview
 * (`newsletter-preview.component.html`): blue header banner with logo + eyebrow
 * + subject, "From <edName>" line, body cell wrapping the Quill HTML, and a
 * footer with sent-by + reply-to + UNSUBSCRIBE.
 *
 * Constraints driven by the rendering targets:
 *   - All visual styling is inline (`style="..."`). No `<style>` blocks and no
 *     classes — Gmail/Outlook strip those.
 *   - Layout is table-based with a fixed `width="600"` plus inline
 *     `max-width:600px`, which is the standard Outlook-desktop workaround.
 *   - Chrome strings flow through escapeHtml/escapeAttr because they're
 *     user/operator-controlled (project name, subject, ED display name).
 *   - bodyHtml is interpolated verbatim — see the NewsletterEmailChrome
 *     interface for the trust-boundary contract.
 */
export function buildNewsletterEmailHtml(input: NewsletterEmailChrome): string {
  const fallbackDisplay = input.contextType === 'foundation' ? 'Foundation' : 'Project';
  const subjectSafe = escapeHtml(input.subject || 'Untitled');
  const edNameSafe = escapeHtml(input.edName || 'Executive Director');
  const displayNameSafe = escapeHtml(input.displayName || fallbackDisplay);
  const replyEmailSafe = escapeAttr(input.edReplyEmail);

  const logoCell = input.logoUrl
    ? `<td width="56" valign="middle" style="padding-right:16px;width:56px;">` +
      `<img src="${escapeAttr(input.logoUrl)}" alt="${displayNameSafe}" width="56" height="56" ` +
      `style="display:block;width:56px;height:56px;border-radius:6px;background-color:#ffffff;padding:4px;object-fit:contain;border:0;" />` +
      `</td>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>${subjectSafe}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR_GRAY_50};font-family:${FONT_STACK};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLOR_GRAY_50};padding:24px 12px;">
<tr>
<td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:600px;background-color:#ffffff;border:1px solid ${COLOR_GRAY_200};border-radius:8px;overflow:hidden;">
<tr>
<td style="background-color:${COLOR_BLUE_500};color:#ffffff;padding:24px 32px;font-family:${FONT_STACK};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
${logoCell}
<td valign="middle">
<div style="font-size:13px;font-weight:600;letter-spacing:0.6px;text-transform:uppercase;opacity:0.9;color:#ffffff;font-family:${FONT_STACK};">${displayNameSafe} &middot; Newsletter</div>
<div style="font-size:22px;font-weight:700;line-height:1.3;color:#ffffff;margin-top:6px;font-family:${FONT_STACK};">${subjectSafe}</div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:20px 32px 0;font-size:13px;color:${COLOR_GRAY_500};font-family:${FONT_STACK};">From <strong style="color:${COLOR_GRAY_900};">${edNameSafe}</strong></td>
</tr>
<tr>
<td style="padding:24px 32px 32px;font-size:16px;color:${COLOR_GRAY_800};line-height:1.65;font-family:${FONT_STACK};">${input.bodyHtml}</td>
</tr>
<tr>
<td style="background-color:${COLOR_GRAY_50};border-top:1px solid ${COLOR_GRAY_200};padding:20px 32px;font-size:12px;color:${COLOR_GRAY_500};font-family:${FONT_STACK};">
<div style="margin-bottom:6px;">Sent by <strong style="color:${COLOR_GRAY_900};">${edNameSafe}</strong> on behalf of <strong style="color:${COLOR_GRAY_900};">${displayNameSafe}</strong>.</div>
<div style="margin-bottom:6px;">To reply, email <a href="mailto:${replyEmailSafe}" style="color:${COLOR_BLUE_500};text-decoration:underline;">${replyEmailSafe}</a></div>
<div style="color:${COLOR_GRAY_400};font-size:11px;">To unsubscribe from ${displayNameSafe} newsletters, reply with <strong>UNSUBSCRIBE</strong>. Delivered by LFX.</div>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

/**
 * Plain-text counterpart of buildNewsletterEmailHtml. Mirrors the same
 * structure (From / On behalf of / body / reply-to / UNSUBSCRIBE) for clients
 * that prefer text/plain or for `View original` debugging.
 */
export function buildNewsletterEmailText(input: NewsletterEmailChrome): string {
  const fallbackDisplay = input.contextType === 'foundation' ? 'Foundation' : 'Project';
  const edName = input.edName || 'Executive Director';
  const displayName = input.displayName || fallbackDisplay;
  const body = stripHtml(input.bodyHtml);

  return [
    `From: ${edName}`,
    `On behalf of: ${displayName}`,
    '',
    body,
    '',
    '---',
    `To reply, email ${input.edReplyEmail}`,
    `To unsubscribe from ${displayName} newsletters, reply with UNSUBSCRIBE.`,
    'Delivered by LFX.',
  ].join('\n');
}
