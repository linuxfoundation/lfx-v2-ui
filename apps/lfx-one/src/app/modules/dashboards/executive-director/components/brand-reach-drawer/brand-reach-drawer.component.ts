// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors, MARKETING_SOCIAL_PLATFORM_MAP } from '@lfx-one/shared/constants';
import { hexToRgba } from '@lfx-one/shared/utils';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { BrandReachResponse, BrandReachSocialPlatform } from '@lfx-one/shared/interfaces';

interface SocialPlatformView extends BrandReachSocialPlatform {
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'lfx-brand-reach-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, ChartComponent, DecimalPipe, DrawerModule],
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

  protected readonly dailyTrendData: Signal<ChartData<'line'>> = computed(() => {
    const { dailyTrend } = this.data();
    return {
      labels: dailyTrend.map((d) => d.day),
      datasets: [
        {
          data: dailyTrend.map((d) => d.sessions),
          borderColor: lfxColors.blue[500],
          backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  });

  protected readonly dailyTrendOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true, mode: 'index', intersect: false },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          maxTicksLimit: 6,
        },
      },
      y: {
        display: true,
        grid: { color: lfxColors.gray[200], lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          callback: (value) => {
            const num = Number(value);
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return String(num);
          },
        },
      },
    },
  };

  protected onClose(): void {
    this.visible.set(false);
  }
}
