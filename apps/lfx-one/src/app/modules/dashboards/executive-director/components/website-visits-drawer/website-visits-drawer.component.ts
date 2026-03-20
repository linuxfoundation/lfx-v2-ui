// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, Signal } from '@angular/core';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { WebActivitiesSummaryResponse, MarketingRecommendedAction, MarketingKeyInsight } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-website-visits-drawer',
  imports: [DrawerModule, ChartComponent],
  templateUrl: './website-visits-drawer.component.html',
})
export class WebsiteVisitsDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<WebActivitiesSummaryResponse>({
    totalSessions: 0,
    totalPageViews: 0,
    domainGroups: [],
    dailyData: [],
    dailyLabels: [],
  });

  // === Dummy Data — TODO: Replace with AI-generated insights from Snowflake data ===
  protected readonly recommendedActions: MarketingRecommendedAction[] = [
    {
      title: 'Optimize top landing pages',
      description: 'Improve load time and CTAs on the 5 highest-traffic pages',
      priority: 'high',
      dueLabel: 'This week',
      iconClass: 'fa-light fa-gauge-high',
    },
    {
      title: 'Add UTM tracking to campaigns',
      description: 'Ensure all marketing links have proper UTM parameters',
      priority: 'medium',
      dueLabel: 'This month',
      iconClass: 'fa-light fa-link',
    },
  ];

  protected readonly keyInsights: MarketingKeyInsight[] = [
    { text: 'Driver: Organic search traffic up 18%', type: 'driver' },
    { text: 'Bounce rate increased on mobile devices', type: 'warning' },
    { text: '65% of traffic from 3 primary domains', type: 'info' },
  ];

  // === Computed Signals ===
  protected readonly trendChartData: Signal<ChartData<'line'>> = this.initTrendChartData();
  protected readonly domainChartData: Signal<ChartData<'bar'>> = this.initDomainChartData();

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
          label: (ctx) => ` ${(ctx.parsed.y ?? 0).toLocaleString()} sessions`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        border: { display: true, color: lfxColors.gray[300] },
        ticks: { color: lfxColors.gray[500], font: { size: 11 }, maxTicksLimit: 8 },
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
  };

  protected readonly domainChartOptions: ChartOptions<'bar'> = {
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
          label: (ctx) => ` ${(ctx.parsed.x ?? 0).toLocaleString()} sessions`,
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
            if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
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
      const { dailyData, dailyLabels } = this.data();
      return {
        labels: dailyLabels,
        datasets: [
          {
            data: dailyData,
            borderColor: lfxColors.blue[500],
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
          },
        ],
      };
    });
  }

  private initDomainChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const { domainGroups } = this.data();
      const sorted = [...domainGroups].sort((a, b) => b.totalSessions - a.totalSessions);
      return {
        labels: sorted.map((d) => d.domainGroup),
        datasets: [
          {
            data: sorted.map((d) => d.totalSessions),
            backgroundColor: [lfxColors.blue[700], lfxColors.blue[500], lfxColors.blue[400], lfxColors.blue[300], lfxColors.blue[200]],
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
            borderSkipped: 'start',
          },
        ],
      };
    });
  }
}
