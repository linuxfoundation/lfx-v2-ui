// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NAV_SEARCH_DEBOUNCE_MS } from './lens.constants';

/**
 * Debounce window for the org-selector typeahead. Re-exported from the shared
 * NAV search debounce so the project-selector and org-selector remain in lockstep.
 */
export const ORG_SELECTOR_DEBOUNCE_MS = NAV_SEARCH_DEBOUNCE_MS;

/**
 * Soft absolute cap on the role-grants response per spec Q4 / SC-005b. The BFF
 * passes `per_page={cap}` to bound the upstream response — orgs beyond this cap
 * silently fall through to the no-badge path (FR-018).
 */
export const ORG_ROLE_GRANTS_HARD_CAP = 500;
