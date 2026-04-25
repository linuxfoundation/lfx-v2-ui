// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration for the LFX One iOS sideload app.
 *
 * The app is a thin native shell around the existing Angular SSR build.
 * server.url points at a hosted (or tunnelled) instance of the SSR server
 * so Auth0 callbacks, /api/* routes, and SSR continue to work unchanged.
 *
 * Set LFX_MOBILE_BACKEND_URL before running `yarn cap:sync` to override
 * the default. For local research, run cloudflared on your Mac and pass
 * the trycloudflare URL.
 */
const backendUrl = process.env['LFX_MOBILE_BACKEND_URL'] || 'https://lfx.localhost';

const config: CapacitorConfig = {
  appId: 'org.linuxfoundation.lfx',
  appName: 'LFX',
  webDir: 'dist/lfx-one/browser',
  server: {
    url: backendUrl,
    cleartext: false,
    iosScheme: 'https',
  },
  ios: {
    contentInset: 'always',
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
