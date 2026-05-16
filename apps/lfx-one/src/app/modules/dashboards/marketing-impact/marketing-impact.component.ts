// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { SelectComponent } from '@components/select/select.component';
import { MARKETING_IMPACT_FOCUS_OPTIONS, MARKETING_IMPACT_TABS } from '@lfx-one/shared/constants';
import { buildMarketingImpactMonthOptions, formatCurrency, formatNumber, getDefaultMarketingImpactMonth } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { catchError, forkJoin, map, of, startWith, switchMap, tap } from 'rxjs';

import type {
  AttributionData,
  BrandReachResponse,
  EmailCtrResponse,
  FilterPillOption,
  MarketingImpactFocusProgram,
  MarketingImpactMonthOption,
  MarketingImpactTab,
  MarketingImpactTabOption,
  PerformanceSummaryKpi,
  RevenueImpactResponse,
} from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-marketing-impact',
  imports: [NgClass, ReactiveFormsModule, SelectComponent, ButtonComponent, FilterPillsComponent],
  templateUrl: './marketing-impact.component.html',
  styleUrl: './marketing-impact.component.scss',
})
export class MarketingImpactComponent {
  private readonly projectContextService = inject(ProjectContextService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly fb = inject(FormBuilder);
  private readonly defaultMonth = getDefaultMarketingImpactMonth();

  protected readonly headerForm = this.fb.nonNullable.group({
    month: [this.defaultMonth],
  });

  protected readonly monthOptions: MarketingImpactMonthOption[] = buildMarketingImpactMonthOptions();
  protected readonly focusOptions: FilterPillOption[] = MARKETING_IMPACT_FOCUS_OPTIONS;
  protected readonly tabs: MarketingImpactTabOption[] = MARKETING_IMPACT_TABS;

  protected readonly selectedFocus = signal<MarketingImpactFocusProgram>('all');
  protected readonly selectedTab = signal<MarketingImpactTab>('overview');
  protected readonly loading = signal(false);

  protected readonly hasFoundation = computed(() => !!this.projectContextService.selectedFoundation());
  protected readonly foundationName = computed(() => this.projectContextService.selectedFoundation()?.name ?? '');
  protected readonly selectedTabLabel = computed(() => this.tabs.find((t) => t.id === this.selectedTab())?.label ?? '');

  protected readonly selectedMonth: Signal<string> = this.initSelectedMonth();
  protected readonly contextLabel: Signal<string> = this.initContextLabel();
  protected readonly attributionData: Signal<AttributionData> = this.initAttributionData();
  protected readonly performanceSummaryKpis: Signal<PerformanceSummaryKpi[]> = this.initPerformanceSummaryKpis();
  protected readonly summaryTitle: Signal<string> = this.initSummaryTitle();
  protected readonly summarySubtitle: Signal<string> = this.initSummarySubtitle();

  protected onFocusChange(focusId: string): void {
    if (this.focusOptions.some((o) => o.id === focusId)) {
      this.selectedFocus.set(focusId as MarketingImpactFocusProgram);
    }
  }

  protected onTabChange(tabId: MarketingImpactTab): void {
    this.selectedTab.set(tabId);
  }

  private initSelectedMonth(): Signal<string> {
    return toSignal(this.headerForm.controls.month.valueChanges.pipe(startWith(this.defaultMonth)), {
      initialValue: this.defaultMonth,
    });
  }

  private initContextLabel(): Signal<string> {
    return computed(() => {
      const name = this.foundationName();
      const monthValue = this.selectedMonth();
      const option = this.monthOptions.find((o) => o.value === monthValue);
      const monthLabel = option?.label ?? '';
      if (!name || !monthLabel) return '';
      return `Cross-channel performance for ${name} \u00B7 ${monthLabel}`;
    });
  }

  private initSummaryTitle(): Signal<string> {
    return computed(() => {
      const monthValue = this.selectedMonth();
      const [year, month] = monthValue.split('-').map(Number);
      if (!year || !month) return 'Performance summary';
      const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
      return `${monthName} performance summary`;
    });
  }

  private initSummarySubtitle(): Signal<string> {
    return computed(() => {
      const monthValue = this.selectedMonth();
      const [year, month] = monthValue.split('-').map(Number);
      if (!year || !month) return '';
      const date = new Date(Date.UTC(year, month - 1, 1));
      const priorMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
      const priorYear = new Date(Date.UTC(date.getUTCFullYear() - 1, date.getUTCMonth(), 1));

      const momLabel = priorMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      const yoyLabel = priorYear.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

      const name = this.foundationName();
      const foundation = name ? name : 'all LF projects';
      return `vs ${momLabel} (MoM) and ${yoyLabel} (YoY) \u00B7 Linear attribution \u00B7 ${foundation}`;
    });
  }

  private initAttributionData(): Signal<AttributionData> {
    const foundation$ = toObservable(this.projectContextService.selectedFoundation).pipe(map((f) => f?.slug));

    return toSignal(
      foundation$.pipe(
        switchMap((slug) => {
          if (!slug) {
            this.loading.set(false);
            return of({ revenueImpact: null, brandReach: null, emailCtr: null });
          }
          this.loading.set(true);
          return forkJoin({
            revenueImpact: this.analyticsService.getRevenueImpact(slug).pipe(catchError(() => of(null as RevenueImpactResponse | null))),
            brandReach: this.analyticsService.getBrandReach(slug).pipe(catchError(() => of(null as BrandReachResponse | null))),
            emailCtr: this.analyticsService.getEmailCtr(slug).pipe(catchError(() => of(null as EmailCtrResponse | null))),
          }).pipe(tap(() => this.loading.set(false)));
        })
      ),
      { initialValue: { revenueImpact: null, brandReach: null, emailCtr: null } }
    );
  }

  private initPerformanceSummaryKpis(): Signal<PerformanceSummaryKpi[]> {
    return computed(() => {
      const data = this.attributionData();
      const cards: PerformanceSummaryKpi[] = [];

      if (data.revenueImpact) {
        const ri = data.revenueImpact;
        const yoyPct = ri.changePercentage;
        cards.push(
          {
            id: 'attributed-revenue',
            label: 'Attributed Revenue',
            icon: 'fa-light fa-dollar-sign',
            iconClass: 'bg-green-100 text-green-600',
            value: formatCurrency(ri.revenueAttributed),
            momChange: null,
            momTrend: 'neutral',
            momTrendClass: 'text-gray-500',
            yoyChange: this.formatChangePct(yoyPct, 'YoY'),
            yoyTrend: this.trendDirection(yoyPct),
            yoyTrendClass: this.trendColorClass(yoyPct),
            comparisonLine: '',
          },
          {
            id: 'roas',
            label: 'Return on Ad Spend',
            icon: 'fa-light fa-chart-line-up',
            iconClass: 'bg-blue-100 text-blue-600',
            value: `${ri.paidMedia.roas.toFixed(2)}x`,
            momChange: null,
            momTrend: 'neutral',
            momTrendClass: 'text-gray-500',
            yoyChange: null,
            yoyTrend: 'neutral',
            yoyTrendClass: 'text-gray-500',
            comparisonLine: '',
          }
        );
      }

      if (data.brandReach) {
        const br = data.brandReach;
        const momPct = br.sessionMomChangePct;
        cards.push({
          id: 'web-sessions',
          label: 'Total Web Sessions',
          icon: 'fa-light fa-globe',
          iconClass: 'bg-violet-100 text-violet-600',
          value: formatNumber(br.totalMonthlySessions),
          momChange: this.formatChangePct(momPct, 'MoM'),
          momTrend: this.trendDirection(momPct),
          momTrendClass: this.trendColorClass(momPct),
          yoyChange: null,
          yoyTrend: 'neutral',
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        });
      }

      if (data.emailCtr) {
        const ec = data.emailCtr;
        const momPct = ec.changePercentage;
        cards.push({
          id: 'email-open-rate',
          label: 'Email Open Rate',
          icon: 'fa-light fa-envelope-open',
          iconClass: 'bg-amber-100 text-amber-600',
          value: `${ec.currentCtr.toFixed(2)}%`,
          momChange: this.formatChangePct(momPct, 'MoM'),
          momTrend: this.trendDirection(momPct),
          momTrendClass: this.trendColorClass(momPct),
          yoyChange: null,
          yoyTrend: 'neutral',
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
          badge: momPct < 0 ? 'Needs review' : undefined,
        });
      }

      return cards;
    });
  }

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
}
