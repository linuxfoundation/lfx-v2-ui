// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { afterNextRender, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { RoleGrantsResponse } from '@lfx-one/shared/interfaces';
import { catchError, map, Observable, of, tap } from 'rxjs';

/**
 * Caller's role persona for a single org row. Writer wins when the caller holds
 * both — the server-side flattening enforces this invariant (auditors[] excludes
 * any uid already in writers[]).
 */
export type OrgRolePersona = 'writer' | 'auditor';

/**
 * Client-side session dictionary of the caller's role grants across all
 * `b2b_org_settings` docs they have visibility into. Loaded eagerly on app
 * boot via `afterNextRender` so the sidebar visibility gate and the per-row
 * role badges have data ready by the time the sidebar mounts.
 *
 * Lifecycle (per spec FR-018a):
 * - Loaded once on app boot.
 * - GC'd on tab close / hard navigation (lifetime = `providedIn:'root'` instance).
 * - **No client-side token-refresh subscription** — the bearer token is
 *   refreshed server-side per-request by `express-openid-connect`
 *   (`apps/lfx-one/src/server/middleware/auth.middleware.ts`) and there is no
 *   client event to subscribe to. `refresh()` exists for future user-initiated
 *   triggers (out of scope here per research.md D-003).
 * - Stale grants between page loads are accepted UX trade-off: the badge is
 *   purely visual; FGA on writes remains authoritative.
 */
@Injectable({
  providedIn: 'root',
})
export class OrgRoleGrantsService {
  private readonly http = inject(HttpClient);

  private readonly writerSetInternal: WritableSignal<Set<string>> = signal<Set<string>>(new Set());
  private readonly auditorSetInternal: WritableSignal<Set<string>> = signal<Set<string>>(new Set());
  private readonly loadedInternal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly loadingInternal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly errorInternal: WritableSignal<string | null> = signal<string | null>(null);
  private readonly loadedAtMsInternal: WritableSignal<number | null> = signal<number | null>(null);

  public readonly writerSet: Signal<Set<string>> = this.writerSetInternal.asReadonly();
  public readonly auditorSet: Signal<Set<string>> = this.auditorSetInternal.asReadonly();
  public readonly loaded: Signal<boolean> = this.loadedInternal.asReadonly();
  public readonly loading: Signal<boolean> = this.loadingInternal.asReadonly();
  public readonly error: Signal<string | null> = this.errorInternal.asReadonly();
  public readonly loadedAtMs: Signal<number | null> = this.loadedAtMsInternal.asReadonly();

  public constructor() {
    // Eager load on browser hydration, parallel with persona enrichment.
    afterNextRender(() => {
      this.refresh().subscribe();
    });
  }

  /**
   * Re-fetch role grants. Idempotent — subsequent calls overwrite the signal
   * state with the freshest response. Returns an Observable so callers can
   * compose (e.g. forkJoin with persona refresh).
   */
  public refresh(): Observable<void> {
    this.loadingInternal.set(true);
    this.errorInternal.set(null);
    return this.http.get<RoleGrantsResponse>('/api/orgs/me/role-grants').pipe(
      tap((response) => {
        this.writerSetInternal.set(new Set(response.writers));
        this.auditorSetInternal.set(new Set(response.auditors));
        this.loadedInternal.set(true);
        this.loadingInternal.set(false);
        this.loadedAtMsInternal.set(Date.now());
      }),
      catchError((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.errorInternal.set(message);
        // Per the contract, the BFF already downgrades upstream failures to an
        // empty 200 response — so reaching this branch typically means a
        // local/network failure. Treat as empty grants so the sidebar
        // visibility gate falls back to the persona-seeds branch.
        this.writerSetInternal.set(new Set());
        this.auditorSetInternal.set(new Set());
        this.loadedInternal.set(true);
        this.loadingInternal.set(false);
        // loadedAtMs intentionally NOT set on the error path — it tracks the
        // last successful load so callers can distinguish "never loaded" /
        // "loaded but stale" / "load failed" without an extra signal.
        return of(undefined);
      }),
      map(() => undefined)
    );
  }
}
