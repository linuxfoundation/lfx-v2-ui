// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { MARKETING_SOCIAL_PLATFORM_MAP } from '@lfx-one/shared/constants';
import { formatNumber } from '@lfx-one/shared/utils';
import { DrawerModule } from 'primeng/drawer';

import type { BrandReachPlatformType, BrandReachResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-brand-reach-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, DrawerModule],
  templateUrl: './brand-reach-drawer.component.html',
  styleUrl: './brand-reach-drawer.component.scss',
})
export class BrandReachDrawerComponent {
  public readonly visible = model<boolean>(false);

  public readonly data = input<BrandReachResponse>({
    totalSocialFollowers: 0,
    totalMonthlySessions: 0,
    activePlatforms: 0,
    changePercentage: 0,
    trend: 'up',
    socialPlatforms: [],
    websiteDomains: [],
    dailyTrend: [],
  });

  protected readonly formatNumber = formatNumber;

  protected platformIcon(platform: BrandReachPlatformType): string {
    return MARKETING_SOCIAL_PLATFORM_MAP[platform]?.icon ?? 'fa-light fa-share-nodes';
  }

  protected platformColor(platform: BrandReachPlatformType): string {
    return MARKETING_SOCIAL_PLATFORM_MAP[platform]?.colorClass ?? 'text-gray-500';
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
