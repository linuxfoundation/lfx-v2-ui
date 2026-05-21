// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input } from '@angular/core';
import { CardComponent } from '@components/card/card.component';
import { DonutChartComponent } from '@components/donut-chart/donut-chart.component';
import { AllocationItem, CrowdfundingInitiativeDetail, DonutRing } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-initiative-finance-summary',
  imports: [CardComponent, DonutChartComponent],
  templateUrl: './initiative-finance-summary.component.html',
  styleUrl: './initiative-finance-summary.component.scss',
})
export class InitiativeFinanceSummaryComponent {
  public readonly initiative = input.required<CrowdfundingInitiativeDetail>();

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

  protected allocRings(item: AllocationItem): DonutRing[] {
    const donatedPct = Math.min(100, item.pct);
    const spentPct = item.total > 0 ? Math.min(100, Math.round((item.spent / item.total) * 100)) : 0;
    return [
      { value: donatedPct, color: '#006BFF' },
      { value: spentPct, color: '#1e293b' },
    ];
  }
}
