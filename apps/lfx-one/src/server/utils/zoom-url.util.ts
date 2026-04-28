// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Returns true when `url` is an HTTPS URL on `zoom.us` or any `*.zoom.us` subdomain.
 * Used to distinguish a real Zoom join URL from the LFX landing-page URL that ITX
 * writes to `public_link`. Hostname-based so it tolerates any Zoom path shape; the
 * HTTPS check rejects schemes like `javascript://zoom.us/...`.
 */
export function isZoomJoinUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && (parsedUrl.hostname === 'zoom.us' || parsedUrl.hostname.toLowerCase().endsWith('.zoom.us'));
  } catch {
    return false;
  }
}
