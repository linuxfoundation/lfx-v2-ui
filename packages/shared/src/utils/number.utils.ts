// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Format a number for display using compact notation.
 * - Handles negative numbers, NaN, and Infinity gracefully
 * - Numbers >= 999,950 are displayed as "X.XM"
 * - Numbers >= 1,000 are displayed as "X.XK"
 * - Smaller numbers use locale-formatted strings
 */
export function formatNumber(num: number): string {
  if (!Number.isFinite(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 999_950) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/**
 * Format a number as currency (USD) using compact notation.
 * - Handles negative numbers, NaN, and Infinity gracefully
 * - Numbers >= 999,950 are displayed as "$X.XM"
 * - Numbers >= 1,000 are displayed as "$X.XK"
 * - Smaller numbers use locale-formatted strings with "$" prefix
 */
export function formatCurrency(num: number): string {
  if (!Number.isFinite(num)) return '$0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 999_950) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString()}`;
}

/**
 * Format a monetary value-lost figure using compact notation.
 * Suitable for displaying churn, refund, or write-off amounts.
 * - Values >= 1 000 000 → "$X.XM"
 * - Values >= 1 000     → "$XK" (rounded to nearest K)
 * - Smaller values      → "$X,XXX" (locale-formatted)
 */
export function formatValueLost(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }
  return `$${value.toLocaleString()}`;
}
