// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { MEMBERSHIP_AGREEMENT_CSV_HEADERS } from '@lfx-one/shared/constants';
import type { OrgMembershipAgreement } from '@lfx-one/shared/interfaces';

/** Build an RFC 4180 CSV from a list of membership agreements (FR-032a / FR-034). */
export function buildAgreementsCsv(agreements: readonly OrgMembershipAgreement[], organization: string, foundation: string): string {
  const headerLine = MEMBERSHIP_AGREEMENT_CSV_HEADERS.map(quoteField).join(',');

  const dataLines = agreements.map((a) =>
    [organization, foundation, a.name, formatSignedDateForCsv(a.signedDate), a.format, a.statusRaw, a.tier, a.isCurrent ? 'Yes' : 'No', a.downloadUrl ?? '']
      .map(quoteField)
      .join(',')
  );

  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/** RFC 4180 field quoting: wraps in double-quotes when value contains `,`, `"`, `\r`, or `\n`. */
function quoteField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Format an ISO date string (YYYY-MM-DD) as "MMM d, yyyy" en-US; returns '' for empty input. */
function formatSignedDateForCsv(iso: string): string {
  if (!iso) return '';
  // Parse as UTC midnight to avoid TZ off-by-one; Snowflake DATE round-trips as UTC.
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
}
