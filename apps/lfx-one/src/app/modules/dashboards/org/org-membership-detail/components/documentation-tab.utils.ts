// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { OrgMembershipAgreement } from '@lfx-one/shared/interfaces';

/**
 * Spec 018 FR-032a: CSV header row, 9 columns, in this exact order.
 * The CSV is a pure client-side export (round 2 Q4) — no server endpoint.
 */
const CSV_HEADERS = ['Organization', 'Foundation', 'Agreement Name', 'Signed Date', 'Format', 'Status', 'Tier', 'Current', 'Download URL'] as const;

/**
 * Build a RFC 4180-compliant CSV from a list of membership agreements.
 *
 * Spec 018-lfx-one-membership-agreements-data (FR-032a / FR-034).
 *
 * - Header row + one data row per agreement.
 * - Fields containing `,`, `"`, `\r`, or `\n` are double-quoted; embedded `"`
 *   characters are escaped by doubling (`""`).
 * - Line terminator is `\r\n` (RFC 4180 + Excel-friendly).
 * - `Signed Date` (column 4) uses the `MMM d, yyyy` en-US format (e.g., "Jan 15, 2026")
 *   re-derived from `signedDate` to match the on-screen metadata line; we do NOT
 *   trust any pre-formatted display string from the caller because the helper
 *   must be independently unit-testable per SC-015.
 * - `Current` (column 8) is the human-readable boolean — "Yes" / "No".
 * - `Download URL` (column 9) becomes an empty string when `downloadUrl` is null.
 *
 * Pure function: no DOM, no Blob, no I/O — testable in isolation per SC-015.
 */
export function buildAgreementsCsv(agreements: readonly OrgMembershipAgreement[], organization: string, foundation: string): string {
  const headerLine = CSV_HEADERS.map(quoteField).join(',');

  const dataLines = agreements.map((a) =>
    [organization, foundation, a.name, formatSignedDateForCsv(a.signedDate), a.format, a.statusRaw, a.tier, a.isCurrent ? 'Yes' : 'No', a.downloadUrl ?? '']
      .map(quoteField)
      .join(',')
  );

  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/**
 * RFC 4180 field-quoting: wrap in `"`s and double any embedded `"` when the
 * field contains `,`, `"`, `\r`, or `\n`. Otherwise emit verbatim.
 */
function quoteField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format an ISO date string (YYYY-MM-DD) as "MMM d, yyyy" in en-US.
 * Matches the on-screen metadata-line format. Returns '' when input is empty.
 */
function formatSignedDateForCsv(iso: string): string {
  if (!iso) return '';
  // Parse as UTC midnight to avoid TZ off-by-one; Snowflake DATE round-trips as UTC.
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
