// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, Signal } from '@angular/core';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { CROWDFUNDING_DONOR_AVATAR_PALETTE } from '@lfx-one/shared/constants';
import { DonationRecord, ExpenseRecord, InitiativeDetail } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-initiative-financials',
  imports: [AvatarComponent],
  templateUrl: './initiative-financials.component.html',
  styleUrl: './initiative-financials.component.scss',
})
export class InitiativeFinancialsComponent {
  public readonly initiative = input.required<InitiativeDetail>();

  protected readonly formattedTotalReceived = computed(() => this.formatCurrency((this.initiative().financialSummary?.totalReceivedCents ?? 0) / 100));
  protected readonly formattedTotalExpenses = computed(() => this.formatCurrency((this.initiative().financialSummary?.totalExpensesCents ?? 0) / 100));
  protected readonly formattedBalance = computed(() => this.formatCurrency((this.initiative().financialSummary?.balanceCents ?? 0) / 100));
  protected readonly donationRecordsWithMeta = this.initDonationRecordsWithMeta();
  protected readonly expenseRecordsWithMeta = this.initExpenseRecordsWithMeta();

  private initDonationRecordsWithMeta(): Signal<(DonationRecord & { formattedAmount: string; avatarClass: string })[]> {
    return computed(() =>
      (this.initiative().donationRecords ?? []).map((d) => ({
        ...d,
        formattedAmount: this.formatCurrency(d.amountCents / 100),
        avatarClass: this.donorAvatarClass(d.supporterName),
      }))
    );
  }

  private initExpenseRecordsWithMeta(): Signal<(ExpenseRecord & { formattedAmount: string })[]> {
    return computed(() =>
      (this.initiative().expenseRecords ?? []).map((d) => ({
        ...d,
        formattedAmount: this.formatCurrency(d.amountCents / 100),
      }))
    );
  }

  private donorAvatarClass(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
    }
    return CROWDFUNDING_DONOR_AVATAR_PALETTE[Math.abs(hash) % CROWDFUNDING_DONOR_AVATAR_PALETTE.length];
  }

  private formatCurrency(value: number): string {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  }
}
