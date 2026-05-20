// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Maps badge issuer (organization name as it appears on the Credly badge)
 * to its LinkedIn organization ID, used by the "Add to profile" deep link.
 *
 * When an issuer is present here, the deep link uses `organizationId=<id>` so
 * LinkedIn renders the verified org logo. When absent, the deep link falls back
 * to `organizationName=<issuer>` — LinkedIn shows the free-text name without
 * org-page linkage but the rest of the prefill still works.
 *
 * v1 ships with the map empty so we don't bake in unverified organization IDs.
 * The fallback to `organizationName` covers every issuer correctly today. Once
 * the canonical LinkedIn organizationId is confirmed for The Linux Foundation
 * (and sub-foundations like CNCF / OpenSSF / PyTorch), populate this map per
 * LFXV2-1925.
 *
 * Typed as Partial<Record> because indexing returns `number | undefined` —
 * unknown issuers must not type-check as `number`.
 */
export const LINKEDIN_ISSUER_ORG_IDS: Readonly<Partial<Record<string, number>>> = {
  // TODO LFXV2-1925: populate once canonical org IDs are confirmed in LinkedIn admin.
};
