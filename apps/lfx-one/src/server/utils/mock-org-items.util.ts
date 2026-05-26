// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Local-dev opt-in for the spec 020 org-selector surface. When the env var
 * `MOCK_ORG_ITEMS` is set to the literal string `'true'` or `'1'` AND we are
 * NOT running in production, the BFF serves
 * `apps/lfx-one/src/server/services/fixtures/org-selector.mock.json` for all
 * three routes (`/api/nav/org-items`, `/api/orgs/me/role-grants`, and the
 * polymorphic canonical-record endpoint) and bypasses LFX_V2_SERVICE entirely.
 *
 * Other truthy-looking values (`'yes'`, `'on'`, `'TRUE'`, …) are intentionally
 * rejected so the flip is unambiguous in dev and the gate fails closed.
 *
 * Hard-gated on `NODE_ENV !== 'production'` so a stray env var in prod cannot
 * bypass FGA / member-service and serve fixture data to end users.
 */
export const isMockOrgItemsEnabled = (): boolean => {
  if (process.env['NODE_ENV'] === 'production') return false;
  const value = process.env['MOCK_ORG_ITEMS'];
  return value === 'true' || value === '1';
};
