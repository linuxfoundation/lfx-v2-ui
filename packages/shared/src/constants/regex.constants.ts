// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Matches any UUID-shaped string (8-4-4-4-12 hex groups). Does NOT enforce
 * the v4 version/variant bits — it is intentionally permissive so callers
 * can recognize any canonical UUID produced by project-service / other LFX
 * microservices, not only v4. Use this to distinguish a project-service UUID
 * from a Salesforce-style ID before handing the value to downstream lookups.
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Salesforce Account ID — "001" prefix + 12 (15-char form) or 15 (18-char form) alphanumeric chars. */
export const SALESFORCE_ACCOUNT_ID_PATTERN = /^001[A-Za-z0-9]{12,15}$/;

/**
 * Foundation / seat / vote identifier — mixed-case alphanumerics + hyphens, length 1–64.
 * Used at the SSR boundary (spec 016 FR-009j) to validate `foundationId`, `seatId`,
 * and `voteId` path parameters on the Board & Committee endpoints.
 *
 * Allowed values intentionally span three legitimate id shapes the SSR layer sees:
 *   1. Salesforce 18-char custom-object IDs (e.g. "a0941000002wBz2AAE") — the
 *      PRODUCTION foundationId shape, mixed case base32+checksum
 *   2. Synthetic v1 mock IDs (e.g. "agl-001", "agl-board-1") — kebab-case lowercase
 *   3. Future UUID v8 shape from `lfx-v2-member-service` (hex + hyphens, 36 chars)
 *
 * Defense-in-depth at the SSR boundary; caps payload size to 64 chars (DoS guard)
 * and rejects everything outside the alphanumeric + hyphen character class
 * (whitespace, punctuation, control bytes, XSS/SQLi probes).
 */
export const FOUNDATION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;
