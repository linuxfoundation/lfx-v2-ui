// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, Meta, SafeHtml, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';

import { DocArticle, DocsService } from '../services/docs.service';

@Component({
  selector: 'lfx-docs-article',
  imports: [RouterLink],
  templateUrl: './docs-article.component.html',
  styleUrl: './docs-article.component.scss',
})
export class DocsArticleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly docsService = inject(DocsService);
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  public readonly article = signal<DocArticle | null>(null);
  public readonly loading = signal(true);
  public readonly notFound = signal(false);
  public readonly safeHtml = signal<SafeHtml | null>(null);

  public ngOnInit(): void {
    // Subscribe to paramMap (not snapshot) so navigating between /docs/a and
    // /docs/b reuses this component instance and reloads the correct article.
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const section = params.get('section') ?? '';
          const topic = params.get('topic') ?? '';
          const slugParts = topic ? [section, topic] : [section];
          this.loading.set(true);
          this.notFound.set(false);
          // Clear stale content immediately so the old article body never
          // co-renders with a subsequent "not found" state (or blank state).
          this.article.set(null);
          this.safeHtml.set(null);
          return this.docsService.getArticle(slugParts);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) {
          this.notFound.set(true);
          this.titleService.setTitle('Article not found — LFX Self Serve Help');
          return;
        }
        this.article.set(data);
        // Server has already sanitized the HTML via DOMPurify; bypassSecurityTrustHtml is safe here.
        this.safeHtml.set(this.sanitizer.bypassSecurityTrustHtml(data.html));
        this.titleService.setTitle(`${data.frontmatter.title} — LFX Self Serve Help`);
        this.metaService.updateTag({ name: 'description', content: data.frontmatter.description });
        this.metaService.updateTag({ property: 'og:title', content: data.frontmatter.title });
        this.metaService.updateTag({ property: 'og:description', content: data.frontmatter.description });

        if (isPlatformBrowser(this.platformId)) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
  }

  public get githubEditUrl(): string {
    const art = this.article();
    if (!art) return '';
    const path = art.slug.join('/');
    return `https://github.com/linuxfoundation/lfx-self-serve/edit/main/docs/enduser/${path}/index.md`;
  }
}
