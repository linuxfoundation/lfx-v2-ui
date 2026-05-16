// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { FUNNEL_STAGE_OPTIONS } from '@lfx-one/shared/constants';
import { formatCurrency, formatNumber } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { catchError, of, switchMap, tap } from 'rxjs';

import type { FilterPillOption, FunnelStage, PaidProjectRow, PerformanceSummaryKpi, SocialReachResponse } from '@lfx-one/shared/interfaces';

import { SparklineKpiCardComponent } from '../sparkline-kpi-card/sparkline-kpi-card.component';

@Component({
  selector: 'lfx-performance-marketing-tab',
  imports: [FilterPillsComponent, SparklineKpiCardComponent],
  templateUrl: './performance-marketing-tab.component.html',
  styleUrl: './performance-marketing-tab.component.scss',
})
export class PerformanceMarketingTabComponent {
  // === Services ===
  private readonly analyticsService = inject(AnalyticsService);

  // === Inputs ===
  public readonly foundationSlug = input<string | undefined>();
  public readonly foundationName = input<string>('');

  // === Constants ===
  protected readonly funnelOptions: FilterPillOption[] = FUNNEL_STAGE_OPTIONS;

  // === WritableSignals ===
  protected readonly loading = signal(false);
  protected readonly selectedFunnel = signal<FunnelStage>('all');

  // === Computed Signals ===
  protected readonly socialReachData: Signal<SocialReachResponse | null> = this.initSocialReachData();
  protected readonly kpiCards: Signal<PerformanceSummaryKpi[]> = this.initKpiCards();
  protected readonly projectRows: Signal<PaidProjectRow[]> = this.initProjectRows();
  protected readonly hasProjects = computed(() => this.projectRows().length > 0);

  // === Protected Methods ===
  protected onFunnelChange(funnelId: string): void {
    if (this.funnelOptions.some((o) => o.id === funnelId)) {
      this.selectedFunnel.set(funnelId as FunnelStage);
    }
  }

  // === Private Initializers ===
  private initSocialReachData(): Signal<SocialReachResponse | null> {
    const slug$ = toObservable(this.foundationSlug);

    return toSignal(
      slug$.pipe(
        switchMap((slug) => {
          if (!slug) {
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          return this.analyticsService.getSocialReach(slug).pipe(
            tap(() => this.loading.set(false)),
            catchError(() => {
              this.loading.set(false);
              return of(null);
            })
          );
        })
      ),
      { initialValue: null }
    );
  }

  private initKpiCards(): Signal<PerformanceSummaryKpi[]> {
    return computed(() => {
      const data = this.socialReachData();
      if (!data) return [];

      const changePct = data.changePercentage;
      const cards: PerformanceSummaryKpi[] = [
        {
          id: 'total-impressions',
          label: 'Total Impressions',
          icon: 'fa-light fa-eye',
          iconClass: 'bg-blue-100 text-blue-600',
          value: formatNumber(data.totalReach),
          momChange: this.formatChangePct(changePct, 'MoM'),
          momTrend: this.trendDirection(changePct),
          momTrendClass: this.trendColorClass(changePct),
          yoyChange: null,
          yoyTrend: 'neutral',
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
        {
          id: 'total-spend',
          label: 'Total Spend',
          icon: 'fa-light fa-wallet',
          iconClass: 'bg-amber-100 text-amber-600',
          value: formatCurrency(data.totalSpend),
          momChange: null,
          momTrend: 'neutral',
          momTrendClass: 'text-gray-500',
          yoyChange: null,
          yoyTrend: 'neutral',
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
        {
          id: 'total-revenue',
          label: 'Total Revenue',
          icon: 'fa-light fa-dollar-sign',
          iconClass: 'bg-green-100 text-green-600',
          value: formatCurrency(data.totalRevenue),
          momChange: null,
          momTrend: 'neutral',
          momTrendClass: 'text-gray-500',
          yoyChange: null,
          yoyTrend: 'neutral',
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
        {
          id: 'roas',
          label: 'ROAS',
          icon: 'fa-light fa-chart-line-up',
          iconClass: 'bg-violet-100 text-violet-600',
          value: `${data.roas.toFixed(2)}x`,
          momChange: null,
          momTrend: 'neutral',
          momTrendClass: 'text-gray-500',
          yoyChange: null,
          yoyTrend: 'neutral',
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
      ];

      return cards;
    });
  }

  private initProjectRows(): Signal<PaidProjectRow[]> {
    return computed(() => {
      const data = this.socialReachData();
      const funnel = this.selectedFunnel();
      if (!data?.projectBreakdown?.length) return [];

      return data.projectBreakdown
        .filter((p) => {
          if (funnel === 'all') return true;
          const stage = p.funnelStage?.toLowerCase() ?? '';
          if (funnel === 'tofu') return stage.startsWith('tofu') || stage === 'unknown';
          if (funnel === 'mofu') return stage === 'mofu';
          if (funnel === 'bofu') return stage === 'bofu';
          return true;
        })
        .map(
          (p): PaidProjectRow => ({
            name: p.projectName,
            funnelStage: p.funnelStage,
            spend: formatCurrency(p.spend),
            revenue: formatCurrency(p.revenue),
            roas: `${p.roas.toFixed(2)}x`,
            impressions: formatNumber(p.impressions),
            performance: p.performance,
            performanceClass: this.getPerformanceClass(p.performance),
          })
        )
        .sort((a, b) => {
          const order: Record<string, number> = { EXCELLENT: 0, GOOD: 1, POOR: 2, 'NO REVENUE': 3 };
          return (order[a.performance] ?? 4) - (order[b.performance] ?? 4);
        });
    });
  }

  // === Private Helpers ===
  private trendDirection(pct: number): 'up' | 'down' | 'neutral' {
    if (pct > 0) return 'up';
    if (pct < 0) return 'down';
    return 'neutral';
  }

  private trendColorClass(pct: number): string {
    if (pct > 0) return 'text-green-600';
    if (pct < 0) return 'text-red-600';
    return 'text-gray-500';
  }

  private formatChangePct(pct: number, suffix: string): string {
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}% ${suffix}`;
  }

  private getPerformanceClass(perf: string): string {
    switch (perf) {
      case 'EXCELLENT':
        return 'bg-green-50 text-green-700';
      case 'GOOD':
        return 'bg-blue-50 text-blue-700';
      default:
        return '';
    }
  }
}
