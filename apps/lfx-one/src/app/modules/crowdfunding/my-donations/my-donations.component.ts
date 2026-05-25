// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '@environments/environment';
import { MyDonation, DonationStats, PaymentMethod, RecurringDonation } from '@lfx-one/shared/interfaces';
import { map } from 'rxjs';
import { CrowdfundingService } from '@app/shared/services/crowdfunding.service';
import { MOCK_DONATION_STATS, MOCK_PAYMENT_METHODS, MOCK_RECURRING_DONATIONS } from '../crowdfunding.mock';
import { DonationsStatsBarComponent } from './components/donations-stats-bar/donations-stats-bar.component';
import { DonationHistoryTableComponent } from './components/donation-history-table/donation-history-table.component';
import { PaymentMethodsComponent } from './components/payment-methods/payment-methods.component';
import { RecurringDonationsListComponent } from './components/recurring-donations-list/recurring-donations-list.component';

@Component({
  selector: 'lfx-my-donations',
  imports: [DonationsStatsBarComponent, RecurringDonationsListComponent, DonationHistoryTableComponent, PaymentMethodsComponent],
  templateUrl: './my-donations.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyDonationsComponent {
  private readonly crowdfundingService = inject(CrowdfundingService);

  protected readonly crowdfundingUrl = environment.urls.crowdfunding;
  protected readonly stats = signal<DonationStats>(MOCK_DONATION_STATS);
  protected readonly recurringDonations = signal<RecurringDonation[]>(MOCK_RECURRING_DONATIONS);
  protected readonly donationHistory = toSignal(
    this.crowdfundingService.getMyDonations().pipe(map((res) => res.data)),
    { initialValue: [] as MyDonation[] },
  );
  protected readonly paymentMethods = signal<PaymentMethod[]>(MOCK_PAYMENT_METHODS);
  protected readonly cancelledCount = signal(4);

  protected onViewCancelled(): void {
    // TODO: navigate to cancelled donations view
  }

  protected onChangeAmount(donation: RecurringDonation): void {
    // TODO: open change amount dialog for donation
    void donation;
  }

  protected onPauseDonation(donation: RecurringDonation): void {
    // TODO: call pause API for donation
    void donation;
  }

  protected onResumeDonation(donation: RecurringDonation): void {
    // TODO: call resume API for donation
    void donation;
  }

  protected onCancelDonation(donation: RecurringDonation): void {
    // TODO: call cancel API for donation
    void donation;
  }

  protected onRemoveCard(card: PaymentMethod): void {
    // TODO: call remove card API
    void card;
  }
}
