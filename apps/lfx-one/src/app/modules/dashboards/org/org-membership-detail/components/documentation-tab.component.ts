// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import type { OrgMembershipAgreement, OrgMembershipDocumentsResponse } from '@lfx-one/shared/interfaces';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, combineLatest, filter, of, switchMap, tap } from 'rxjs';

import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { OrgLensMembershipsService } from '@services/org-lens-memberships.service';

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

  private readonly service = inject(OrgLensMembershipsService);

  protected readonly retryTrigger = signal(0);
  protected readonly fetchLoading = signal(true);
  protected readonly fetchError = signal(false);

  protected readonly agreements = signal<OrgMembershipAgreement[]>([]);

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

  protected formatSignedDate(dateString: string): string {
    if (!dateString) return '—';
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return dateString;
    const [year, month, day] = parts as [number, number, number];
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private formatDateShort(dateString: string): string {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }
}
