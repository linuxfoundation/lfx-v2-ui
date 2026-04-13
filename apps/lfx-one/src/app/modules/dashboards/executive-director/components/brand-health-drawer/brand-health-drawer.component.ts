// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { hexToRgba } from '@lfx-one/shared/utils';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { BrandHealthResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-brand-health-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, ChartComponent, DecimalPipe, DrawerModule],
  templateUrl: './brand-health-drawer.component.html',
  styleUrl: './brand-health-drawer.component.scss',
})
export class BrandHealthDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<BrandHealthResponse>({
    totalMentions: 0,
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    sentimentMomChangePp: 0,
    trend: 'up',
    monthlyMentions: [],
    topProjects: [],
  });

  // === Computed Signals ===
  protected readonly mentionsTrendData: Signal<ChartData<'line'>> = computed(() => {
    const { monthlyMentions } = this.data();
    return {
      labels: monthlyMentions.map((d) => d.month),
      datasets: [
        {
          data: monthlyMentions.map((d) => d.value),
          borderColor: lfxColors.blue[500],
          backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: lfxColors.blue[500],
        },
      ],
    };
  });

  protected readonly mentionsTrendOptions: ChartOptions<'line'> = {
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
        ticks: { color: lfxColors.gray[500], font: { size: 11 } },
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
            if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
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
