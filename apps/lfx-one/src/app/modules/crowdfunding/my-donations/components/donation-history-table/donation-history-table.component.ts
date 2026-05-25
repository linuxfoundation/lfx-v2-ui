// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { MyDonation } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-donation-history-table',
  imports: [ButtonComponent, DatePipe],
  templateUrl: './donation-history-table.component.html',
  styleUrl: './donation-history-table.component.scss',
})
export class DonationHistoryTableComponent {
  public readonly items = input.required<MyDonation[]>();
  public readonly hasMore = input<boolean>(false);

  public readonly loadMore = output<void>();

  protected readonly displayItems = computed(() =>
    this.items().map((item) => ({ ...item, formattedAmount: this.formatAmount(item.amountCents) })),
  );

  protected onLoadMore(): void {
    this.loadMore.emit();
  }

  private formatAmount(cents: number): string {
    return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
}
