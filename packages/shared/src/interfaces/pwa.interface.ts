// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Captured {@link https://developer.mozilla.org/docs/Web/API/BeforeInstallPromptEvent beforeinstallprompt}
 * event. Typed locally because lib.dom.d.ts does not yet include it.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type PwaDisplayMode = 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' | 'unknown';

/** Per-device platform hint derived from the user agent. */
export type PwaPlatform = 'ios' | 'android' | 'desktop' | 'unknown';
