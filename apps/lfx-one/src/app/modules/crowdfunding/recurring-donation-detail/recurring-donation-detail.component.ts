// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Subject } from 'rxjs';
import { concatMap, filter, map, scan, startWith, switchMap } from 'rxjs/operators';

import { CrowdfundingTransaction, RecurringDonation, RecurringDonationsResponse } from '@lfx-one/shared/interfaces';
import { DEFAULT_CROWDFUNDING_PAGE_SIZE } from '@lfx-one/shared/constants';
import { CrowdfundingService } from '@app/shared/services/crowdfunding.service';
import { ButtonComponent } from '@components/button/button.component';
import { RecurringDonationInitiativeHeaderComponent } from './components/recurring-donation-initiative-header/recurring-donation-initiative-header.component';
import { RecurringDonationSubscriptionSummaryComponent } from './components/recurring-donation-subscription-summary/recurring-donation-subscription-summary.component';
import { RecurringDonationChargeHistoryComponent } from './components/recurring-donation-charge-history/recurring-donation-charge-history.component';

const EMPTY_CHARGE_HISTORY_STATE = { items: [] as CrowdfundingTransaction[], hasMore: false };

@Component({
  selector: 'lfx-recurring-donation-detail',
  imports: [
    ButtonComponent,
    RecurringDonationInitiativeHeaderComponent,
    RecurringDonationSubscriptionSummaryComponent,
    RecurringDonationChargeHistoryComponent,
  ],
  templateUrl: './recurring-donation-detail.component.html',
  styleUrl: './recurring-donation-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringDonationDetailComponent {
  // ─── Private Injections ───────────────────────────────────────────────────
  private readonly route = inject(ActivatedRoute);
  private readonly crowdfundingService = inject(CrowdfundingService);

  // ─── Pagination Driver ────────────────────────────────────────────────────
  private readonly loadMore$ = new Subject<void>();

  // ─── Complex Signals ──────────────────────────────────────────────────────
  protected readonly donationId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id') ?? '')), { initialValue: '' });
  protected readonly donation: Signal<RecurringDonation | null | undefined> = this.initDonation();
  private readonly chargeHistoryState: Signal<{ items: CrowdfundingTransaction[]; hasMore: boolean }> = this.initChargeHistory();
  protected readonly chargeHistory = computed(() => this.chargeHistoryState().items);
  protected readonly chargeHistoryHasMore = computed(() => this.chargeHistoryState().hasMore);

  // ─── Protected Methods ────────────────────────────────────────────────────
  protected onChangeAmount(): void {
    // TODO: open change amount dialog
  }

  protected onPauseDonation(): void {
    // TODO: call pause API
  }

  protected onResumeDonation(): void {
    // TODO: call resume API
  }

  protected onCancelDonation(): void {
    // TODO: call cancel API
  }

  protected onLoadMore(): void {
    this.loadMore$.next();
  }

  // ─── Private Initializers ─────────────────────────────────────────────────
  private initDonation(): Signal<RecurringDonation | null | undefined> {
    return toSignal(
      toObservable(this.donationId).pipe(
        filter((id) => !!id),
        switchMap((id) => this.crowdfundingService.getMyRecurringDonations().pipe(map((res: RecurringDonationsResponse) => res.data.find((d) => d.id === id))))
      ),
      { initialValue: null }
    );
  }

  private initChargeHistory(): Signal<{ items: CrowdfundingTransaction[]; hasMore: boolean }> {
    return toSignal(
      toObservable(this.donation).pipe(
        filter((d): d is RecurringDonation => !!d),
        map((d) => d.initiativeSlug),
        switchMap((slug) =>
          this.loadMore$.pipe(
            startWith(undefined as void),
            scan((page) => page + 1, -1),
            concatMap((page) =>
              this.crowdfundingService.getInitiativeTransactions(slug, {
                type: 'donations',
                kind: 'recurring',
                size: DEFAULT_CROWDFUNDING_PAGE_SIZE,
                from: page * DEFAULT_CROWDFUNDING_PAGE_SIZE,
              })
            ),
            scan(
              (acc, res) => ({
                items: [...acc.items, ...res.data],
                hasMore: acc.items.length + res.data.length < res.totalCount,
              }),
              EMPTY_CHARGE_HISTORY_STATE
            )
          )
        )
      ),
      { initialValue: EMPTY_CHARGE_HISTORY_STATE }
    );
  }
}
