// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input } from '@angular/core';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { CROWDFUNDING_DONOR_AVATAR_PALETTE } from '@lfx-one/shared/constants';
import { CrowdfundingInitiativeDetail } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-initiative-financials',
  imports: [AvatarComponent],
  templateUrl: './initiative-financials.component.html',
  styleUrl: './initiative-financials.component.scss',
})
export class InitiativeFinancialsComponent {
  public readonly initiative = input.required<CrowdfundingInitiativeDetail>();

  protected readonly totalReceived = computed(() => {
    return this.initiative().donationsIn.reduce((sum, d) => sum + d.amount, 0);
  });

  protected readonly totalExpenses = computed(() => {
    return this.initiative().donationsOut.reduce((sum, d) => sum + d.amount, 0);
  });

  protected readonly balance = computed(() => {
    return this.totalReceived() - this.totalExpenses();
  });

  protected donorAvatarClass(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
    }
    return CROWDFUNDING_DONOR_AVATAR_PALETTE[Math.abs(hash) % CROWDFUNDING_DONOR_AVATAR_PALETTE.length];
  }

  protected formatCurrency(value: number): string {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  }
}
