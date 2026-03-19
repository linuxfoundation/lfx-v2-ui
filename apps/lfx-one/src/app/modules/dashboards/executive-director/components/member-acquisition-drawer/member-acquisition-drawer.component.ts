// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, Signal } from '@angular/core';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { MemberAcquisitionResponse, MarketingRecommendedAction, MarketingKeyInsight } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-member-acquisition-drawer',
  imports: [DrawerModule, ChartComponent],
  templateUrl: './member-acquisition-drawer.component.html',
})
export class MemberAcquisitionDrawerComponent {
  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly data = input<MemberAcquisitionResponse>({
    newMembersThisQuarter: 0,
    costPerAcquisition: 0,
    changePercentage: 0,
    trend: 'up',
    quarterlyData: [],
  });

  // === Dummy Data ===
  protected readonly recommendedActions: MarketingRecommendedAction[] = [
    {
      title: 'Optimize event-to-member conversion funnel',
      description: 'Event attendees convert at 3x the rate of website visitors — double down on event follow-ups',
      priority: 'high',
      dueLabel: 'This quarter',
      iconClass: 'fa-light fa-chart-line-up',
    },
    {
      title: 'Reduce CAC through referral program',
      description: 'Launch member referral incentives to lower cost per acquisition',
      priority: 'medium',
      dueLabel: 'Next quarter',
      iconClass: 'fa-light fa-handshake',
    },
  ];

  protected readonly keyInsights: MarketingKeyInsight[] = [
    { text: 'CAC decreased 21% over 4 quarters — marketing efficiency improving', type: 'driver' },
    { text: 'Q1 2026 is strongest acquisition quarter in 12 months', type: 'info' },
    { text: 'Events channel drives 45% of new member conversions', type: 'info' },
  ];

  // === Computed Signals ===
  protected readonly acquisitionChartData: Signal<ChartData<'bar'>> = this.initAcquisitionChartData();
  protected readonly cacChartData: Signal<ChartData<'line'>> = this.initCacChartData();

  protected readonly acquisitionChartOptions: ChartOptions<'bar'> = {
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
          label: (ctx) => ` ${ctx.parsed.y} new members`,
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
        ticks: { color: lfxColors.gray[500], font: { size: 11 } },
      },
    },
  };

  protected readonly cacChartOptions: ChartOptions<'line'> = {
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
          label: (ctx) => ` $${this.formatNumber(ctx.parsed.y ?? 0)} CAC`,
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
          callback: (value) => `$${Number(value).toLocaleString()}`,
        },
      },
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
  private initAcquisitionChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const { quarterlyData } = this.data();
      return {
        labels: quarterlyData.map((d) => d.quarter),
        datasets: [
          {
            data: quarterlyData.map((d) => d.newMembers),
            backgroundColor: lfxColors.blue[500],
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      };
    });
  }

  private initCacChartData(): Signal<ChartData<'line'>> {
    return computed(() => {
      const { quarterlyData } = this.data();
      return {
        labels: quarterlyData.map((d) => d.quarter),
        datasets: [
          {
            data: quarterlyData.map((d) => d.cac),
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
}
