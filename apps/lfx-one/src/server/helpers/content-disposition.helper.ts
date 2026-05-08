// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Build an RFC 5987 compliant `Content-Disposition: attachment` header value
 * with both an ASCII fallback (`filename=`) and a UTF-8 encoded variant
 * (`filename*=UTF-8''...`). The ASCII fallback strips non-ASCII characters and
 * neutralizes quotes / backslashes / control chars to prevent header injection
 * (CR/LF) and broken responses.
 *
 * Centralized so committee, project, and generic document download controllers
 * use the same encoding logic.
 */
export function contentDispositionAttachment(fileName: string): string {
  const safeAscii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}
