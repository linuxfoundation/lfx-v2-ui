// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { DomSanitizer, Meta, SafeHtml, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';

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

  readonly article = signal<DocArticle | null>(null);
  readonly loading = signal(true);
  readonly notFound = signal(false);
  readonly safeHtml = signal<SafeHtml>('');

  ngOnInit(): void {
    const section = this.route.snapshot.paramMap.get('section') ?? '';
    const topic = this.route.snapshot.paramMap.get('topic') ?? '';
    const slugParts = topic ? [section, topic] : [section];

    this.docsService.getArticle(slugParts).subscribe((data) => {
      this.loading.set(false);
      if (!data) {
        this.notFound.set(true);
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

  get githubEditUrl(): string {
    const art = this.article();
    if (!art) return '';
    const path = art.slug.join('/');
    return `https://github.com/linuxfoundation/lfx-self-serve/edit/main/docs/enduser/${path}/index.md`;
  }
}
