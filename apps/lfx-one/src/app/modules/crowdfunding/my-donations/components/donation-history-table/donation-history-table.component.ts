// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, input, signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { MyDonation } from '@lfx-one/shared/interfaces';

const PAGE_SIZE = 10;

@Component({
  selector: 'lfx-donation-history-table',
  imports: [ButtonComponent, DatePipe],
  templateUrl: './donation-history-table.component.html',
  styleUrl: './donation-history-table.component.scss',
})
export class DonationHistoryTableComponent {
  public readonly items = input.required<MyDonation[]>();

  protected readonly visibleCount = signal(PAGE_SIZE);
  protected readonly visibleItems = computed(() =>
    this.items()
      .slice(0, this.visibleCount())
      .map((item) => ({ ...item, formattedAmount: this.formatAmount(item.amountCents) })),
  );
  protected readonly hasMore = computed(() => this.visibleCount() < this.items().length);

  protected loadMore(): void {
    this.visibleCount.update((n) => n + PAGE_SIZE);
  }

  private formatAmount(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}
