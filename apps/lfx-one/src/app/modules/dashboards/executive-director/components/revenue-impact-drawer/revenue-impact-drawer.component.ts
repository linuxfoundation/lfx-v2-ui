// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { DASHBOARD_TOOLTIP_CONFIG, lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { RevenueImpactResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-revenue-impact-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, ChartComponent, DecimalPipe, DrawerModule],
  templateUrl: './revenue-impact-drawer.component.html',
  styleUrl: './revenue-impact-drawer.component.scss',
})
export class RevenueImpactDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<RevenueImpactResponse>({
    pipelineInfluenced: 0,
    revenueAttributed: 0,
    matchRate: 0,
    changePercentage: 0,
    trend: 'up',
    attributionModels: { linear: 0, firstTouch: 0, lastTouch: 0 },
    engagementTypes: [],
    paidMedia: { roas: 0, impressions: 0, adSpend: 0, adRevenue: 0, monthlyTrend: [] },
    attributionChannels: [],
    projectBreakdown: [],
  });

  // === Computed Signals ===
  protected readonly paidMediaTrendChartData: Signal<ChartData<'bar'>> = this.initPaidMediaTrendChartData();
  protected readonly projectBreakdownChartData: Signal<ChartData<'bar'>> = this.initProjectBreakdownChartData();
  protected readonly projectBreakdownHeight: Signal<number> = computed(() => Math.max(160, this.data().projectBreakdown.length * 56));

  protected readonly paidMediaTrendChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { color: lfxColors.gray[700], font: { size: 11 }, boxWidth: 12, boxHeight: 12, padding: 12 },
      },
      tooltip: {
        ...DASHBOARD_TOOLTIP_CONFIG,
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label ?? '';
            const value = ctx.parsed.y ?? 0;
            if (label === 'ROAS') return ` ${label}: ${value.toFixed(2)}x`;
            return ` ${label}: $${value.toLocaleString()}`;
          },
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
        type: 'linear',
        position: 'left',
        display: true,
        grid: { color: lfxColors.gray[200], lineWidth: 1 },
        border: { display: false },
        title: { display: true, text: 'Spend ($)', color: lfxColors.gray[500], font: { size: 11 } },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          callback: (value) => `$${Number(value).toLocaleString()}`,
        },
      },
      y1: {
        type: 'linear',
        position: 'right',
        display: true,
        grid: { display: false },
        border: { display: false },
        title: { display: true, text: 'ROAS (x)', color: lfxColors.gray[500], font: { size: 11 } },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          callback: (value) => `${Number(value).toFixed(1)}x`,
        },
      },
    },
  };

  protected readonly projectBreakdownChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: { color: lfxColors.gray[700], font: { size: 11 }, boxWidth: 12, boxHeight: 12, padding: 12 },
      },
      tooltip: {
        ...DASHBOARD_TOOLTIP_CONFIG,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.x ?? 0).toLocaleString()} impressions`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        display: true,
        grid: { color: lfxColors.gray[200], lineWidth: 1 },
        border: { display: false },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          callback: (value) => {
            const n = Number(value);
            if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
            return n.toString();
          },
        },
      },
      y: {
        stacked: true,
        display: true,
        grid: { display: false },
        border: { display: true, color: lfxColors.gray[300] },
        ticks: { color: lfxColors.gray[700], font: { size: 11 } },
      },
    },
  };

  protected formatRevenue(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toLocaleString()}`;
  }

  protected formatChannelLabel(channel: string): string {
    return channel
      .split('_')
      .map((word) => (word === 'ads' ? 'Ads' : word.charAt(0).toUpperCase() + word.slice(1)))
      .join(' ');
  }

  protected onClose(): void {
    this.visible.set(false);
  }

  private initPaidMediaTrendChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const trend = this.data().paidMedia.monthlyTrend;
      const labels = trend.map((r) => {
        const d = new Date(r.month);
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      });
      return {
        labels,
        datasets: [
          {
            type: 'bar',
            label: 'Spend',
            data: trend.map((r) => r.spend),
            backgroundColor: lfxColors.blue[500],
            borderRadius: 4,
            yAxisID: 'y',
            order: 2,
          },
          {
            type: 'line' as const,
            label: 'ROAS',
            data: trend.map((r) => r.roas),
            borderColor: lfxColors.emerald[600],
            backgroundColor: lfxColors.emerald[600],
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: lfxColors.emerald[600],
            tension: 0.4,
            yAxisID: 'y1',
            order: 1,
          } as never,
        ],
      };
    });
  }

  private initProjectBreakdownChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const rows = this.data().projectBreakdown;
      if (rows.length === 0) {
        return { labels: [], datasets: [] };
      }
      const channelColors: Record<string, string> = {
        google_ads: lfxColors.blue[500],
        facebook_ads: lfxColors.blue[700],
        microsoft_ads: lfxColors.emerald[600],
        linkedin_ads: lfxColors.gray[700],
        reddit_ads: lfxColors.red[500],
      };
      const fallbackColor = lfxColors.gray[500];
      const channelSet = new Set<string>();
      rows.forEach((r) => Object.keys(r.channelImpressions).forEach((c) => channelSet.add(c)));
      const channels = Array.from(channelSet).sort(
        (a, b) => rows.reduce((sum, r) => sum + (r.channelImpressions[b] ?? 0), 0) - rows.reduce((sum, r) => sum + (r.channelImpressions[a] ?? 0), 0)
      );

      const labels = rows.map((r) => r.project);
      const datasets = channels.map((channel) => ({
        label: this.formatChannelLabel(channel),
        data: rows.map((r) => r.channelImpressions[channel] ?? 0),
        backgroundColor: channelColors[channel] ?? fallbackColor,
        borderRadius: 2,
        borderSkipped: false,
      }));

      return { labels, datasets };
    });
  }
}
