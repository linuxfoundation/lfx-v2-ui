// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import type { DocsSearchHit } from '@lfx-one/shared/interfaces';

import { DocsSearchService } from '../../services/docs-search.service';

/**
 * Reactive search box + result panel for the docs portal.
 *
 * Behaviour (research R5, FR-016/017/018/019/026/027):
 *   - Input is debounced 200 ms before hitting `DocsSearchService`.
 *   - Empty query → panel hidden, no work scheduled.
 *   - Non-empty query → panel shown; if results > 0 they render with title,
 *     breadcrumb-style topic chip, and a snippet; if results === 0 the
 *     no-results empty state surfaces (T041) with the queried term and a
 *     hint to browse the topic grid.
 *   - Keyboard (FR-026): ArrowDown / ArrowUp move the selection,
 *     Enter activates, Escape closes the panel and blurs.
 *   - ARIA (FR-027): listbox semantics, `aria-expanded`, `aria-controls`,
 *     option `aria-selected`, focus rings on the active option.
 *   - Outside click closes the panel without losing the query (returning to
 *     focus the input reopens it).
 *
 * SSR safety: `DocsSearchService.search` short-circuits to `[]` on the
 * server, so the component renders the input but never fetches the index
 * during SSR. The first browser-side query triggers the lazy fetch.
 */
@Component({
  selector: 'lfx-docs-search',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './docs-search.component.html',
})
export class DocsSearchComponent {
  private readonly searchService = inject(DocsSearchService);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly query = new FormControl<string>('', { nonNullable: true });
  protected readonly queryValue = toSignal(this.query.valueChanges, { initialValue: '' });
  protected readonly trimmedQuery = computed(() => this.queryValue().trim());

  protected readonly hits = signal<DocsSearchHit[]>([]);
  protected readonly searching = signal(false);
  protected readonly activeIndex = signal(-1);
  protected readonly panelOpen = signal(false);

  protected readonly hasQuery = computed(() => this.trimmedQuery().length > 0);
  protected readonly hasResults = computed(() => this.hits().length > 0);
  protected readonly listboxId = 'docs-search-listbox';

  public constructor() {
    this.query.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        switchMap((value) => {
          const trimmed = value.trim();
          if (trimmed.length === 0) {
            this.hits.set([]);
            this.searching.set(false);
            this.activeIndex.set(-1);
            this.panelOpen.set(false);
            return of([] as DocsSearchHit[]);
          }
          this.searching.set(true);
          this.panelOpen.set(true);
          return this.searchService.search(trimmed);
        }),
        takeUntilDestroyed()
      )
      .subscribe((results) => {
        this.hits.set(results);
        this.activeIndex.set(results.length > 0 ? 0 : -1);
        this.searching.set(false);
      });
  }

  protected onFocus(): void {
    if (this.hasQuery()) {
      this.panelOpen.set(true);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.panelOpen() && event.key !== 'Escape') return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveSelection(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveSelection(-1);
        break;
      case 'Enter': {
        const idx = this.activeIndex();
        const list = this.hits();
        if (idx >= 0 && idx < list.length) {
          event.preventDefault();
          this.activate(list[idx]);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.panelOpen.set(false);
        this.inputRef()?.nativeElement.blur();
        break;
    }
  }

  protected activate(hit: DocsSearchHit): void {
    this.panelOpen.set(false);
    this.query.setValue('', { emitEvent: false });
    this.hits.set([]);
    void this.router.navigateByUrl(hit.url);
  }

  protected hitOptionId(index: number): string {
    return `${this.listboxId}-opt-${index}`;
  }

  @HostListener('document:click', ['$event'])
  protected handleDocumentClick(event: MouseEvent): void {
    if (!this.panelOpen()) return;
    const target = event.target as Node | null;
    if (target && this.host.nativeElement.contains(target)) return;
    this.panelOpen.set(false);
  }

  private moveSelection(delta: number): void {
    const list = this.hits();
    if (list.length === 0) return;
    const next = (this.activeIndex() + delta + list.length) % list.length;
    this.activeIndex.set(next);
  }
}
