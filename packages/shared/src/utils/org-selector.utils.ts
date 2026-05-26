// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/** Allowlist covering every OIDC username shape (alphanumerics, dot, dash, underscore, plus, at) while excluding the filter-grammar separators `:` and `,`. */
const FILTER_SAFE_USERNAME = /^[A-Za-z0-9._+\-@]+$/;

/** Allowlist for query-service filter identifiers — UUIDs (hex + dashes) and Salesforce IDs (15 or 18 alphanumeric). */
const FILTER_SAFE_IDENTIFIER = /^[A-Za-z0-9_-]+$/;

/** Returns true when the value is safe to interpolate into a query-service `writers.username:<value>` / `auditors.username:<value>` filter. */
export function isFilterSafeUsername(value: string): boolean {
  return value.length > 0 && value.length <= 256 && FILTER_SAFE_USERNAME.test(value);
}

/** Returns true when the value is safe to interpolate into a query-service `uid:<value>` / `sfid:<value>` filter. */
export function isFilterSafeIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 64 && FILTER_SAFE_IDENTIFIER.test(value);
}
