// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, Signal } from '@angular/core';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { EngagedCommunitySizeResponse, MarketingRecommendedAction, MarketingKeyInsight } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-engaged-community-drawer',
  imports: [DrawerModule, ChartComponent],
  templateUrl: './engaged-community-drawer.component.html',
})
export class EngagedCommunityDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<EngagedCommunitySizeResponse>({
    totalMembers: 0,
    changePercentage: 0,
    trend: 'up',
    breakdown: { newsletterSubscribers: 0, communityMembers: 0, workingGroupMembers: 0 },
    monthlyData: [],
  });

  // === Dummy Data — TODO: Replace with AI-generated insights from Snowflake data ===
  protected readonly recommendedActions: MarketingRecommendedAction[] = [
    {
      title: 'Launch cross-platform deduplication audit',
      description: 'Ensure member counts are accurate across newsletter, community, and WG lists',
      priority: 'high',
      dueLabel: 'This quarter',
      iconClass: 'fa-light fa-magnifying-glass-chart',
    },
    {
      title: 'Increase WG onboarding conversion',
      description: 'Newsletter subscribers who attend events are prime WG candidates',
      priority: 'medium',
      dueLabel: 'Next month',
      iconClass: 'fa-light fa-user-group',
    },
  ];

  protected readonly keyInsights: MarketingKeyInsight[] = [
    { text: 'Newsletter subscribers are the largest segment at 60% of total', type: 'driver' },
    { text: 'Working group membership growing fastest at 15% MoM', type: 'info' },
    { text: 'Community members have highest retention at 92%', type: 'info' },
  ];

  // === Computed Signals ===
  protected readonly trendChartData: Signal<ChartData<'line'>> = this.initTrendChartData();
  protected readonly breakdownChartData: Signal<ChartData<'bar'>> = this.initBreakdownChartData();

  protected readonly trendChartOptions: ChartOptions<'line'> = {
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
          label: (ctx) => ` ${this.formatNumber(ctx.parsed.y ?? 0)} members`,
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
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return String(num);
          },
        },
      },
    },
  };

  protected readonly breakdownChartOptions: ChartOptions<'bar'> = {
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
          label: (ctx) => ` ${this.formatNumber(ctx.parsed.x ?? 0)} members`,
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
          callback: (value) => {
            const num = Number(value);
            if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
            return String(num);
          },
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

  // === Protected Methods ===
  protected onClose(): void {
    this.visible.set(false);
  }

  protected formatNumber(num: number): string {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  }

  // === Private Initializers ===
  private initTrendChartData(): Signal<ChartData<'line'>> {
    return computed(() => {
      const { monthlyData } = this.data();
      return {
        labels: monthlyData.map((d) => d.month),
        datasets: [
          {
            data: monthlyData.map((d) => d.value),
            borderColor: lfxColors.blue[500],
            backgroundColor: `${lfxColors.blue[500]}1A`,
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: lfxColors.blue[500],
          },
        ],
      };
    });
  }

  private initBreakdownChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const { breakdown } = this.data();
      return {
        labels: ['Newsletter', 'Community', 'Working Groups'],
        datasets: [
          {
            data: [breakdown.newsletterSubscribers, breakdown.communityMembers, breakdown.workingGroupMembers],
            backgroundColor: [lfxColors.blue[700], lfxColors.blue[500], lfxColors.blue[300]],
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
            borderSkipped: 'start',
          },
        ],
      };
    });
  }
}
