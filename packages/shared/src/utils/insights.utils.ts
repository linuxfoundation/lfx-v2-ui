// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { LINKS_CONFIG } from '../constants/links.config';

export function buildInsightsUrl(path: string = '', params?: Record<string, string | undefined>): string {
  const base = LINKS_CONFIG.INSIGHTS.BASE;
  const normalizedPath = path && !path.startsWith('/') ? `/${path}` : path;
  let url = `${base}${normalizedPath}`;
  if (params) {
    const query = Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`)
      .join('&');
    if (query) {
      url += `?${query}`;
    }
  }
  return url;
}
