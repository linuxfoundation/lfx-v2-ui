// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, Signal } from '@angular/core';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { EmailCtrResponse, MarketingRecommendedAction, MarketingKeyInsight } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-email-ctr-drawer',
  imports: [DrawerModule, ChartComponent],
  templateUrl: './email-ctr-drawer.component.html',
})
export class EmailCtrDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<EmailCtrResponse>({
    currentCtr: 0,
    changePercentage: 0,
    trend: 'up',
    monthlyData: [],
    monthlyLabels: [],
    campaignGroups: [],
    monthlySends: [],
    monthlyOpens: [],
  });

  // === Dummy Data — TODO: Replace with AI-generated insights from Snowflake data ===
  protected readonly recommendedActions: MarketingRecommendedAction[] = [
    {
      title: 'Improve call-to-action clarity',
      description: 'Test prominent, action-oriented CTAs in next campaign',
      priority: 'high',
      dueLabel: 'Next send',
      iconClass: 'fa-light fa-bullseye-pointer',
    },
    {
      title: 'Segment by audience type',
      description: 'Personalize content for different member tiers',
      priority: 'medium',
      dueLabel: 'This month',
      iconClass: 'fa-light fa-users',
    },
  ];

  protected readonly keyInsights: MarketingKeyInsight[] = [
    { text: 'Driver: Newsletter engagement ↓', type: 'driver' },
    { text: 'CTR ↓12% vs last period', type: 'warning' },
    { text: 'Clicks concentrated on 2–3 primary links', type: 'info' },
  ];

  // === Computed Signals ===
  protected readonly chartData: Signal<ChartData<'bar'>> = this.initChartData();
  protected readonly campaignChartData: Signal<ChartData<'bar'>> = this.initCampaignChartData();
  protected readonly reachVsOpensChartData: Signal<ChartData<'bar'>> = this.initReachVsOpensChartData();

  protected readonly chartOptions: ChartOptions<'bar'> = {
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
          label: (ctx) => ` ${(ctx.parsed.y ?? 0).toFixed(2)}% CTR`,
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
    datasets: {
      bar: { barPercentage: 0.7, categoryPercentage: 0.9 },
    },
  };

  protected readonly campaignChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
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
          label: (ctx) => ` ${(ctx.parsed.x ?? 0).toFixed(2)}% CTR`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { color: lfxColors.gray[200], lineWidth: 1 },
        border: { display: true, color: lfxColors.gray[300] },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          callback: (value) => `${value}%`,
        },
      },
      y: {
        display: true,
        grid: { display: false },
        border: { display: false },
        ticks: { color: lfxColors.gray[600], font: { size: 12 } },
      },
    },
    datasets: {
      bar: { barPercentage: 0.8, categoryPercentage: 1.0 },
    },
  };

  protected readonly reachVsOpensChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: { color: lfxColors.gray[600], font: { size: 11 }, boxWidth: 12, padding: 16 },
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        titleColor: lfxColors.gray[900],
        bodyColor: lfxColors.gray[600],
        borderColor: lfxColors.gray[200],
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toLocaleString()}`,
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
          callback: (value) => {
            const num = Number(value);
            if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return String(num);
          },
        },
      },
    },
    datasets: {
      bar: { barPercentage: 0.7, categoryPercentage: 0.9 },
    },
  };

  // === Protected Methods ===
  protected onClose(): void {
    this.visible.set(false);
  }

  // === Private Initializers ===
  private initChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const { monthlyData, monthlyLabels } = this.data();
      return {
        labels: monthlyLabels,
        datasets: [
          {
            data: monthlyData,
            backgroundColor: lfxColors.blue[500],
            borderRadius: 4,
          },
        ],
      };
    });
  }

  private initCampaignChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const { campaignGroups } = this.data();
      const sorted = [...campaignGroups].sort((a, b) => b.avgCtr - a.avgCtr);
      return {
        labels: sorted.map((c) => c.campaignName),
        datasets: [
          {
            data: sorted.map((c) => c.avgCtr),
            backgroundColor: [lfxColors.blue[700], lfxColors.blue[500], lfxColors.blue[400], lfxColors.blue[300], lfxColors.blue[200]],
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
            borderSkipped: 'start',
          },
        ],
      };
    });
  }

  private initReachVsOpensChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const { monthlySends, monthlyOpens, monthlyLabels } = this.data();
      return {
        labels: monthlyLabels,
        datasets: [
          {
            label: 'Reach (Sends)',
            data: monthlySends,
            backgroundColor: lfxColors.blue[500],
            borderRadius: 4,
          },
          {
            label: 'Opens',
            data: monthlyOpens,
            backgroundColor: lfxColors.blue[300],
            borderRadius: 4,
          },
        ],
      };
    });
  }
}
