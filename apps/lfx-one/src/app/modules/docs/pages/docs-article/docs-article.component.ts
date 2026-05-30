// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { DocsManifestService } from '../../services/docs-manifest.service';

/**
 * Phase 2 stub. Phase 3 / US1 (T025) replaces the template with the brand-styled
 * article shell (`prose-lfx`), breadcrumbs, headings, sibling list, and the
 * SPA click-interceptor for in-content links (research R16). Title and
 * description metadata wiring (FR-003 / SC-002) lands in T028.
 */
@Component({
  selector: 'lfx-docs-article',
  standalone: true,
  imports: [RouterModule],
  template: `
    @if (article(); as a) {
      <h1 class="text-2xl font-semibold">{{ a.title }}</h1>
      @if (a.description) {
        <p class="mt-2 text-gray-600">{{ a.description }}</p>
      }
      <div class="mt-6 prose prose-lfx max-w-none" [innerHTML]="a.bodyHtml"></div>
    } @else {
      <p class="text-gray-500">Article not found.</p>
    }
  `,
})
export class DocsArticleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly docsManifest = inject(DocsManifestService);

  /** Slug of the article currently being rendered, derived from the route URL. */
  private readonly slug = toSignal(this.route.url, { initialValue: [] });

  protected readonly article = computed(() => {
    const slugStr = this.slug()
      .map((s) => s.path)
      .join('/');
    return this.docsManifest.getArticle(slugStr);
  });
}
