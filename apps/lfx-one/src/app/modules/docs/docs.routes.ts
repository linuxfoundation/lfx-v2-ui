// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

/**
 * Child route table for the public-facing user documentation portal.
 *
 * Routes:
 *   - `''`  → `DocsLandingComponent`  (`/docs` synthetic landing, FR-002)
 *   - `'**'` → `DocsArticleComponent`  (any nested slug, e.g. `/docs/meetings/schedule-meeting`)
 *
 * The article component reads its slug from `ActivatedRoute.url`. If the
 * slug doesn't resolve to a manifest entry, the article component renders
 * an empty state — Phase 3 (T023) wires a route resolver that swaps in
 * `DocsNotFoundComponent` and returns HTTP 404 from SSR (FR-007).
 *
 * Lazy-loaded via `loadComponent` so the article + landing chunks stay out
 * of the main browser bundle until a `/docs/**` URL is activated.
 */
export const DOCS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/docs-landing/docs-landing.component').then((m) => m.DocsLandingComponent),
  },
  {
    path: '**',
    loadComponent: () => import('./pages/docs-article/docs-article.component').then((m) => m.DocsArticleComponent),
  },
];
