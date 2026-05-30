// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { inject } from '@angular/core';
import { ResolveFn, Router, UrlSegment } from '@angular/router';
import type { DocsArticle } from '@lfx-one/shared/interfaces';

import { DocsManifestService } from '../services/docs-manifest.service';

/**
 * Functional resolver for `/docs/**` article routes.
 *
 * Reads the catch-all route segments, joins them into a slug, normalizes
 * (trim leading/trailing slashes, lowercase, collapse repeated slashes), and
 * looks up the corresponding `DocsArticle` via `DocsManifestService`.
 *
 * On hit: returns the article — `DocsArticleComponent` consumes it via
 * `route.snapshot.data['article']`.
 *
 * On miss: returns a `UrlTree` redirecting to `/docs/not-found`, so Angular
 * SSR matches the dedicated server route configured with `status: 404` in
 * `app.routes.server.ts` and serves the proper HTTP status to crawlers.
 *
 * URL normalization (FR / R: SC-008): trailing slash, mixed case, and
 * doubled slashes all resolve to the same canonical slug. The manifest is
 * generated lower-case so we lower-case the request side once here.
 */
export const docsArticleResolver: ResolveFn<DocsArticle> = (route) => {
  const router = inject(Router);
  const manifest = inject(DocsManifestService);

  const slug = normalizeSlug(route.url);
  const article = manifest.getArticle(slug);
  if (article) {
    return article;
  }

  // Miss → hand off to the static 404 server route. Returning a `UrlTree`
  // from a resolver tells Angular's router to navigate without firing a
  // separate request lifecycle.
  return router.parseUrl('/docs/not-found') as never;
};

function normalizeSlug(segments: UrlSegment[]): string {
  return segments
    .map((s) => s.path)
    .filter((p) => p.length > 0)
    .join('/')
    .toLowerCase()
    .replace(/^\/+|\/+$/g, '');
}
