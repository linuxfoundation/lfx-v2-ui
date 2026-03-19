// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, Signal } from '@angular/core';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { FlywheelConversionResponse, MarketingRecommendedAction, MarketingKeyInsight } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-flywheel-conversion-drawer',
  imports: [DrawerModule, ChartComponent],
  templateUrl: './flywheel-conversion-drawer.component.html',
})
export class FlywheelConversionDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<FlywheelConversionResponse>({
    conversionRate: 0,
    changePercentage: 0,
    trend: 'up',
    funnel: { eventAttendees: 0, convertedToNewsletter: 0, convertedToCommunity: 0, convertedToWorkingGroup: 0 },
    monthlyData: [],
  });

  // === Dummy Data ===
  protected readonly recommendedActions: MarketingRecommendedAction[] = [
    {
      title: 'Add post-event newsletter CTA to all event follow-ups',
      description: 'Only 16% of attendees currently receive a newsletter signup prompt',
      priority: 'high',
      dueLabel: 'This month',
      iconClass: 'fa-light fa-envelope-circle-check',
    },
    {
      title: 'Create WG landing pages for top 5 events',
      description: 'Direct attendees to relevant working groups based on event topic',
      priority: 'medium',
      dueLabel: 'Next quarter',
      iconClass: 'fa-light fa-browser',
    },
  ];

  protected readonly keyInsights: MarketingKeyInsight[] = [
    { text: 'Newsletter is the highest conversion path at 16.2% of attendees', type: 'driver' },
    { text: 'WG conversion lowest — attendees need clearer path to participate', type: 'warning' },
    { text: 'Conversion rate trending up 5.7% — flywheel is accelerating', type: 'info' },
  ];

  // === Computed Signals ===
  protected readonly trendChartData: Signal<ChartData<'line'>> = this.initTrendChartData();
  protected readonly funnelChartData: Signal<ChartData<'bar'>> = this.initFunnelChartData();

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
          label: (ctx) => ` ${(ctx.parsed.y ?? 0).toFixed(1)}% conversion rate`,
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

  protected readonly funnelChartOptions: ChartOptions<'bar'> = {
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
          label: (ctx) => ` ${this.formatNumber(ctx.parsed.x ?? 0)} people`,
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

  private initFunnelChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const { funnel } = this.data();
      return {
        labels: ['Event Attendees', 'Converted to Newsletter', 'Converted to Community', 'Converted to WG'],
        datasets: [
          {
            data: [funnel.eventAttendees, funnel.convertedToNewsletter, funnel.convertedToCommunity, funnel.convertedToWorkingGroup],
            backgroundColor: [lfxColors.blue[700], lfxColors.blue[500], lfxColors.blue[400], lfxColors.blue[300]],
            borderRadius: { topLeft: 0, bottomLeft: 0, topRight: 4, bottomRight: 4 },
            borderSkipped: 'start',
          },
        ],
      };
    });
  }
}
