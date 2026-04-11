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
  selector: 'lfx-brand-health-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, ChartComponent, DecimalPipe, DrawerModule],
  templateUrl: './brand-health-drawer.component.html',
  styleUrl: './brand-health-drawer.component.scss',
})
export class BrandHealthDrawerComponent {
  public readonly visible = model<boolean>(false);

  // === Dummy Chart Data ===
  protected readonly mentionsTrendData: ChartData<'line'> = {
    labels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    datasets: [
      {
        data: [1800, 1950, 2100, 2200, 2300, 2400],
        borderColor: lfxColors.blue[500],
        backgroundColor: `${lfxColors.blue[500]}20`,
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: lfxColors.blue[500],
      },
    ],
  };

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

  protected readonly topProjects = [
    { name: 'Kubernetes', mentions: 680 },
    { name: 'Prometheus', mentions: 420 },
    { name: 'Envoy', mentions: 310 },
    { name: 'containerd', mentions: 280 },
    { name: 'Argo', mentions: 210 },
  ];

  protected onClose(): void {
    this.visible.set(false);
  }
}
