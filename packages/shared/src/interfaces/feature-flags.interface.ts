// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Evaluation context for OpenFeature flag targeting
 * Used to provide user context to LaunchDarkly for flag evaluation
 */
export interface EvaluationContext {
  /** Context kind identifier */
  kind?: 'user' | 'multi';
  /** User's display name */
  name?: string;
  /** User's email address */
  email?: string;
  /** Unique targeting key for flag evaluation */
  targetingKey?: string;
}

/**
 * LaunchDarkly provider configuration options
 */
export interface LaunchDarklyConfig {
  /** LaunchDarkly client ID for environment */
  clientId: string;
  /** Initialization timeout in seconds */
  initializationTimeout?: number;
  /** Enable streaming for real-time flag updates */
  streaming?: boolean;
  /** Logger configuration */
  logger?: {
    /** Log level */
    level: 'debug' | 'info' | 'warn' | 'error' | 'none';
  };
}
