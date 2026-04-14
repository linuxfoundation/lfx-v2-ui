// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { formatNumber } from '@lfx-one/shared/utils';
import { DrawerModule } from 'primeng/drawer';

import type { RevenueImpactResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-revenue-impact-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, DrawerModule],
  templateUrl: './revenue-impact-drawer.component.html',
  styleUrl: './revenue-impact-drawer.component.scss',
})
export class RevenueImpactDrawerComponent {
  public readonly visible = model<boolean>(false);

  public readonly data = input<RevenueImpactResponse>({
    pipelineInfluenced: 0,
    revenueAttributed: 0,
    matchRate: 0,
    changePercentage: 0,
    trend: 'up',
    attributionModels: { linear: 0, firstTouch: 0, lastTouch: 0 },
    engagementTypes: [],
    paidMedia: { roas: 0, impressions: 0, adSpend: 0, adRevenue: 0 },
  });

  protected readonly formatNumber = formatNumber;

  protected formatCurrency(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
