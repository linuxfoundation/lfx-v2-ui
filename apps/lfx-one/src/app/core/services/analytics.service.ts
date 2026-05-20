// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';

/**
 * Thin analytics shim — no-op in v1 with a debug log so callers can wire up
 * tracking sites without coupling to a vendor SDK. Wiring this to Plausible /
 * the production analytics sink is a follow-up tracked under LFXV2-1925.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  public track(event: string, payload: Record<string, unknown> = {}): void {
    if (typeof console !== 'undefined' && console.info) {
      console.info('[analytics]', event, payload);
    }
  }
}
