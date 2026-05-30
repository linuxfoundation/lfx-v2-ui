// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import type { DocsArticle, DocsManifest, DocsTaxonomyNode, DocsTopic } from '@lfx-one/shared/interfaces';

import { docsManifest } from '../generated/docs-manifest';

/**
 * Synchronous, SSR-safe view onto the build-time-generated docs manifest.
 *
 * The underlying manifest is a typed TypeScript module emitted by
 * `apps/lfx-one/scripts/build-docs.mjs` at build time (research R8). It's
 * imported synchronously here so SSR can resolve any `/docs/**` request
 * without async I/O — and the runtime cost is exactly one object lookup per
 * route activation.
 *
 * NOTE: Importing `docs-manifest.ts` from the (gitignored) `generated/`
 * directory is intentional. The TypeScript compiler resolves the path at
 * build time; if the file is missing (e.g. someone hasn't run `yarn
 * docs:build` yet), the build fails with a clear "module not found" — better
 * than a runtime crash deep in route activation.
 */
@Injectable({ providedIn: 'root' })
export class DocsManifestService {
  private readonly manifest: DocsManifest = docsManifest;

  /** Returns the full manifest. Used by the landing page and any taxonomy UI. */
  public getManifest(): DocsManifest {
    return this.manifest;
  }

  /**
   * Resolves a route URL fragment (e.g. `'meetings/schedule-meeting'`) to its
   * article, or `undefined` when no article matches. The empty slug `''`
   * resolves to the synthetic root landing.
   */
  public getArticle(slug: string): DocsArticle | undefined {
    return this.manifest.articles[slug];
  }

  /** Returns the canonical taxonomy tree, root-first. */
  public getTaxonomy(): DocsTaxonomyNode {
    return this.manifest.tree;
  }

  /** Returns topics in canonical display order. */
  public getTopics(): DocsTopic[] {
    return this.manifest.topics;
  }
}
