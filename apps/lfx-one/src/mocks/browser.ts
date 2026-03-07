// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * MSW browser integration — starts a Service Worker that intercepts
 * network requests in the browser during local development.
 *
 * Usage in main.ts:
 *
 *   if (environment.useMocks) {
 *     const { worker } = await import('./mocks/browser');
 *     await worker.start({ onUnhandledRequest: 'bypass' });
 *   }
 *
 * @see https://mswjs.io/docs/integrations/browser
 *
 * Generated with [Claude Code](https://claude.ai/code)
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
