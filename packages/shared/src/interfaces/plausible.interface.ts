// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Plausible configuration from environment
 */
export interface PlausibleConfig {
  /** Plausible script URL (CDN or proxied) */
  src: string;
  /** Domain registered in Plausible (kept for clarity / future portability) */
  domain: string;
  /** Whether analytics is enabled for this environment */
  enabled: boolean;
}

/**
 * Plausible browser API
 *
 * The runtime function is created either by the official upstream snippet (a
 * queue stub that buffers calls until the real script loads) or by the loaded
 * `pa-*.js` script itself once it replaces the stub. Both shapes share this
 * type — the queue/init/options properties are populated by the stub and read
 * by the real script during initialization.
 */
export type PlausibleFunction = ((eventName: string, options?: { u?: string; props?: Record<string, unknown> }) => void) & {
  q?: unknown[];
  init?: (options?: Record<string, unknown>) => void;
  o?: Record<string, unknown>;
};
