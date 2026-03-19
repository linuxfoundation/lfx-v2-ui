// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, Signal } from '@angular/core';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { MemberRetentionResponse, MarketingRecommendedAction, MarketingKeyInsight } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-member-retention-drawer',
  imports: [DrawerModule, ChartComponent],
  templateUrl: './member-retention-drawer.component.html',
})
export class MemberRetentionDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<MemberRetentionResponse>({
    renewalRate: 0,
    netRevenueRetention: 0,
    changePercentage: 0,
    trend: 'up',
    target: 85,
    monthlyData: [],
  });

  // === Dummy Data ===
  protected readonly recommendedActions: MarketingRecommendedAction[] = [
    {
      title: 'Engage at-risk members before renewal window',
      description: 'Members with <50% event attendance are 3x more likely to churn',
      priority: 'high',
      dueLabel: 'Ongoing',
      iconClass: 'fa-light fa-bell',
    },
    {
      title: 'Launch annual value report for members',
      description: 'Personalized ROI reports increase renewal rates by 12% in peer foundations',
      priority: 'medium',
      dueLabel: 'Next quarter',
      iconClass: 'fa-light fa-file-chart-column',
    },
  ];

  protected readonly keyInsights: MarketingKeyInsight[] = [
    { text: 'Renewal rate exceeds 85% target — on track for board commitment', type: 'driver' },
    { text: 'NRR above 100% indicates successful upsell to higher tiers', type: 'info' },
    { text: 'Steady upward trend over 6 months — no churn spikes detected', type: 'info' },
  ];

  // === Computed Signals ===
  protected readonly retentionChartData: Signal<ChartData<'line'>> = this.initRetentionChartData();

  protected readonly retentionChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: lfxColors.gray[900],
        bodyColor: lfxColors.gray[600],
        borderColor: lfxColors.gray[200],
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => ` ${(ctx.parsed.y ?? 0).toFixed(1)}% renewal rate`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        border: { display: true, color: lfxColors.gray[300] },
        ticks: { color: lfxColors.gray[500], font: { size: 11 } },
      },
      y: {
        display: true,
        grid: { color: lfxColors.gray[200], lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          callback: (value) => `${value}%`,
        },
      },
    },
  };

  // === Protected Methods ===
  protected onClose(): void {
    this.visible.set(false);
  }

  // === Private Initializers ===
  private initRetentionChartData(): Signal<ChartData<'line'>> {
    return computed(() => {
      const { monthlyData, target } = this.data();
      return {
        labels: monthlyData.map((d) => d.month),
        datasets: [
          {
            label: 'Renewal Rate',
            data: monthlyData.map((d) => d.value),
            borderColor: lfxColors.blue[500],
            backgroundColor: `${lfxColors.blue[500]}1A`,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: lfxColors.blue[500],
          },
          {
            label: 'Target',
            data: monthlyData.map(() => target),
            borderColor: lfxColors.gray[400],
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
          },
        ],
      };
    });
  }
}
