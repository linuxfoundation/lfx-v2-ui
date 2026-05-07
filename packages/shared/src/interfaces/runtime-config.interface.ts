// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Runtime configuration for client-side IDs injected at container startup.
 * These values are passed via environment variables and made available to the
 * Angular app through SSR's TransferState mechanism.
 */
export interface RuntimeConfig {
  /**
   * LaunchDarkly client-side ID for feature flag evaluation.
   * This is a publicly-publishable ID (safe to expose in browser).
   */
  launchDarklyClientId: string;

  /**
   * DataDog RUM client token for browser monitoring.
   * This is a publicly-publishable token (safe to expose in browser).
   * @future Not yet integrated - placeholder for future use
   */
  dataDogRumClientId: string;

  /**
   * DataDog RUM application ID.
   * @future Not yet integrated - placeholder for future use
   */
  dataDogRumApplicationId: string;

  /**
   * Backend service URLs for DataDog RUM allowed tracing.
   * Passed from server-side environment variables (e.g., LFX_V2_SERVICE).
   */
  allowedTracingUrls: string[];

  /**
   * Intercom App ID for the Messenger / support bot.
   * This is a publicly-publishable workspace ID (safe to expose in browser).
   * Per-user identity verification is done via the namespaced
   * `http://lfx.dev/claims/intercom` claim on the Auth0 id_token (passed to
   * Intercom as `intercom_user_jwt`), not via this value.
   */
  intercomAppId: string;
}
