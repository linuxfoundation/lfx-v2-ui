// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
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

  // === Dummy Chart Data ===
  protected readonly quarterlyChartData: ChartData<'bar'> = {
    labels: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'],
    datasets: [
      {
        data: [6200, 6800, 7500, 8200],
        backgroundColor: lfxColors.blue[500],
        borderRadius: 4,
      },
    ],
  };

  protected readonly quarterlyChartOptions: ChartOptions<'bar'> = {
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
    datasets: {
      bar: { barPercentage: 0.7, categoryPercentage: 0.9 },
    },
  };

  protected readonly topEvents = [
    { name: 'KubeCon NA 2025', date: 'Nov 2025', attendees: 3200 },
    { name: 'Open Source Summit EU', date: 'Sep 2025', attendees: 1800 },
    { name: 'KubeCon EU 2025', date: 'Apr 2025', attendees: 1500 },
    { name: 'Linux Plumbers Conference', date: 'Aug 2025', attendees: 950 },
    { name: 'Open Source Summit NA', date: 'Jun 2025', attendees: 750 },
  ];

  protected onClose(): void {
    this.visible.set(false);
  }
}
