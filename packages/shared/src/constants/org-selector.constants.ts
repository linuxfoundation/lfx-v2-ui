// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NAV_SEARCH_DEBOUNCE_MS } from './lens.constants';

/** Debounce for org-selector typeahead — kept in lockstep with the project-selector. */
export const ORG_SELECTOR_DEBOUNCE_MS = NAV_SEARCH_DEBOUNCE_MS;

/** Hard cap on the role-grants `per_page` (spec SC-005b); orgs beyond this fall to no-badge. */
export const ORG_ROLE_GRANTS_HARD_CAP = 500;

/** Spec 022 (FR-017) — page-through cap per direct-granted parent when paginating cascading children. */
export const ORG_CASCADING_CHILDREN_PER_PARENT_HARD_CAP = 500;

/** Max concurrent query-service pagination loops when fetching cascading children, to avoid bursting hundreds of in-flight requests. */
export const ORG_CASCADING_CHILDREN_FETCH_CONCURRENCY = 8;

/** NATS subject used by member-service to resolve UUID→SFID. */
export const ORG_SFID_LOOKUP_NATS_SUBJECT = 'lfx.member.uuid-to-sfid.lookup';

/** Timeout budget for a single UUID→SFID NATS request. */
export const ORG_SFID_LOOKUP_NATS_TIMEOUT_MS = 3000;

/** Case-encoding suffix alphabet used by Salesforce 15→18 id conversion. */
export const SALESFORCE_ID_SUFFIX_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

/** Process-wide LRU cap on uid↔sfid resolver caches (per direction). */
export const ORG_IDENTITY_CACHE_MAX_ENTRIES = 10_000;

/** TTL for uid↔sfid resolver cache entries — org renames are rare so 24h is safe. */
export const ORG_IDENTITY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
