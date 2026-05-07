// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Intercom Messenger boot options.
 *
 * `app_id` is the public workspace ID (sourced from runtime config), and
 * `intercom_user_jwt` is the Auth0-minted identity-verification JWT that
 * Intercom uses to bind the session to the authenticated user.
 */
export interface IntercomBootOptions {
  api_base?: string;
  app_id: string;
  user_id?: string;
  name?: string;
  email?: string;
  created_at?: number;
  intercom_user_jwt?: string;
  [key: string]: unknown;
}

/** Intercom settings stored on `window.intercomSettings`. */
export type IntercomSettings = Partial<IntercomBootOptions>;

/**
 * Intercom Messenger browser API — models both the fully-loaded SDK function
 * and the pre-load queue stub that buffers calls until the real script loads.
 *
 * Overloads cover the known command signatures; the catch-all allows
 * forward-compatible usage of new Intercom commands without casting.
 */
export interface IntercomFunction {
  (command: 'boot', options: Omit<IntercomBootOptions, 'intercom_user_jwt'>): void;
  (command: 'update', data?: Partial<IntercomBootOptions>): void;
  (command: 'show'): void;
  (command: 'hide'): void;
  (command: 'shutdown'): void;
  (command: 'trackEvent', eventName: string, metadata?: Record<string, unknown>): void;
  (command: 'reattach_activator'): void;
  (command: string, ...args: unknown[]): void;
  /** Queue of buffered calls (populated by the stub before the real script loads). */
  q?: unknown[][];
  /** Push function used by the stub to enqueue calls. */
  c?: (args: unknown[]) => void;
}
