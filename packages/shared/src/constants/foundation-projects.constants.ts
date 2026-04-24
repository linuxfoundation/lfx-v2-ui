// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Maximum number of concurrent HTTP request subscriptions fired by the
 * foundation projects page. Each project issues 2 requests (committees +
 * mailing-lists), so this value caps concurrent request subscriptions, not
 * projects — a value of 8 keeps approximately 4 projects in flight at once.
 * Prevents large foundations (hundreds of projects) from flooding the BFF
 * with N × 2 simultaneous requests on initial load. Results accumulate
 * progressively — channel/group indicators light up row-by-row as each
 * project resolves.
 */
export const FOUNDATION_PROJECT_COUNT_FETCH_CONCURRENCY = 8;

/**
 * All valid presence-filter pill IDs on the foundation projects page, in
 * display order. Source of truth for the {@link PresencePill} type, which
 * is derived from this tuple — so adding or removing an ID here updates the
 * type automatically and keeps the runtime validator (`onPillChange`) in
 * sync with the TypeScript union.
 */
export const PRESENCE_PILL_IDS = ['all', 'with-groups', 'without-groups', 'with-channels', 'without-channels'] as const;
