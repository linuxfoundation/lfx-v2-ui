// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, DOCUMENT } from '@angular/common';
import { Component, computed, ElementRef, HostListener, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type { DocsArticle } from '@lfx-one/shared/interfaces';
import { map } from 'rxjs/operators';

import { DocsSearchComponent } from '../../components/docs-search/docs-search.component';
import { DocsManifestService } from '../../services/docs-manifest.service';

const DOCS_CANONICAL_ORIGIN = 'https://app.lfx.dev';
const DOCS_LINK_PREFIX = '/docs/';

/**
 * Renders one documentation article.
 *
 * Receives the resolved `DocsArticle` from `docsArticleResolver` via
 * `route.data['article']` (T027). The article body — already sanitized and
 * link-rewritten at build time — is bound via `[innerHTML]` inside a
 * `prose-lfx` container (research R12).
 *
 * SEO wiring (T028): `Title`, `Meta` (description, OG, Twitter card), and a
 * `<link rel="canonical">` pointing at the configured production origin
 * (`https://app.lfx.dev`) — applied in `ngOnInit` for SSR-correct head tags
 * (FR-013, FR-023). The canonical origin is intentionally hard-coded; any
 * future per-environment override would land as a runtime config value.
 *
 * Click interceptor (T028 / research R16): a host-level click listener
 * catches anchor activations whose `href` begins with `/docs/` and routes
 * them via `Router.navigateByUrl()` so internal cross-links navigate inside
 * the SPA without a full reload. External links and in-page anchors
 * (`#section`) fall through to the browser default. Modifier-key clicks
 * (cmd/ctrl/shift/alt) also fall through so "open in new tab" still works.
 */
@Component({
  selector: 'lfx-docs-article',
  standalone: true,
  imports: [RouterLink, DatePipe, DocsSearchComponent],
  templateUrl: './docs-article.component.html',
})
export class DocsArticleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly docsManifest = inject(DocsManifestService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Article resolved by `docsArticleResolver` — guaranteed non-null on a successful navigation. */
  protected readonly article = toSignal<DocsArticle | undefined>(this.route.data.pipe(map((d): DocsArticle | undefined => d['article'])), {
    initialValue: undefined,
  });

  /** Sibling articles in the same topic, denormalized for cheap renders. */
  protected readonly siblings = computed(() => {
    const a = this.article();
    if (!a) return [];
    return a.siblings.map((slug) => this.docsManifest.getArticle(slug)).filter((s): s is DocsArticle => Boolean(s));
  });

  public ngOnInit(): void {
    this.applyMetadata();
  }

  @HostListener('click', ['$event'])
  protected handleAnchorClick(event: MouseEvent): void {
    const anchor = this.findAnchor(event.target);
    if (!anchor) return;

    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith(DOCS_LINK_PREFIX)) {
      return;
    }
    if (anchor.target && anchor.target !== '_self') {
      return;
    }

    event.preventDefault();
    void this.router.navigateByUrl(href);
  }

  private findAnchor(target: EventTarget | null): HTMLAnchorElement | null {
    let node: Node | null = target instanceof Node ? target : null;
    const root = this.host.nativeElement;
    while (node && node !== root) {
      if (node instanceof HTMLAnchorElement) {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  private applyMetadata(): void {
    const a = this.article();
    if (!a) return;

    const canonical = `${DOCS_CANONICAL_ORIGIN}${a.url}`;
    this.title.setTitle(`${a.title} · LFX Self Serve Documentation`);
    this.meta.updateTag({ name: 'description', content: a.description });
    this.meta.updateTag({ property: 'og:title', content: a.title });
    this.meta.updateTag({ property: 'og:description', content: a.description });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    this.meta.updateTag({ name: 'twitter:title', content: a.title });
    this.meta.updateTag({ name: 'twitter:description', content: a.description });
    this.setCanonical(canonical);
  }

  private setCanonical(href: string): void {
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
