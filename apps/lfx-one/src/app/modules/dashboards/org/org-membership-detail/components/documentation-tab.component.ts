// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { Component, computed, inject, input, PLATFORM_ID, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { OrgMembershipAgreement, OrgMembershipDocumentsResponse } from '@lfx-one/shared/interfaces';
import { TooltipModule } from 'primeng/tooltip';
import { parseLocalDateString } from '@lfx-one/shared/utils';
import { catchError, combineLatest, filter, of, switchMap, tap } from 'rxjs';

import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { OrgLensMembershipsService } from '@services/org-lens-memberships.service';

import { buildAgreementsCsv } from './documentation-tab.utils';

type PageState = 'loading' | 'error' | 'ready';

@Component({
  selector: 'lfx-documentation-tab',
  standalone: true,
  imports: [CardComponent, EmptyStateComponent, TooltipModule],
  templateUrl: './documentation-tab.component.html',
})
export class DocumentationTabComponent {
  public readonly accountId = input.required<string>();
  public readonly foundationId = input.required<string>();
  public readonly membershipTier = input.required<string>();
  public readonly orgName = input.required<string>();
  public readonly memberSince = input<string | null>(null);

  /**
   * Spec 018 FR-024-ext (round 2): required for the CSV export "Foundation" column
   * (FR-032a col 2). Parent passes `f.foundationName` from its `foundation()` signal.
   */
  public readonly foundationName = input.required<string>();
  /**
   * Spec 018 FR-024-ext (round 2) / FR-034a: optional slug for the CSV filename
   * (`membership-agreements-{slug}-{YYYYMMDD}.csv`). When null, `onDownloadAll`
   * falls back to a sanitized `foundationId` per FR-034a.
   */
  public readonly foundationSlug = input<string | null>(null);

  private readonly service = inject(OrgLensMembershipsService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly retryTrigger = signal(0);
  protected readonly fetchLoading = signal(true);
  protected readonly fetchError = signal(false);

  protected readonly agreements = signal<OrgMembershipAgreement[]>([]);

  /** View-model: agreements with the signed date pre-formatted so the template stays pure. */
  protected readonly displayAgreements = computed(() =>
    this.agreements().map((agreement) => ({
      ...agreement,
      formattedSignedDate: this.formatSignedDate(agreement.signedDate),
    }))
  );

  private readonly accountId$ = toObservable(this.accountId);
  private readonly foundationId$ = toObservable(this.foundationId);
  private readonly retryTrigger$ = toObservable(this.retryTrigger);

  private readonly docs$ = combineLatest([
    this.accountId$.pipe(filter((id): id is string => !!id)),
    this.foundationId$.pipe(filter((id): id is string => !!id)),
    this.retryTrigger$,
  ]).pipe(
    tap(() => {
      this.fetchLoading.set(true);
      this.fetchError.set(false);
    }),
    switchMap(([accountId, foundationId]) =>
      this.service.getMembershipDocuments(accountId, foundationId).pipe(
        catchError(() => {
          this.fetchError.set(true);
          this.fetchLoading.set(false);
          return of(null);
        })
      )
    ),
    tap((response) => {
      this.fetchLoading.set(false);
      if (response) {
        this.agreements.set(response.agreements);
      }
    })
  );

  protected readonly docsData = toSignal<OrgMembershipDocumentsResponse | null>(this.docs$, { initialValue: null });

  protected readonly pageState = computed<PageState>(() => {
    if (this.fetchLoading()) return 'loading';
    if (this.fetchError()) return 'error';
    if (!this.docsData()) return 'loading';
    return 'ready';
  });

  protected readonly certificateTitle = computed(() => `Linux Foundation ${this.membershipTier()} Certificate`);

  protected readonly certificateSubtitle = computed(() => {
    const since = this.memberSince();
    const sinceFormatted = since ? this.formatDateShort(since) : '—';
    return `Member since ${sinceFormatted} · Issued to ${this.orgName()}`;
  });

  protected retry(): void {
    this.retryTrigger.update((v) => v + 1);
  }

  /**
   * Spec 018 FR-032 / FR-034 / FR-034a: client-side CSV download of all loaded
   * agreements for this (account, foundation). Pure client-side — no extra
   * network request. Early-returns when the list is empty (FR-033).
   *
   * Filename pattern: `membership-agreements-{foundationSlug || sanitizedFoundationId}-{YYYYMMDD}.csv`
   * (kebab-case, lowercase, sortable date prefix).
   */
  protected onDownloadAll(): void {
    // SSR guard: this method touches `Blob`, `URL`, and `document` — all
    // browser-only globals. Bail early during server-side rendering.
    if (!isPlatformBrowser(this.platformId)) return;

    const rows = this.displayAgreements();
    if (!rows.length) return;

    const csv = buildAgreementsCsv(rows, this.orgName(), this.foundationName());
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const slug = this.foundationSlug() ?? this.sanitizedFoundationIdForFilename();
    const filename = `membership-agreements-${slug}-${yyyymmdd}.csv`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Spec 018 FR-034a defensive fallback: when `foundationSlug` input is null,
   * derive a filesystem-safe segment from `foundationId` by lowercasing and
   * replacing any character that is not `[a-z0-9-]` with `-`.
   */
  private sanitizedFoundationIdForFilename(): string {
    return this.foundationId()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
  }

  private formatSignedDate(dateString: string): string {
    if (!dateString) return '—';
    try {
      return parseLocalDateString(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  private formatDateShort(dateString: string): string {
    if (!dateString) return '—';
    try {
      return parseLocalDateString(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  }
}
