// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, output, Signal } from '@angular/core';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { CardComponent } from '@components/card/card.component';
import { CROWDFUNDING_DONOR_AVATAR_PALETTE } from '@lfx-one/shared/constants';
import { InitiativeDetail, RecentDonation } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-initiative-overview-sidebar',
  imports: [CardComponent, AvatarComponent],
  templateUrl: './initiative-overview-sidebar.component.html',
  styleUrl: './initiative-overview-sidebar.component.scss',
})
export class InitiativeOverviewSidebarComponent {
  public readonly initiative = input.required<InitiativeDetail>();
  public readonly viewAllFinancials = output<void>();

  protected readonly recentDonationsWithMeta = this.initRecentDonationsWithMeta();

  private initRecentDonationsWithMeta(): Signal<(RecentDonation & { formattedAmount: string; avatarClass: string })[]> {
    return computed(() =>
      (this.initiative().recentDonations ?? [])
        .slice(0, 5)
        .map((d) => ({
          ...d,
          formattedAmount: this.formatCurrency(d.amountCents / 100),
          avatarClass: this.donorAvatarClass(d.donorName),
        }))
    );
  }

  private formatCurrency(value: number): string {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  }

  private donorAvatarClass(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
    }
    return CROWDFUNDING_DONOR_AVATAR_PALETTE[Math.abs(hash) % CROWDFUNDING_DONOR_AVATAR_PALETTE.length];
  }
}
