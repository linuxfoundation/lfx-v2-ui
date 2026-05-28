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

const COLOR_WHITE = lfxColors.white;
const COLOR_BLUE_50 = lfxColors.blue[50];
const COLOR_BLUE_500 = lfxColors.blue[500];
const COLOR_BLUE_600 = lfxColors.blue[600];
const COLOR_GRAY_50 = lfxColors.gray[50];
const COLOR_GRAY_200 = lfxColors.gray[200];
const COLOR_GRAY_400 = lfxColors.gray[400];
const COLOR_GRAY_500 = lfxColors.gray[500];
const COLOR_GRAY_700 = lfxColors.gray[700];
const COLOR_GRAY_800 = lfxColors.gray[800];
const COLOR_GRAY_900 = lfxColors.gray[900];

// Email clients reset font-family on every cell; declare the stack everywhere
// text lives so Outlook desktop in particular doesn't fall back to Times.
const FONT_STACK = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif`;

// Per-tag inline styles applied to the Quill body HTML so Gmail/Outlook render
// h2 underlines, blue-accent blockquotes, branded links etc. — Gmail strips
// <style> blocks, so each tag has to carry its own `style=` attribute. Mirrors
// the in-app preview's component SCSS rules.
const BODY_TAG_STYLES: Record<string, string> = {
  p: 'margin:0 0 14px;line-height:1.65;',
  h2: `color:${COLOR_GRAY_900};font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.01em;margin:32px 0 12px;padding-bottom:8px;border-bottom:1px solid ${COLOR_GRAY_200};`,
  h3: `color:${COLOR_GRAY_700};font-size:17px;font-weight:600;line-height:1.4;margin:24px 0 8px;`,
  ul: 'margin:12px 0 16px;padding-left:32px;list-style-type:disc;',
  ol: 'margin:12px 0 16px;padding-left:32px;list-style-type:decimal;',
  li: 'margin:0 0 8px;line-height:1.6;',
  blockquote: `margin:16px 0;padding:12px 16px;border-left:3px solid ${COLOR_BLUE_500};background-color:${COLOR_BLUE_50};border-radius:0 4px 4px 0;color:${COLOR_GRAY_800};font-style:normal;`,
  hr: `border:0;border-top:1px dashed ${COLOR_GRAY_200};margin:24px 0;`,
  a: `color:${COLOR_BLUE_500};text-decoration:underline;`,
  strong: `color:${COLOR_GRAY_900};font-weight:600;`,
  b: `color:${COLOR_GRAY_900};font-weight:600;`,
};

/**
 * Walk the Quill output and inject inline `style="..."` attributes on each
 * supported tag. Skips tags that already carry a `style=` attribute so
 * Quill-emitted overrides (e.g. `text-align:center` on a `<p>`) win — those
 * paragraphs lose the base margin/line-height but keep their alignment, which
 * is the right precedence for an authoring tool that intentionally set the
 * style.
 */
function inlineBodyStyles(html: string): string {
  let result = html;
  for (const tag of Object.keys(BODY_TAG_STYLES)) {
    const style = BODY_TAG_STYLES[tag];
    // Allow optional trailing `/` so XHTML-style void tags like `<hr/>` also
    // get styled — Quill emits `<hr>` today but other authoring paths /
    // sanitizers can emit the self-closing form.
    const regex = new RegExp(`<${tag}(\\s[^>]*)?/?>`, 'gi');
    result = result.replace(regex, (match, attrs?: string) => {
      if (attrs && /\sstyle\s*=/i.test(attrs)) {
        return match;
      }
      return attrs ? `<${tag} style="${style}"${attrs}>` : `<${tag} style="${style}">`;
    });
  }
  return result;
}

const CTA_BUTTON_STYLE =
  `display:inline-block;background-color:${COLOR_BLUE_500};color:${COLOR_WHITE};padding:12px 28px;` +
  `border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.02em;`;

/**
 * Convert standalone-link paragraphs into button-pill CTAs. A `<p>` whose only
 * meaningful content is a single `<a>` (optionally wrapped in
 * `<strong>` / `<em>` / `<b>` / `<i>`) is treated as a call-to-action and
 * re-rendered as a centered blue pill. Inline links inside body paragraphs
 * are left as styled-underline.
 *
 * Runs AFTER inlineBodyStyles so it can strip the `style=` that pass added on
 * the matched `<a>` before injecting the button style.
 */
function convertStandaloneCtas(html: string): string {
  return html.replace(
    /<p\b[^>]*>\s*(?:<(?:strong|em|b|i)>\s*)*<a\b([^>]*)>([^<]+)<\/a>(?:\s*<\/(?:strong|em|b|i)>)*\s*<\/p>/gi,
    (_match, aAttrs: string, text: string) => {
      const cleanedAttrs = aAttrs.replace(/\sstyle\s*=\s*"[^"]*"/i, '');
      return `<p style="margin:28px 0;text-align:center;"><a${cleanedAttrs} style="${CTA_BUTTON_STYLE}">${text}</a></p>`;
    }
  );
}

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
 * + subject, "From <edName>" line, body cell wrapping the styled Quill HTML,
 * and a footer with sent-by + reply-to + UNSUBSCRIBE.
 *
 * Constraints driven by the rendering targets:
 *   - All visual styling is inline (`style="..."`). No `<style>` blocks and no
 *     classes — Gmail/Outlook strip those.
 *   - Layout is table-based with a fixed `width="680"` plus inline
 *     `max-width:680px`, the standard Outlook-desktop workaround.
 *   - Chrome strings flow through escapeHtml/escapeAttr because they're
 *     user/operator-controlled (project name, subject, ED display name).
 *   - bodyHtml is processed by inlineBodyStyles + convertStandaloneCtas before
 *     interpolation — see the NewsletterEmailChrome interface for the
 *     trust-boundary contract.
 */
export function buildNewsletterEmailHtml(input: NewsletterEmailChrome): string {
  const fallbackDisplay = input.contextType === 'foundation' ? 'Foundation' : 'Project';
  const subjectSafe = escapeHtml(input.subject || 'Untitled');
  const edNameSafe = escapeHtml(input.edName || 'Executive Director');
  const displayNameSafe = escapeHtml(input.displayName || fallbackDisplay);
  const replyEmailSafe = escapeAttr(input.edReplyEmail);
  const styledBody = convertStandaloneCtas(inlineBodyStyles(input.bodyHtml));

  const logoCell = input.logoUrl
    ? `<td width="56" valign="middle" style="padding-right:16px;width:56px;">` +
      `<img src="${escapeAttr(input.logoUrl)}" alt="${displayNameSafe}" width="56" height="56" ` +
      `style="display:block;width:56px;height:56px;border-radius:6px;background-color:${COLOR_WHITE};padding:4px;object-fit:contain;border:0;" />` +
      `</td>`
    : '';

  // Outlook desktop ignores background-image on <td>; the solid background-color
  // is the graceful fallback so the header still renders branded.
  const headerBg = `background-color:${COLOR_BLUE_500};background-image:linear-gradient(135deg, ${COLOR_BLUE_500} 0%, ${COLOR_BLUE_600} 100%);`;

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
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="680" style="width:680px;max-width:680px;background-color:${COLOR_WHITE};border:1px solid ${COLOR_GRAY_200};border-radius:8px;overflow:hidden;">
<tr>
<td style="${headerBg}color:${COLOR_WHITE};padding:32px 40px;font-family:${FONT_STACK};">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tr>
${logoCell}
<td valign="middle">
<div style="font-size:13px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;opacity:0.9;color:${COLOR_WHITE};font-family:${FONT_STACK};">${displayNameSafe} &middot; Newsletter</div>
<div style="font-size:22px;font-weight:700;line-height:1.3;color:${COLOR_WHITE};margin-top:8px;font-family:${FONT_STACK};">${subjectSafe}</div>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding:24px 40px 0;font-size:13px;color:${COLOR_GRAY_500};font-family:${FONT_STACK};">From <strong style="color:${COLOR_GRAY_900};">${edNameSafe}</strong></td>
</tr>
<tr>
<td style="padding:32px 40px;font-size:16px;color:${COLOR_GRAY_800};line-height:1.65;font-family:${FONT_STACK};">${styledBody}</td>
</tr>
<tr>
<td style="background-color:${COLOR_GRAY_50};border-top:1px solid ${COLOR_GRAY_200};padding:24px 40px;font-size:12px;color:${COLOR_GRAY_500};font-family:${FONT_STACK};">
<div style="margin-bottom:6px;">Sent by <strong style="color:${COLOR_GRAY_900};">${edNameSafe}</strong> on behalf of <strong style="color:${COLOR_GRAY_900};">${displayNameSafe}</strong>.</div>
<div style="margin-bottom:6px;">To reply, email <a href="mailto:${replyEmailSafe}" style="color:${COLOR_BLUE_500};text-decoration:underline;">${replyEmailSafe}</a></div>
<div style="color:${COLOR_GRAY_400};font-size:11px;">To unsubscribe from ${displayNameSafe} newsletters, reply with <strong>UNSUBSCRIBE</strong>. Delivered by <span style="font-weight:700;color:${COLOR_BLUE_500};letter-spacing:-0.02em;">LFX</span>.</div>
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
