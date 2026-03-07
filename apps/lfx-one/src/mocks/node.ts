// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * MSW Node.js integration — intercepts outgoing HTTP requests
 * in SSR and test environments (no Service Worker needed).
 *
 * Usage in Express server or Playwright globalSetup:
 *
 *   import { server } from './mocks/node';
 *   server.listen({ onUnhandledRequest: 'bypass' });
 *
 *   // In teardown:
 *   server.close();
 *
 * @see https://mswjs.io/docs/integrations/node
 *
 * Generated with [Claude Code](https://claude.ai/code)
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
