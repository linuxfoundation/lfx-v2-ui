// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'lfx-brand-reach-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, ChartComponent, DrawerModule],
  templateUrl: './brand-reach-drawer.component.html',
  styleUrl: './brand-reach-drawer.component.scss',
})
export class BrandReachDrawerComponent {
  public readonly visible = model<boolean>(false);

  // === Dummy Data ===
  protected readonly socialPlatforms = [
    { name: 'LinkedIn', followers: '285K', icon: 'fa-brands fa-linkedin', color: 'text-blue-700' },
    { name: 'Twitter', followers: '120K', icon: 'fa-brands fa-x-twitter', color: 'text-gray-900' },
    { name: 'YouTube', followers: '69K', icon: 'fa-brands fa-youtube', color: 'text-red-600' },
  ];

  protected readonly websiteDomains = [
    { domain: 'linuxfoundation.org', sessions: '180K' },
    { domain: 'cncf.io', sessions: '95K' },
    { domain: 'lfx.linuxfoundation.org', sessions: '52K' },
    { domain: 'Other', sessions: '33K' },
  ];

  protected readonly dailyTrendData: ChartData<'line'> = {
    labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        data: [
          11200, 11800, 12400, 11900, 12800, 13200, 12600, 13800, 14100, 13500, 12900, 13600, 14200, 14800, 13900, 14500, 15100, 14600, 15300, 15800, 14900,
          15500, 16100, 15600, 16300, 16800, 15900, 16500, 17100, 16600,
        ],
        borderColor: lfxColors.blue[500],
        backgroundColor: `${lfxColors.blue[500]}20`,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };

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
