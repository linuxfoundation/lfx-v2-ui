// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, Signal } from '@angular/core';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { MemberAcquisitionResponse, MemberRetentionResponse, MarketingRecommendedAction, MarketingKeyInsight } from '@lfx-one/shared/interfaces';

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

  public readonly retentionData = input<MemberRetentionResponse>({
    renewalRate: 0,
    netRevenueRetention: 0,
    changePercentage: 0,
    trend: 'up',
    target: 85,
    monthlyData: [],
  });

  // === Computed Signals ===
  protected readonly formattedCostPerAcquisition: Signal<string> = computed(() => this.formatNumber(this.data().costPerAcquisition));
  protected readonly recommendedActions: Signal<MarketingRecommendedAction[]> = this.initRecommendedActions();
  protected readonly keyInsights: Signal<MarketingKeyInsight[]> = this.initKeyInsights();
  protected readonly attentionActions: Signal<MarketingRecommendedAction[]> = computed(() => [
    ...this.recommendedActions().filter((a) => a.priority === 'high' || a.priority === 'medium'),
    ...this.retentionActions().filter((a) => a.priority === 'high' || a.priority === 'medium'),
  ]);
  protected readonly attentionInsights: Signal<MarketingKeyInsight[]> = computed(() => [
    ...this.keyInsights().filter((i) => i.type === 'warning'),
    ...this.retentionInsights().filter((i) => i.type === 'warning'),
  ]);
  protected readonly performingActions: Signal<MarketingRecommendedAction[]> = computed(() => [
    ...this.recommendedActions().filter((a) => a.priority === 'low'),
    ...this.retentionActions().filter((a) => a.priority === 'low'),
  ]);
  protected readonly performingInsights: Signal<MarketingKeyInsight[]> = computed(() => [
    ...this.keyInsights().filter((i) => i.type === 'driver' || i.type === 'info'),
    ...this.retentionInsights().filter((i) => i.type === 'driver' || i.type === 'info'),
  ]);
  protected readonly acquisitionChartData: Signal<ChartData<'bar'>> = this.initAcquisitionChartData();
  protected readonly cacChartData: Signal<ChartData<'line'>> = this.initCacChartData();
  protected readonly retentionChartData: Signal<ChartData<'line'>> = this.initRetentionChartData();
  protected readonly retentionInsights: Signal<MarketingKeyInsight[]> = this.initRetentionInsights();
  protected readonly retentionActions: Signal<MarketingRecommendedAction[]> = this.initRetentionActions();

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

  protected formatNumber(num: number): string {
    if (num >= 999_950) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  }

  // === Private Initializers ===
  private initRecommendedActions(): Signal<MarketingRecommendedAction[]> {
    return computed(() => {
      const { newMembersThisQuarter, costPerAcquisition, changePercentage, quarterlyData } = this.data();
      const actions: MarketingRecommendedAction[] = [];

      if (newMembersThisQuarter === 0 && quarterlyData.length === 0) {
        return actions;
      }

      // Check if CAC is increasing
      if (quarterlyData.length >= 2) {
        const recent = quarterlyData[quarterlyData.length - 1];
        const previous = quarterlyData[quarterlyData.length - 2];
        if (recent.cac > previous.cac && recent.cac > 0) {
          const cacIncrease = (((recent.cac - previous.cac) / previous.cac) * 100).toFixed(0);
          actions.push({
            title: 'Reduce cost per acquisition',
            description: `CAC increased ${cacIncrease}% to $${this.formatNumber(recent.cac)} — review channel efficiency and referral programs`,
            priority: 'high',
            dueLabel: 'This quarter',
            iconClass: 'fa-light fa-money-bill-trend-up',
          });
        }
      }

      // Check if acquisition is declining
      if (changePercentage < -10) {
        actions.push({
          title: 'Address acquisition decline',
          description: `New member signups dropped ${Math.abs(changePercentage)}% — review marketing funnel and conversion paths`,
          priority: 'high',
          dueLabel: 'This month',
          iconClass: 'fa-light fa-chart-line-down',
        });
      }

      // Check CAC trend over 3+ quarters
      if (quarterlyData.length >= 3) {
        const recent3 = quarterlyData.slice(-3);
        const cacDecreasing = recent3[0].cac > recent3[1].cac && recent3[1].cac > recent3[2].cac;
        if (cacDecreasing && recent3[2].cac > 0) {
          const totalDrop = (((recent3[0].cac - recent3[2].cac) / recent3[0].cac) * 100).toFixed(0);
          actions.push({
            title: 'Scale current acquisition channels',
            description: `CAC decreased ${totalDrop}% over 3 quarters — room to increase spend in efficient channels`,
            priority: 'medium',
            dueLabel: 'Next quarter',
            iconClass: 'fa-light fa-chart-line-up',
          });
        }
      }

      if (actions.length === 0) {
        actions.push({
          title: 'Monitor acquisition performance',
          description: `${newMembersThisQuarter} new members this quarter at $${this.formatNumber(costPerAcquisition)} CAC`,
          priority: 'low',
          dueLabel: 'Ongoing',
          iconClass: 'fa-light fa-chart-line-up',
        });
      }

      return actions;
    });
  }

  private initKeyInsights(): Signal<MarketingKeyInsight[]> {
    return computed(() => {
      const { newMembersThisQuarter, changePercentage, quarterlyData } = this.data();
      const insights: MarketingKeyInsight[] = [];

      if (newMembersThisQuarter === 0 && quarterlyData.length === 0) {
        return insights;
      }

      // Acquisition trend
      if (changePercentage > 10) {
        insights.push({ text: `New member acquisition up ${changePercentage}% quarter-over-quarter`, type: 'driver' });
      } else if (changePercentage < -10) {
        insights.push({ text: `New member acquisition down ${Math.abs(changePercentage)}% quarter-over-quarter`, type: 'warning' });
      } else if (changePercentage !== 0) {
        insights.push({ text: `Acquisition ${changePercentage > 0 ? 'up' : 'down'} ${Math.abs(changePercentage)}% — relatively stable`, type: 'info' });
      }

      // CAC trend
      if (quarterlyData.length >= 2) {
        const recent = quarterlyData[quarterlyData.length - 1];
        const previous = quarterlyData[quarterlyData.length - 2];
        if (previous.cac > 0 && recent.cac < previous.cac) {
          const improvement = (((previous.cac - recent.cac) / previous.cac) * 100).toFixed(0);
          insights.push({ text: `CAC improved ${improvement}% to $${this.formatNumber(recent.cac)} — marketing efficiency increasing`, type: 'driver' });
        } else if (previous.cac > 0 && recent.cac > previous.cac) {
          insights.push({ text: `CAC rose to $${this.formatNumber(recent.cac)} — acquisition becoming more expensive`, type: 'warning' });
        }
      }

      // Best quarter check
      if (quarterlyData.length >= 4) {
        const max = Math.max(...quarterlyData.map((q) => q.newMembers));
        const current = quarterlyData[quarterlyData.length - 1];
        if (current.newMembers === max) {
          insights.push({ text: `${current.quarter} is the strongest acquisition quarter in the dataset`, type: 'driver' });
        }
      }

      // Consecutive growth
      if (quarterlyData.length >= 3) {
        const recent3 = quarterlyData.slice(-3);
        const isGrowing = recent3[0].newMembers < recent3[1].newMembers && recent3[1].newMembers < recent3[2].newMembers;
        if (isGrowing) {
          insights.push({ text: 'Acquisition growing for 3 consecutive quarters', type: 'driver' });
        }
      }

      return insights;
    });
  }

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

  private initRetentionChartData(): Signal<ChartData<'line'>> {
    return computed(() => {
      const { monthlyData, target } = this.retentionData();
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

  private initRetentionInsights(): Signal<MarketingKeyInsight[]> {
    return computed(() => {
      const { renewalRate, netRevenueRetention, target, monthlyData } = this.retentionData();
      const insights: MarketingKeyInsight[] = [];

      if (renewalRate === 0 && monthlyData.length === 0) {
        return insights;
      }

      if (renewalRate >= target) {
        insights.push({ text: `Renewal rate at ${renewalRate}% exceeds ${target}% target`, type: 'driver' });
      } else if (renewalRate > 0) {
        insights.push({ text: `Renewal rate at ${renewalRate}% is below ${target}% target`, type: 'warning' });
      }

      if (netRevenueRetention > 100) {
        insights.push({ text: `NRR above 100% at ${netRevenueRetention}% — successful upsell to higher tiers`, type: 'driver' });
      } else if (netRevenueRetention > 0 && netRevenueRetention < 100) {
        insights.push({ text: `NRR at ${netRevenueRetention}% — revenue declining from existing members`, type: 'warning' });
      }

      if (monthlyData.length >= 3) {
        const recent3 = monthlyData.slice(-3);
        const isGrowing = recent3[0].value < recent3[1].value && recent3[1].value < recent3[2].value;
        const isShrinking = recent3[0].value > recent3[1].value && recent3[1].value > recent3[2].value;
        if (isGrowing) {
          insights.push({ text: 'Renewal rate improving for 3 consecutive months', type: 'driver' });
        } else if (isShrinking) {
          insights.push({ text: 'Renewal rate declining for 3 consecutive months', type: 'warning' });
        } else {
          insights.push({ text: 'Steady retention trend — no significant churn spikes detected', type: 'info' });
        }
      }

      return insights;
    });
  }

  private initRetentionActions(): Signal<MarketingRecommendedAction[]> {
    return computed(() => {
      const { renewalRate, netRevenueRetention, changePercentage, target, monthlyData } = this.retentionData();
      const actions: MarketingRecommendedAction[] = [];

      if (renewalRate === 0 && monthlyData.length === 0) {
        return actions;
      }

      if (renewalRate > 0 && renewalRate < target) {
        const gap = (target - renewalRate).toFixed(1);
        actions.push({
          title: 'Close retention gap to target',
          description: `Renewal rate is ${renewalRate}% vs ${target}% target — ${gap} points below. Focus on at-risk member engagement`,
          priority: 'high',
          dueLabel: 'This quarter',
          iconClass: 'fa-light fa-bullseye-arrow',
        });
      }

      if (netRevenueRetention > 0 && netRevenueRetention < 100) {
        actions.push({
          title: 'Improve net revenue retention',
          description: `NRR at ${netRevenueRetention}% — revenue shrinking from existing members. Explore upsell opportunities`,
          priority: 'high',
          dueLabel: 'This quarter',
          iconClass: 'fa-light fa-money-bill-trend-up',
        });
      }

      if (changePercentage < -3) {
        actions.push({
          title: 'Address retention decline',
          description: `Renewal rate dropped ${Math.abs(changePercentage)}% — review member satisfaction and renewal outreach timing`,
          priority: 'high',
          dueLabel: 'This month',
          iconClass: 'fa-light fa-chart-line-down',
        });
      }

      if (actions.length === 0) {
        actions.push({
          title: 'Maintain retention excellence',
          description: `${renewalRate}% renewal rate${renewalRate >= target ? ` exceeds ${target}% target` : ''}${netRevenueRetention > 100 ? ` with ${netRevenueRetention}% NRR` : ''}`,
          priority: 'low',
          dueLabel: 'Ongoing',
          iconClass: 'fa-light fa-chart-line-up',
        });
      }

      return actions;
    });
  }
}
