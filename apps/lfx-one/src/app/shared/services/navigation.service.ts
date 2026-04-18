// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { LENS_DEFAULT_ROUTES, NAV_SEARCH_DEBOUNCE_MS } from '@lfx-one/shared/constants';
import { LensItem, LensItemsResponse, LensPage, NavLens } from '@lfx-one/shared/interfaces';
import { lensItemToProjectContext } from '@lfx-one/shared/utils';
import { MessageService } from 'primeng/api';
import { catchError, debounceTime, distinctUntilChanged, EMPTY, filter, map, merge, Observable, of, scan, skip, Subject, switchMap, tap } from 'rxjs';

import { LensService } from './lens.service';
import { ProjectContextService } from './project-context.service';

/** Per-lens internal state container — one entry per foundation/project lens */
interface LensState {
  searchTerm: WritableSignal<string>;
  items: Signal<LensItem[]>;
  loading: WritableSignal<boolean>;
  loaded: WritableSignal<boolean>;
  nextPageToken: WritableSignal<string | null>;
  hasMore: Signal<boolean>;
  bypassActive: WritableSignal<boolean>;
  personaFetchFailed: WritableSignal<boolean>;
  loadMore$: Subject<string>;
  reload$: Subject<void>;
  // Flipped true when resetAndReload fires; consumed inside the fetch pipeline so the
  // default selection is applied once per reload, regardless of subscription timing.
  pendingDefaultSelection: WritableSignal<boolean>;
}

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private readonly http = inject(HttpClient);
  private readonly lensService = inject(LensService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  private readonly foundationState: LensState = this.createLensState('foundation');
  private readonly projectState: LensState = this.createLensState('project');

  // Singleton-level preload: fire resetAndReload whenever the active lens becomes
  // foundation/project. The default-selection is handled INSIDE the fetch pipeline
  // (via pendingDefaultSelection flag) rather than by subscribing to items here —
  // this avoids an SSR race where the items signal could populate synchronously
  // from transfer-state before any external subscriber is ready to observe it.
  private readonly activeLensPreloader = toSignal(
    toObservable(this.lensService.activeLens).pipe(
      map((lens): NavLens | null => (lens === 'foundation' || lens === 'project' ? lens : null)),
      distinctUntilChanged(),
      filter((lens): lens is NavLens => lens !== null),
      tap((lens) => this.resetAndReload(lens))
    ),
    { initialValue: null }
  );

  public items(lens: NavLens): Signal<LensItem[]> {
    return this.getState(lens).items;
  }

  public loading(lens: NavLens): Signal<boolean> {
    return this.getState(lens).loading;
  }

  /** Flips true after the first API response for this lens lands (success, empty, or graceful failure). */
  public loaded(lens: NavLens): Signal<boolean> {
    return this.getState(lens).loaded;
  }

  public hasMore(lens: NavLens): Signal<boolean> {
    return this.getState(lens).hasMore;
  }

  public searchTerm(lens: NavLens): WritableSignal<string> {
    return this.getState(lens).searchTerm;
  }

  public bypassActive(lens: NavLens): Signal<boolean> {
    return this.getState(lens).bypassActive;
  }

  public personaFetchFailed(lens: NavLens): Signal<boolean> {
    return this.getState(lens).personaFetchFailed;
  }

  /** Updates the search term; the debounced pipeline will reset and refetch page 1 */
  public setSearchTerm(lens: NavLens, term: string): void {
    this.getState(lens).searchTerm.set(term);
  }

  /** Appends one more page (used by the UI intersection observer) — does NOT auto-loop */
  public loadNextPage(lens: NavLens): void {
    const state = this.getState(lens);
    const token = state.nextPageToken();
    if (!token || state.loading()) {
      return;
    }
    state.loadMore$.next(token);
  }

  /** Clears state and refetches page 1 with the current search term (used when lens becomes visible) */
  public resetAndReload(lens: NavLens): void {
    const state = this.getState(lens);
    state.pendingDefaultSelection.set(true);
    state.reload$.next();
  }

  private getState(lens: NavLens): LensState {
    return lens === 'foundation' ? this.foundationState : this.projectState;
  }

  /**
   * Reconcile the per-lens selection against the fresh API response.
   * Empty items → clear selection. Otherwise always select the first item — the API
   * response is the source of truth, not any previous in-session selection.
   */
  private applyDefaultSelection(lens: NavLens, page: LensPage): void {
    if (page.items.length === 0) {
      if (lens === 'foundation') {
        this.projectContextService.clearFoundation();
      } else {
        this.projectContextService.clearProject();
      }
      this.handleEmptyLensResponse(lens, page);
      return;
    }

    const context = lensItemToProjectContext(page.items[0]);
    if (lens === 'foundation') {
      this.projectContextService.setFoundation(context);
    } else {
      this.projectContextService.setProject(context);
    }
  }

  /**
   * When the nav API returns zero items for a lens the user just navigated to, we can't
   * render anything meaningful — bounce them to the Me lens and surface the reason:
   * - upstream failure (persona or query) → "we couldn't load your data"
   * - otherwise (user genuinely has no persona access) → "you don't have access"
   */
  private handleEmptyLensResponse(lens: NavLens, page: LensPage): void {
    const upstreamFailure = page.upstreamFailed || page.personaFetchFailed;
    const toast = upstreamFailure
      ? { severity: 'error', summary: 'Unable to load', detail: 'We were unable to load your data. Please try again in a moment.' }
      : {
          severity: 'info',
          summary: 'No access',
          detail: `You do not have access to any ${lens === 'foundation' ? 'foundations' : 'projects'}.`,
        };

    this.messageService.add(toast);
    this.lensService.setLens('me');
    this.router.navigate([LENS_DEFAULT_ROUTES.me]);
  }

  private createLensState(lens: NavLens): LensState {
    const searchTerm = signal<string>('');
    const loading = signal<boolean>(false);
    const loaded = signal<boolean>(false);
    const nextPageToken = signal<string | null>(null);
    const bypassActive = signal<boolean>(false);
    const personaFetchFailed = signal<boolean>(false);
    const pendingDefaultSelection = signal<boolean>(false);
    const loadMore$ = new Subject<string>();
    const reload$ = new Subject<void>();

    const items = this.initItems(
      lens,
      searchTerm,
      loading,
      loaded,
      nextPageToken,
      bypassActive,
      personaFetchFailed,
      pendingDefaultSelection,
      loadMore$,
      reload$
    );
    const hasMore = computed(() => nextPageToken() !== null);

    return { searchTerm, items, loading, loaded, nextPageToken, hasMore, bypassActive, personaFetchFailed, pendingDefaultSelection, loadMore$, reload$ };
  }

  private initItems(
    lens: NavLens,
    searchTerm: WritableSignal<string>,
    loading: WritableSignal<boolean>,
    loaded: WritableSignal<boolean>,
    nextPageToken: WritableSignal<string | null>,
    bypassActive: WritableSignal<boolean>,
    personaFetchFailed: WritableSignal<boolean>,
    pendingDefaultSelection: WritableSignal<boolean>,
    loadMore$: Subject<string>,
    reload$: Subject<void>
  ): Signal<LensItem[]> {
    // toObservable replays the current signal value on subscription. skip(1) prevents
    // that initial replay from firing a fetch at service-instantiation time — fetches
    // should only happen on genuine user-driven search input.
    const searchTriggered$ = toObservable(searchTerm).pipe(skip(1), debounceTime(NAV_SEARCH_DEBOUNCE_MS), distinctUntilChanged());

    // Manual reload (e.g. popover open) triggers a reset-and-fetch using the current search term
    const reloadTriggered$ = reload$.pipe(map(() => searchTerm()));

    const firstPage$: Observable<LensPage> = merge(searchTriggered$, reloadTriggered$).pipe(
      switchMap((term) => this.fetchSinglePage(lens, term, null, loading, true))
    );

    const nextPage$: Observable<LensPage> = loadMore$.pipe(switchMap((token) => this.fetchSinglePage(lens, searchTerm(), token, loading, false)));

    return toSignal(
      merge(firstPage$, nextPage$).pipe(
        tap((page) => {
          nextPageToken.set(page.nextPageToken);
          bypassActive.set(page.bypassActive);
          personaFetchFailed.set(page.personaFetchFailed);
          loaded.set(true);
          // Apply default selection once per reload cycle, in the same tap where we
          // see the fresh response — guarantees it fires regardless of subscription timing.
          if (page.reset && pendingDefaultSelection()) {
            pendingDefaultSelection.set(false);
            this.applyDefaultSelection(lens, page);
          }
        }),
        scan((acc: LensItem[], page: LensPage) => (page.reset ? page.items : [...acc, ...page.items]), [])
      ),
      { initialValue: [] as LensItem[] }
    );
  }

  /**
   * Fetches one page from the backend. The server applies persona filtering and
   * accumulates upstream pages until it has enough filtered items, so a single
   * client request returns a populated page.
   */
  private fetchSinglePage(lens: NavLens, term: string, pageToken: string | null, loading: WritableSignal<boolean>, reset: boolean): Observable<LensPage> {
    loading.set(true);
    return this.fetchPage(lens, term, pageToken).pipe(
      map((response) => this.toLensPage(response, reset)),
      tap(() => loading.set(false)),
      catchError(() => {
        // On fetch failure, drop through to an empty reset page so the server-side
        // degraded-state flow (toast + redirect to Me lens) can kick in via applyDefaultSelection.
        // Non-reset (scroll-triggered) failures are silent — the existing items stay put.
        loading.set(false);
        if (reset) {
          return of<LensPage>({ items: [], nextPageToken: null, bypassActive: false, personaFetchFailed: false, upstreamFailed: true, reset: true });
        }
        return EMPTY;
      })
    );
  }

  private fetchPage(lens: NavLens, term: string, pageToken: string | null): Observable<LensItemsResponse> {
    let params = new HttpParams().set('lens', lens);
    if (pageToken) {
      params = params.set('page_token', pageToken);
    }
    if (term.trim()) {
      params = params.set('name', term.trim());
    }
    return this.http.get<LensItemsResponse>('/api/nav/lens-items', { params });
  }

  private toLensPage(response: LensItemsResponse, reset: boolean): LensPage {
    return {
      items: response.items,
      nextPageToken: response.next_page_token,
      bypassActive: response.bypass_active,
      personaFetchFailed: response.persona_fetch_failed,
      upstreamFailed: response.upstream_failed,
      reset,
    };
  }
}
