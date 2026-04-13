// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';

import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { EventGrowthResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-event-growth-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, ChartComponent, DecimalPipe, DrawerModule],
  templateUrl: './event-growth-drawer.component.html',
  styleUrl: './event-growth-drawer.component.scss',
})
export class EventGrowthDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<EventGrowthResponse>({
    totalAttendees: 0,
    totalEvents: 0,
    totalRevenue: 0,
    revenuePerAttendee: 0,
    attendeeMomChange: 0,
    revenueMomChange: 0,
    trend: 'up',
    monthlyData: [],
    topEvents: [],
  });

  // === Computed Signals ===
  protected readonly formattedRevenue = computed(() => {
    const rev = this.data().totalRevenue;
    if (rev >= 1_000_000) return `$${(rev / 1_000_000).toFixed(1)}M`;
    if (rev >= 1_000) return `$${(rev / 1_000).toFixed(1)}K`;
    return `$${rev.toLocaleString()}`;
  });

  protected readonly monthlyChartData: Signal<ChartData<'bar'>> = computed(() => {
    const { monthlyData } = this.data();
    const quarterLabels = monthlyData.map((d) => {
      const [year, month] = d.month.split('-');
      const qi = Math.ceil(Number(month) / 3);
      return `Q${qi} ${year}`;
    });
    return {
      labels: quarterLabels,
      datasets: [
        {
          data: monthlyData.map((d) => d.value),
          backgroundColor: lfxColors.blue[500],
          borderRadius: 4,
          barPercentage: 0.6,
        },
      ],
    };
  });

  protected readonly monthlyChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
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

  protected formatEventRevenue(revenue: number): string {
    if (revenue >= 1_000_000) return `$${(revenue / 1_000_000).toFixed(1)}M`;
    if (revenue >= 1_000) return `$${(revenue / 1_000).toFixed(1)}K`;
    return `$${revenue.toLocaleString()}`;
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
