// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Maximum concurrent per-project count fetches fired by the foundation
 * projects page. Caps the burst for large foundations (hundreds of projects)
 * so the BFF is not flooded by N × 2 in-flight requests on initial load.
 * Results accumulate progressively — channel/group indicators light up
 * row-by-row as each project resolves.
 */
export const FOUNDATION_PROJECT_COUNT_FETCH_CONCURRENCY = 8;
