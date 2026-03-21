// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Format a number for display using compact notation.
 * - Numbers >= 999,950 are displayed as "X.XM"
 * - Numbers >= 1,000 are displayed as "X.XK"
 * - Smaller numbers use locale-formatted strings
 */
export function formatNumber(num: number): string {
  if (num >= 999_950) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/**
 * Format a number as currency (USD) using compact notation.
 * - Numbers >= 999,950 are displayed as "$X.XM"
 * - Numbers >= 1,000 are displayed as "$X.XK"
 * - Smaller numbers use locale-formatted strings with "$" prefix
 */
export function formatCurrency(num: number): string {
  if (num >= 999_950) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(1)}K`;
  return `$${num.toLocaleString()}`;
}
