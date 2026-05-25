// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { OrgMembershipAgreement, OrgMembershipDocumentsResponse } from '@lfx-one/shared/interfaces';

import { SnowflakeService } from './snowflake.service';

/**
 * Raw Snowflake row shape returned by the parameterized SELECT against
 * `ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_MEMBERSHIP_AGREEMENTS`. UPPER_CASE
 * matches Snowflake's default column case; mapping to the camelCase wire
 * shape happens in `shapeRow` below.
 */
interface RawAgreementRow {
  ASSET_ID: string;
  AGREEMENT_ID: string;
  AGREEMENT_NAME: string;
  // Nullable: query uses `ORDER BY SIGNED_DATE DESC NULLS LAST` and `formatDate`
  // already accepts null.
  SIGNED_DATE: string | null;
  MEMBERSHIP_TIER: string;
  MEMBERSHIP_STATUS_RAW: string;
  IS_CURRENT: boolean;
  FORMAT: string;
  DOWNLOAD_URL: string | null;
}

/**
 * Backs `GET /api/orgs/:accountId/lens/memberships/:foundationId/documents`.
 *
 * Spec 018-lfx-one-membership-agreements-data (FR-011 → FR-017): converted from
 * the spec-017 synchronous fixture import to an async Snowflake read. The
 * fixture file `fixtures/org-membership-documents.mock.json` has been deleted
 * (FR-016) — there is no fallback path. Snowflake is the sole source of truth
 * in every environment; missing credentials surface as HTTP 500 + the existing
 * spec-017 FR-025 inline error UI (FR-016b).
 *
 * `certificateTemplate` is assembled inline as `{ downloadUrl: null }` — the
 * certificate block is out of scope for this spec and remains client-assembled
 * per spec 017 FR-024.
 */
export class OrgLensDocumentsService {
  private readonly snowflakeService: SnowflakeService;

  public constructor() {
    this.snowflakeService = SnowflakeService.getInstance();
  }

  public async getMembershipDocuments(accountId: string, foundationId: string): Promise<OrgMembershipDocumentsResponse> {
    const query = `
      SELECT
        ASSET_ID,
        AGREEMENT_ID,
        AGREEMENT_NAME,
        SIGNED_DATE,
        MEMBERSHIP_TIER,
        MEMBERSHIP_STATUS_RAW,
        IS_CURRENT,
        FORMAT,
        DOWNLOAD_URL
      FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_MEMBERSHIP_AGREEMENTS
      WHERE ACCOUNT_ID = ? AND FOUNDATION_ID = ?
      ORDER BY SIGNED_DATE DESC NULLS LAST, ASSET_ID
    `;

    const result = await this.snowflakeService.execute<RawAgreementRow>(query, [accountId, foundationId]);

    // Defensive: the Snowflake SDK callback signature is `rows: any[] | undefined`,
    // so an empty/missing result here would otherwise throw on `.map` and surface
    // as a 500 instead of an empty agreements list.
    const rows = result.rows ?? [];
    const agreements: OrgMembershipAgreement[] = rows.map((raw) => this.shapeRow(raw));

    return {
      accountId,
      foundationId,
      agreements,
      certificateTemplate: { downloadUrl: null },
    };
  }

  private shapeRow(raw: RawAgreementRow): OrgMembershipAgreement {
    return {
      id: raw.AGREEMENT_ID,
      name: raw.AGREEMENT_NAME,
      signedDate: this.formatDate(raw.SIGNED_DATE),
      format: raw.FORMAT,
      fileSizeKb: null,
      isCurrent: raw.IS_CURRENT,
      downloadUrl: raw.DOWNLOAD_URL,
      statusRaw: raw.MEMBERSHIP_STATUS_RAW,
      tier: raw.MEMBERSHIP_TIER,
    };
  }

  /**
   * Normalize a Snowflake DATE value to `"YYYY-MM-DD"`.
   *
   * Intentionally diverges from `OrgLensMembershipsService.formatDate`: that one
   * returns `string | null` (and emits `null` for missing input). This one
   * returns `string` (`''` for missing input) because the downstream
   * `OrgMembershipAgreement.signedDate` wire field is typed `string` (non-nullable),
   * and the empty-string sentinel is what the UI's `formatSignedDate` shows as
   * an em-dash (`—`).
   */
  private formatDate(value: string | null): string {
    if (!value) return '';
    return new Date(value).toISOString().split('T')[0];
  }
}
