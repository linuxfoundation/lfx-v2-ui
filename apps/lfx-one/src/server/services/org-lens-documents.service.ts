// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { OrgMembershipAgreement, OrgMembershipCertificateTemplate, OrgMembershipDocumentsResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { SnowflakeService } from './snowflake.service';

/**
 * Raw Snowflake row shape returned by the parameterized SELECT against
 * `ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_MEMBERSHIP_AGREEMENTS`. UPPER_CASE
 * matches Snowflake's default column case; mapping to the camelCase wire
 * shape happens in `shapeAgreementRow` below.
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
 * Raw Snowflake row shape returned by the parameterized SELECT against
 * `ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_TLF_CERTIFICATE` (spec 019).
 * Mapping to the camelCase wire shape happens in `shapeCertificateRow`.
 */
interface RawCertificateRow {
  ACCOUNT_NAME: string;
  MEMBERSHIP_TIER: string;
  CERTIFICATE_TITLE: string;
  CERTIFICATE_SUBTITLE: string;
  TLF_MEMBER_SINCE: string;
  MEMBER_SINCE_FORMATTED: string;
  TIER_START_DATE: string;
  TIER_END_DATE: string;
  CERTIFICATE_DOWNLOAD_URL: string | null;
}

/**
 * Structured return shape carrying the wire response PLUS a non-wire
 * `certificateDegraded` flag the controller reads for its success-log
 * `certificate_state` field (spec 019 FR-010a / SC-015). Kept internal so
 * the wire `OrgMembershipDocumentsResponse` shape is unchanged.
 */
export interface DocumentsResult {
  response: OrgMembershipDocumentsResponse;
  certificateDegraded: boolean;
}

/**
 * Backs `GET /api/orgs/:accountId/lens/memberships/:foundationId/documents`.
 *
 * Spec 018-lfx-one-membership-agreements-data (FR-011 → FR-017): converted the
 * spec-017 synchronous fixture import to an async Snowflake read. The fixture
 * file `fixtures/org-membership-documents.mock.json` has been deleted (FR-016)
 * — there is no fallback path. Snowflake is the sole source of truth in every
 * environment; missing credentials surface as HTTP 500 + the existing spec-017
 * FR-025 inline error UI (FR-016b).
 *
 * Spec 019-lfx-one-tlf-certificate-data (FR-010 → FR-014): added a second
 * Snowflake query against `ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_TLF_CERTIFICATE`
 * for the per-company Linux Foundation membership certificate. Queries run in
 * parallel via `Promise.allSettled` (FR-010a):
 * - Agreements query failure → the whole method throws (agreements are primary
 *   content; their loss requires the tab-level error state).
 * - Certificate query failure → logged via `logger.warning` with operation
 *   'certificate_query_failed', `certificateTemplate` set to `null`, agreements
 *   served normally. The UI silently hides the Certificate card via the
 *   existing `@if (certificateTemplate())` guard — visually indistinguishable
 *   from a legitimate non-TLF member. The `certificateDegraded` flag on
 *   `DocumentsResult` lets the controller distinguish these in observability
 *   (`certificate_state: 'present' | 'absent' | 'degraded'` — SC-015).
 *
 * Partial-failure semantics (FR-010a / SC-014) are verified at the HTTP boundary
 * by the Playwright integration scenarios in
 * `apps/lfx-one/e2e/org-membership-documentation.spec.ts` (spec 019 T026
 * scenarios 5–7) using `page.route()` interception, since `lfx-v2-ui` does
 * not have a TypeScript unit-test runner configured.
 */
export class OrgLensDocumentsService {
  private static readonly agreementsSql = `
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
    FROM ANALYTICS_dev.lf_luis_PLATINUM_LFX_ONE.ORG_LENS_MEMBERSHIP_AGREEMENTS
    WHERE ACCOUNT_ID = ? AND FOUNDATION_ID = ?
    ORDER BY SIGNED_DATE DESC NULLS LAST, ASSET_ID
  `;

  // Spec 019 FR-010: TO_CHAR(TLF_MEMBER_SINCE, 'Mon YYYY') is computed at query
  // time and aliased as MEMBER_SINCE_FORMATTED so the BFF needs no TS-side
  // date formatting for the certificate subtitle.
  // LIMIT 1 is defensive — the dbt `unique` test on account_id guarantees
  // at-most-one row, but the LIMIT prevents a downstream break if a data-quality
  // drift introduces a duplicate before the next dbt test run catches it.
  private static readonly certificateSql = `
    SELECT
      ACCOUNT_NAME,
      MEMBERSHIP_TIER,
      CERTIFICATE_TITLE,
      CERTIFICATE_SUBTITLE,
      TLF_MEMBER_SINCE,
      TO_CHAR(TLF_MEMBER_SINCE, 'Mon YYYY') AS MEMBER_SINCE_FORMATTED,
      TIER_START_DATE,
      TIER_END_DATE,
      CERTIFICATE_DOWNLOAD_URL
    FROM ANALYTICS_dev.lf_luis_PLATINUM_LFX_ONE.ORG_LENS_TLF_CERTIFICATE
    WHERE ACCOUNT_ID = ?
    LIMIT 1
  `;

  private readonly snowflakeService: SnowflakeService;

  public constructor() {
    this.snowflakeService = SnowflakeService.getInstance();
  }

  public async getMembershipDocuments(req: Request, accountId: string, foundationId: string): Promise<DocumentsResult> {
    const agreementsQuery = this.snowflakeService.execute<RawAgreementRow>(OrgLensDocumentsService.agreementsSql, [accountId, foundationId]);
    const certificateQuery = this.snowflakeService.execute<RawCertificateRow>(OrgLensDocumentsService.certificateSql, [accountId]);

    const [agreementsResult, certificateResult] = await Promise.allSettled([agreementsQuery, certificateQuery]);

    // Agreements failure fails the whole tab (primary content).
    if (agreementsResult.status === 'rejected') {
      throw agreementsResult.reason;
    }

    // Defensive: the Snowflake SDK callback signature is `rows: any[] | undefined`,
    // so an empty/missing result here would otherwise throw on `.map` and surface
    // as a 500 instead of an empty agreements list.
    const agreementRows = agreementsResult.value.rows ?? [];
    const agreements: OrgMembershipAgreement[] = agreementRows.map((raw) => this.shapeAgreementRow(raw));

    // Certificate: degrade silently on failure (FR-010a) — log a warning, set
    // certificateTemplate to null, serve agreements normally. The UI's existing
    // @if (certificateTemplate()) guard hides the card without showing an error.
    let certificateTemplate: OrgMembershipCertificateTemplate | null = null;
    let certificateDegraded = false;

    if (certificateResult.status === 'rejected') {
      logger.warning(req, 'certificate_query_failed', 'TLF certificate query failed; degrading card silently', {
        account_id: accountId,
        err: certificateResult.reason,
      });
      certificateDegraded = true;
    } else {
      const certRows = certificateResult.value.rows ?? [];
      const certRow = certRows[0];
      certificateTemplate = certRow ? this.shapeCertificateRow(certRow) : null;
    }

    return {
      response: {
        accountId,
        foundationId,
        agreements,
        certificateTemplate,
      },
      certificateDegraded,
    };
  }

  private shapeAgreementRow(raw: RawAgreementRow): OrgMembershipAgreement {
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

  private shapeCertificateRow(raw: RawCertificateRow): OrgMembershipCertificateTemplate {
    return {
      title: raw.CERTIFICATE_TITLE,
      subtitle: raw.CERTIFICATE_SUBTITLE,
      membershipTier: raw.MEMBERSHIP_TIER,
      issuedTo: raw.ACCOUNT_NAME,
      memberSinceFormatted: raw.MEMBER_SINCE_FORMATTED,
      memberSinceDate: this.formatDate(raw.TLF_MEMBER_SINCE),
      downloadUrl: raw.CERTIFICATE_DOWNLOAD_URL,
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
