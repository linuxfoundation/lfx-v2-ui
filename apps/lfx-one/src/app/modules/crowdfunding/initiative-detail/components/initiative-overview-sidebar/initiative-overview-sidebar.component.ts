// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { CardComponent } from '@components/card/card.component';
import { CROWDFUNDING_DONOR_AVATAR_PALETTE } from '@lfx-one/shared/constants';
import { CrowdfundingInitiativeDetail } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-initiative-overview-sidebar',
  imports: [CardComponent, AvatarComponent],
  templateUrl: './initiative-overview-sidebar.component.html',
  styleUrl: './initiative-overview-sidebar.component.scss',
})
export class InitiativeOverviewSidebarComponent {
  public readonly initiative = input.required<CrowdfundingInitiativeDetail>();
  public readonly viewAllFinancials = output<void>();

  protected readonly recentDonations = computed(() => {
    return this.initiative().donationsIn.slice(0, 5);
  });

  protected formatCurrency(value: number): string {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  }

  protected donorAvatarClass(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
    }
    return CROWDFUNDING_DONOR_AVATAR_PALETTE[Math.abs(hash) % CROWDFUNDING_DONOR_AVATAR_PALETTE.length];
  }
}
