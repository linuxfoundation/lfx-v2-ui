// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Public URL prefix for the documentation portal. Every article URL is
 * composed as `DOCS_ROUTE_PREFIX + '/' + slug` (or just `DOCS_ROUTE_PREFIX`
 * for the synthetic root landing).
 */
export const DOCS_ROUTE_PREFIX = '/docs';

/**
 * Canonical display order for top-level docs topics on the landing page,
 * breadcrumbs, and any taxonomy-driven UI. This ordering overrides any
 * per-topic front-matter ordering: the build pipeline assigns
 * `DocsTopic.displayOrder` from this list's index.
 *
 * Topics not in this list (e.g. a future addition under `docs/user/` whose
 * slug isn't yet recognized) are appended in alphabetical order with display
 * orders starting at `DOCS_TAXONOMY_ORDER.length`, so the build never fails
 * just because a new topic shows up — but the ordering is no longer
 * guaranteed for that topic until the constant is updated.
 */
export const DOCS_TAXONOMY_ORDER: readonly string[] = [
  'badges',
  'committees',
  'dashboards',
  'documents',
  'events',
  'mailing-lists',
  'meetings',
  'profile',
  'settings',
  'surveys',
  'trainings',
  'transactions',
  'votes',
] as const;
