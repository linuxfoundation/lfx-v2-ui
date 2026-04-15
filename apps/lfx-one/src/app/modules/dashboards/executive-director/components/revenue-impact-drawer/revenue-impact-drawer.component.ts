// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, model, signal, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { ChartComponent } from '@components/chart/chart.component';
import { TagComponent } from '@components/tag/tag.component';
import { DASHBOARD_TOOLTIP_CONFIG, lfxColors, MARKETING_ACTION_ICON_MAP } from '@lfx-one/shared/constants';
import { DrawerModule } from 'primeng/drawer';

import type { ChartData, ChartOptions } from 'chart.js';
import type { MarketingActionType, MarketingKeyInsight, MarketingRecommendedAction, RevenueImpactResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-revenue-impact-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ChartComponent, DecimalPipe, DrawerModule, TagComponent],
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
    eventRegistrationAttribution: { channelBreakdown: [], monthlyTrend: [] },
  });

  // === WritableSignals ===
  protected readonly eventAttrSortBy = signal<'revenue' | 'sessions' | 'visitors'>('revenue');

  // === Computed Signals ===
  protected readonly paidMediaTrendChartData: Signal<ChartData<'bar'>> = this.initPaidMediaTrendChartData();
  protected readonly sortedProjectBreakdown = computed(() => [...this.data().projectBreakdown].sort((a, b) => b.totalImpressions - a.totalImpressions));
  protected readonly projectBreakdownChannels = computed<string[]>(() => {
    // Pre-aggregate impressions per channel in a single pass, then sort on the cached totals.
    const channelTotals = new Map<string, number>();
    for (const r of this.data().projectBreakdown) {
      for (const [channel, impressions] of Object.entries(r.channelImpressions)) {
        channelTotals.set(channel, (channelTotals.get(channel) ?? 0) + (impressions ?? 0));
      }
    }
    return Array.from(channelTotals.keys()).sort((a, b) => (channelTotals.get(b) ?? 0) - (channelTotals.get(a) ?? 0));
  });
  protected readonly eventAttrChartData: Signal<ChartData<'bar'>> = this.initEventAttrChartData();
  protected readonly sortedEventAttrChannels = computed(() => {
    const rows = [...this.data().eventRegistrationAttribution.channelBreakdown];
    const sortBy = this.eventAttrSortBy();
    return rows.sort((a, b) => {
      if (sortBy === 'revenue') return b.lastTouchRevenue - a.lastTouchRevenue;
      if (sortBy === 'visitors') return b.uniqueVisitors - a.uniqueVisitors;
      return b.sessions - a.sessions;
    });
  });

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
          label: (ctx) => ` ${ctx.dataset.label ?? ''}: $${Number(ctx.parsed.y ?? 0).toLocaleString()}`,
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
        title: { display: true, text: 'Dollars ($)', color: lfxColors.gray[500], font: { size: 11 } },
        ticks: {
          color: lfxColors.gray[500],
          font: { size: 11 },
          callback: (value) => {
            const n = Number(value);
            if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
            return `$${n.toLocaleString()}`;
          },
        },
      },
    },
  };

  protected readonly channelColorMap: Record<string, string> = {
    google_ads: lfxColors.blue[500],
    facebook_ads: lfxColors.blue[700],
    microsoft_ads: lfxColors.emerald[600],
    linkedin_ads: lfxColors.gray[700],
    reddit_ads: lfxColors.red[500],
    twitter_ads: lfxColors.gray[500],
  };

  protected readonly eventAttrChartOptions: ChartOptions<'bar'> = {
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
          label: (ctx) => ` ${ctx.dataset.label}: ${Number(ctx.parsed.y ?? 0).toLocaleString()} sessions`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        display: true,
        grid: { display: false },
        border: { display: true, color: lfxColors.gray[300] },
        ticks: { color: lfxColors.gray[500], font: { size: 11 } },
      },
      y: {
        stacked: true,
        display: true,
        grid: { color: lfxColors.gray[200], lineWidth: 1 },
        border: { display: false },
        title: { display: true, text: 'Sessions', color: lfxColors.gray[500], font: { size: 11 } },
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
    },
  };

  protected readonly recommendedActions: Signal<MarketingRecommendedAction[]> = this.initRecommendedActions();
  protected readonly keyInsights: Signal<MarketingKeyInsight[]> = this.initKeyInsights();
  protected readonly attentionActions: Signal<MarketingRecommendedAction[]> = computed(() =>
    this.recommendedActions().filter((a) => a.priority === 'high' || a.priority === 'medium')
  );
  protected readonly attentionInsights: Signal<MarketingKeyInsight[]> = computed(() => this.keyInsights().filter((i) => i.type === 'warning'));
  protected readonly performingActions: Signal<MarketingRecommendedAction[]> = computed(() => this.recommendedActions().filter((a) => a.priority === 'low'));
  protected readonly performingInsights: Signal<MarketingKeyInsight[]> = computed(() =>
    this.keyInsights().filter((i) => i.type === 'driver' || i.type === 'info')
  );

  protected actionIcon(type: MarketingActionType): string {
    return MARKETING_ACTION_ICON_MAP[type];
  }

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

  protected setEventAttrSort(sortBy: 'revenue' | 'sessions' | 'visitors'): void {
    this.eventAttrSortBy.set(sortBy);
  }

  protected formatLastTouchRevenue(value: number): string {
    if (value <= 0) return '—';
    return this.formatRevenue(value);
  }

  protected channelColor(channel: string): string {
    return this.channelColorMap[channel] ?? lfxColors.gray[400];
  }

  protected formatImpressionsShort(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
  }

  protected channelShareForProject(project: { totalImpressions: number; channelImpressions: Record<string, number> }, channel: string): number {
    if (!project.totalImpressions) return 0;
    return ((project.channelImpressions[channel] ?? 0) / project.totalImpressions) * 100;
  }

  private initRecommendedActions(): Signal<MarketingRecommendedAction[]> {
    return computed(() => {
      const { attributionChannels, paidMedia, projectBreakdown, eventRegistrationAttribution } = this.data();
      const actions: MarketingRecommendedAction[] = [];

      // Paid media ROAS — the spend-efficiency signal ED must see first
      if (paidMedia.adSpend > 0 && paidMedia.roas > 0 && paidMedia.roas < 0.8) {
        const lost = paidMedia.adSpend - paidMedia.adRevenue;
        actions.push({
          title: 'Cut or pause losing paid campaigns',
          description: `Paid ROAS is ${paidMedia.roas.toFixed(2)}x — ${this.formatRevenue(lost)} spent above revenue earned. Review top-spending campaigns and pause underperformers`,
          priority: 'high',
          dueLabel: 'This week',
          actionType: 'decline',
        });
      } else if (paidMedia.adSpend > 0 && paidMedia.roas >= 0.8 && paidMedia.roas < 1) {
        actions.push({
          title: 'Paid media at break-even',
          description: `ROAS is ${paidMedia.roas.toFixed(2)}x on ${this.formatRevenue(paidMedia.adSpend)} spend — optimize creative and targeting before scaling`,
          priority: 'medium',
          dueLabel: 'This month',
          actionType: 'investigate',
        });
      }

      // Foundation-level channel concentration
      if (attributionChannels.length > 0) {
        const top = [...attributionChannels].sort((a, b) => b.percentage - a.percentage)[0];
        if (top.percentage > 70) {
          actions.push({
            title: 'Reduce channel concentration risk',
            description: `${this.formatChannelLabel(top.channel)} drives ${top.percentage.toFixed(0)}% of paid impressions — one algorithm change could cut reach in half. Grow at least one alternate channel`,
            priority: 'high',
            dueLabel: 'This quarter',
            actionType: 'decline',
          });
        } else if (top.percentage > 55) {
          actions.push({
            title: 'Watch channel concentration',
            description: `${this.formatChannelLabel(top.channel)} is ${top.percentage.toFixed(0)}% of paid impressions — diversify before it crosses 70%`,
            priority: 'medium',
            dueLabel: 'This quarter',
            actionType: 'engagement',
          });
        }
      }

      // Project-level over-concentration (uses the project table the drawer renders)
      if (projectBreakdown.length >= 2) {
        const heavilyConcentrated = projectBreakdown.filter((p) => {
          if (!p.totalImpressions) return false;
          const max = Math.max(...Object.values(p.channelImpressions));
          return max / p.totalImpressions > 0.8;
        });
        if (heavilyConcentrated.length >= 2) {
          actions.push({
            title: 'Rebalance project-level channel mix',
            description: `${heavilyConcentrated.length} projects get 80%+ of their paid reach from a single channel — rebalance to reduce per-project platform dependency`,
            priority: 'medium',
            dueLabel: 'Next quarter',
            actionType: 'engagement',
          });
        }
      }

      // Event-registration attribution — drawer renders this table, so insights must cover it
      if (eventRegistrationAttribution.channelBreakdown.length > 0) {
        const totalEventRev = eventRegistrationAttribution.channelBreakdown.reduce((s, c) => s + (c.lastTouchRevenue ?? 0), 0);
        if (totalEventRev > 0) {
          const topEvt = [...eventRegistrationAttribution.channelBreakdown].sort((a, b) => (b.lastTouchRevenue ?? 0) - (a.lastTouchRevenue ?? 0))[0];
          const topShare = ((topEvt.lastTouchRevenue ?? 0) / totalEventRev) * 100;
          if (topShare > 70) {
            actions.push({
              title: 'Event registration revenue over-concentrated',
              description: `${topEvt.channel} drove ${topShare.toFixed(0)}% of event-registration last-touch revenue (${this.formatRevenue(topEvt.lastTouchRevenue ?? 0)}) — grow alternate acquisition paths for event revenue`,
              priority: 'medium',
              dueLabel: 'Next quarter',
              actionType: 'engagement',
            });
          }
        }
      }

      return actions;
    });
  }

  private initKeyInsights(): Signal<MarketingKeyInsight[]> {
    return computed(() => {
      const { attributionChannels, paidMedia, eventRegistrationAttribution } = this.data();
      const insights: MarketingKeyInsight[] = [];

      // Paid media ROAS tiers
      if (paidMedia.adSpend > 0 && paidMedia.roas >= 3) {
        insights.push({
          text: `Paid media ROAS at ${paidMedia.roas.toFixed(1)}x — ${this.formatRevenue(paidMedia.adRevenue)} revenue on ${this.formatRevenue(paidMedia.adSpend)} spend`,
          type: 'driver',
        });
      } else if (paidMedia.adSpend > 0 && paidMedia.roas >= 1) {
        insights.push({
          text: `Paid media profitable at ${paidMedia.roas.toFixed(2)}x ROAS — room to optimize before scaling`,
          type: 'info',
        });
      }

      // Paid media trend over 3 months
      if (paidMedia.monthlyTrend.length >= 3) {
        const recent3 = paidMedia.monthlyTrend.slice(-3);
        const isRisingRev = recent3[0].revenue < recent3[1].revenue && recent3[1].revenue < recent3[2].revenue;
        const isFallingRev = recent3[0].revenue > recent3[1].revenue && recent3[1].revenue > recent3[2].revenue && recent3[0].revenue > 0;
        if (isRisingRev) {
          insights.push({ text: 'Paid-attributed revenue rising for 3 consecutive months', type: 'driver' });
        } else if (isFallingRev) {
          insights.push({ text: 'Paid-attributed revenue falling for 3 consecutive months', type: 'warning' });
        }
      }

      // Channel balance
      if (attributionChannels.length > 0) {
        const top = [...attributionChannels].sort((a, b) => b.percentage - a.percentage)[0];
        insights.push({
          text: `${this.formatChannelLabel(top.channel)} leads paid impressions at ${top.percentage.toFixed(0)}%`,
          type: 'info',
        });
        if (attributionChannels.length >= 3 && attributionChannels.every((c) => c.percentage < 45)) {
          insights.push({ text: `Balanced paid mix — no channel above 45% across ${attributionChannels.length} channels`, type: 'driver' });
        }
      }

      // Event-attribution leader
      if (eventRegistrationAttribution.channelBreakdown.length > 0) {
        const totalEventRev = eventRegistrationAttribution.channelBreakdown.reduce((s, c) => s + (c.lastTouchRevenue ?? 0), 0);
        if (totalEventRev > 0) {
          const topEvt = [...eventRegistrationAttribution.channelBreakdown].sort((a, b) => (b.lastTouchRevenue ?? 0) - (a.lastTouchRevenue ?? 0))[0];
          insights.push({
            text: `${topEvt.channel} drove ${this.formatRevenue(topEvt.lastTouchRevenue ?? 0)} in event-registration last-touch revenue`,
            type: 'info',
          });
        }
      }

      return insights;
    });
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
          },
          {
            type: 'bar',
            label: 'Revenue',
            data: trend.map((r) => r.revenue),
            backgroundColor: lfxColors.emerald[600],
            borderRadius: 4,
          },
        ],
      };
    });
  }

  private initEventAttrChartData(): Signal<ChartData<'bar'>> {
    return computed(() => {
      const rows = this.data().eventRegistrationAttribution.monthlyTrend;
      if (rows.length === 0) {
        return { labels: [], datasets: [] };
      }

      const palette: Record<string, string> = {
        'Paid Search': lfxColors.blue[500],
        'Email/HubSpot': lfxColors.emerald[600],
        'Organic Search': lfxColors.blue[700],
        'Direct/Unknown': lfxColors.gray[500],
        Social: lfxColors.emerald[400],
        'Other Tracked': lfxColors.amber[500],
        'Internal/Banner': lfxColors.gray[700],
      };
      const fallbackColor = lfxColors.gray[400];

      // Pre-aggregate once: channel → total sessions for sort; (month, channel) → sessions for lookup
      const channelTotals = new Map<string, number>();
      const monthChannelSessions = new Map<string, number>();
      const monthSetRaw = new Set<string>();
      for (const r of rows) {
        monthSetRaw.add(r.month);
        channelTotals.set(r.channel, (channelTotals.get(r.channel) ?? 0) + r.sessions);
        monthChannelSessions.set(`${r.month}|${r.channel}`, r.sessions);
      }

      const monthSet = Array.from(monthSetRaw).sort();
      const channels = Array.from(channelTotals.keys()).sort((a, b) => (channelTotals.get(b) ?? 0) - (channelTotals.get(a) ?? 0));

      const labels = monthSet.map((m) => {
        const d = new Date(`${m}-01`);
        return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      });

      const datasets = channels.map((channel) => ({
        label: channel,
        data: monthSet.map((m) => monthChannelSessions.get(`${m}|${channel}`) ?? 0),
        backgroundColor: palette[channel] ?? fallbackColor,
        borderRadius: 2,
        borderSkipped: false,
      }));

      return { labels, datasets };
    });
  }
}
