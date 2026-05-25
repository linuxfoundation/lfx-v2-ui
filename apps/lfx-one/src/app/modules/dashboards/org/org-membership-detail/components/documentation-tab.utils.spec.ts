// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { OrgMembershipAgreement } from '@lfx-one/shared/interfaces';

import { buildAgreementsCsv } from './documentation-tab.utils';

/**
 * Spec 018 SC-015: pure-helper unit tests for `buildAgreementsCsv`.
 * Covers: (a) empty list → header-only; (b) single row; (c) quote-escaping
 * for organization/foundation containing `,` and `"`; (d) row with
 * `downloadUrl = null` → empty quoted/unquoted Download URL column.
 */

const HEADER_LINE = 'Organization,Foundation,Agreement Name,Signed Date,Format,Status,Tier,Current,Download URL';
const SAMPLE_ROW: OrgMembershipAgreement = {
  id: 'ma-2026-x7y3z2',
  name: 'Membership Agreement 2026',
  signedDate: '2026-01-15',
  format: 'PDF',
  fileSizeKb: null,
  isCurrent: true,
  downloadUrl: 'https://example.com/agreement.pdf',
  statusRaw: 'Active',
  tier: 'Platinum Membership',
};

describe('buildAgreementsCsv', () => {
  it('emits a header-only CSV when the agreements list is empty (SC-015 case a)', () => {
    const csv = buildAgreementsCsv([], 'Toyota Motor Corporation', 'Automotive Grade Linux');

    expect(csv).toBe(`${HEADER_LINE}\r\n`);
  });

  it('emits one data row for a single agreement (SC-015 case b)', () => {
    const csv = buildAgreementsCsv([SAMPLE_ROW], 'Toyota Motor Corporation', 'Automotive Grade Linux');

    const lines = csv.split('\r\n');
    expect(lines).toHaveLength(3); // header + 1 data row + trailing empty (after final \r\n)
    expect(lines[0]).toBe(HEADER_LINE);
    expect(lines[1]).toBe(
      'Toyota Motor Corporation,Automotive Grade Linux,Membership Agreement 2026,"Jan 15, 2026",PDF,Active,Platinum Membership,Yes,https://example.com/agreement.pdf'
    );
    expect(lines[2]).toBe('');
  });

  it('RFC 4180 quote-escapes organization/foundation names containing , and " (SC-015 case c)', () => {
    const csv = buildAgreementsCsv([SAMPLE_ROW], 'Foo, Inc. "The Best"', 'Bar Foundation');

    const lines = csv.split('\r\n');
    // Embedded " is doubled to "" inside the quoted field; the field is double-quoted because it contains , and ".
    expect(lines[1]).toContain('"Foo, Inc. ""The Best""",Bar Foundation,');
  });

  it('emits empty Download URL column when agreement.downloadUrl is null (SC-015 case d)', () => {
    const rowWithoutUrl: OrgMembershipAgreement = { ...SAMPLE_ROW, downloadUrl: null };
    const csv = buildAgreementsCsv([rowWithoutUrl], 'Org', 'Foundation');

    const lines = csv.split('\r\n');
    // Last column is the empty Download URL — line ends with a trailing comma then nothing.
    expect(lines[1].endsWith(',No,')).toBe(true);
  });

  it('formats Signed Date as MMM d, yyyy (en-US) and quotes it (contains comma)', () => {
    const csv = buildAgreementsCsv([SAMPLE_ROW], 'Org', 'Foundation');

    // "Jan 15, 2026" contains a comma → must be RFC 4180 quoted.
    expect(csv).toContain('"Jan 15, 2026"');
  });

  it('renders Current = "Yes" when isCurrent=true, "No" otherwise', () => {
    const csvCurrent = buildAgreementsCsv([SAMPLE_ROW], 'Org', 'Foundation');
    const csvNotCurrent = buildAgreementsCsv([{ ...SAMPLE_ROW, isCurrent: false }], 'Org', 'Foundation');

    expect(csvCurrent.split('\r\n')[1]).toContain(',Yes,');
    expect(csvNotCurrent.split('\r\n')[1]).toContain(',No,');
  });
});
