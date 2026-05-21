// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, output } from '@angular/core';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { ButtonComponent } from '@components/button/button.component';
import {
  CROWDFUNDING_FUND_TYPE_AVATAR_CLASSES,
  CROWDFUNDING_FUND_TYPE_COLOR_CLASSES,
  CROWDFUNDING_FUND_TYPE_ICONS,
  CROWDFUNDING_FUND_TYPE_LABELS,
} from '@lfx-one/shared/constants';
import { CrowdfundingInitiativeDetail } from '@lfx-one/shared/interfaces';

interface TabOption {
  id: string;
  label: string;
}

@Component({
  selector: 'lfx-initiative-detail-header',
  imports: [AvatarComponent, CardComponent, TagComponent, ButtonComponent],
  templateUrl: './initiative-detail-header.component.html',
  styleUrl: './initiative-detail-header.component.scss',
})
export class InitiativeDetailHeaderComponent {
  public readonly initiative = input.required<CrowdfundingInitiativeDetail>();
  public readonly activeTab = input.required<string>();
  public readonly tabChange = output<string>();

  protected readonly tabOptions: TabOption[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'announcements', label: 'Announcements' },
  ];

  protected readonly fundTypeLabel = computed(() => CROWDFUNDING_FUND_TYPE_LABELS[this.initiative().fundType]);
  protected readonly fundTypeIcon = computed(() => CROWDFUNDING_FUND_TYPE_ICONS[this.initiative().fundType]);
  protected readonly fundTypeColorClass = computed(() => CROWDFUNDING_FUND_TYPE_COLOR_CLASSES[this.initiative().fundType]);
  protected readonly avatarStyleClass = computed(() => CROWDFUNDING_FUND_TYPE_AVATAR_CLASSES[this.initiative().fundType]);

  protected readonly progressPercent = computed(() => {
    const { raised, goal } = this.initiative();
    if (!goal || goal === 0) return 0;
    return Math.min(100, Math.round((raised / goal) * 100));
  });

  protected formatCurrency(value: number): string {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  }
}
