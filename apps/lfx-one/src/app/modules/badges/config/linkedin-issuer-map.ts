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
 * v1 seeds The Linux Foundation only. Sub-foundation IDs (CNCF, OpenSSF,
 * PyTorch, …) are an open question on LFXV2-1925 — populate as confirmed.
 */
export const LINKEDIN_ISSUER_ORG_IDS: Readonly<Record<string, number>> = {
  // TODO LFXV2-1925: confirm canonical LF organizationId from LinkedIn admin.
  'The Linux Foundation': 1004,
};
