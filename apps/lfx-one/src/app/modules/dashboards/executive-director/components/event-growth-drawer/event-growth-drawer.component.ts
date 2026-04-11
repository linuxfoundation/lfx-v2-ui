// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { hexToRgba } from '@lfx-one/shared/utils';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'lfx-event-growth-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, ChartComponent, DecimalPipe, DrawerModule],
  templateUrl: './event-growth-drawer.component.html',
  styleUrl: './event-growth-drawer.component.scss',
})
export class EventGrowthDrawerComponent {
  public readonly visible = model<boolean>(false);

  // === Dummy Chart Data (last 6 months) ===
  protected readonly monthlyChartData: ChartData<'line'> = {
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        data: [5200, 5800, 6400, 7100, 7500, 8200],
        borderColor: lfxColors.blue[500],
        backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: lfxColors.blue[500],
      },
    ],
  };

  protected readonly monthlyChartOptions: ChartOptions<'line'> = {
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

  protected readonly topEvents = [
    { name: 'KubeCon NA 2025', date: 'Nov 2025', attendees: 3200, revenue: 4800000 },
    { name: 'KubeCon EU 2026', date: 'Apr 2026', attendees: 1500, revenue: 1900000 },
    { name: 'Open Source Summit NA', date: 'Mar 2026', attendees: 1200, revenue: 1400000 },
    { name: 'Linux Plumbers Conference', date: 'Feb 2026', attendees: 950, revenue: 680000 },
    { name: 'Cloud Native Security Con', date: 'Jan 2026', attendees: 750, revenue: 520000 },
  ];

  protected onClose(): void {
    this.visible.set(false);
  }
}
