// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { MARKETING_SOCIAL_PLATFORM_MAP } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { BrandReachResponse, BrandReachSocialPlatform } from '@lfx-one/shared/interfaces';

interface SocialPlatformView extends BrandReachSocialPlatform {
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'lfx-brand-reach-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, DecimalPipe, DrawerModule],
  templateUrl: './brand-reach-drawer.component.html',
  styleUrl: './brand-reach-drawer.component.scss',
})
export class BrandReachDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
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

  // === Computed Signals ===
  protected readonly socialPlatformViews: Signal<SocialPlatformView[]> = computed(() =>
    this.data().socialPlatforms.map((platform) => {
      const presentation = MARKETING_SOCIAL_PLATFORM_MAP[platform.platformType] ?? MARKETING_SOCIAL_PLATFORM_MAP.other;
      return {
        ...platform,
        icon: presentation.icon,
        colorClass: presentation.colorClass,
      };
    })
  );

  protected onClose(): void {
    this.visible.set(false);
  }
}
