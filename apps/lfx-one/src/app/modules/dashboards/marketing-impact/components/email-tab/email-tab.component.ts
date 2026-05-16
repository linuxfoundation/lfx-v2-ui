// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { formatNumber } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { catchError, of, switchMap, tap } from 'rxjs';

import type { EmailCtrResponse, EmailTypeRow, PerformanceSummaryKpi, TopCampaignRow } from '@lfx-one/shared/interfaces';

import { SparklineKpiCardComponent } from '../sparkline-kpi-card/sparkline-kpi-card.component';

@Component({
  selector: 'lfx-email-tab',
  imports: [SparklineKpiCardComponent],
  templateUrl: './email-tab.component.html',
  styleUrl: './email-tab.component.scss',
})
export class EmailTabComponent {
  // === Services ===
  private readonly analyticsService = inject(AnalyticsService);

  // === Inputs ===
  public readonly foundationSlug = input<string | undefined>();
  public readonly foundationName = input<string>('');

  // === WritableSignals ===
  protected readonly loading = signal(false);

  // === Computed Signals ===
  protected readonly emailData: Signal<EmailCtrResponse | null> = this.initEmailData();
  protected readonly kpiCards: Signal<PerformanceSummaryKpi[]> = this.initKpiCards();
  protected readonly emailTypeRows: Signal<EmailTypeRow[]> = this.initEmailTypeRows();
  protected readonly hasEmailTypes = computed(() => this.emailTypeRows().length > 0);
  protected readonly topCampaigns: Signal<TopCampaignRow[]> = this.initTopCampaigns();
  protected readonly hasTopCampaigns = computed(() => this.topCampaigns().length > 0);

  // === Private Initializers ===
  private initEmailData(): Signal<EmailCtrResponse | null> {
    const slug$ = toObservable(this.foundationSlug);

    return toSignal(
      slug$.pipe(
        switchMap((slug) => {
          if (!slug) {
            this.loading.set(false);
            return of(null);
          }
          this.loading.set(true);
          return this.analyticsService.getEmailCtr(slug).pipe(
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
      const data = this.emailData();
      if (!data) return [];

      const totalSends = data.monthlySends?.reduce((s, v) => s + v, 0) ?? 0;
      const totalOpens = data.monthlyOpens?.reduce((s, v) => s + v, 0) ?? 0;
      const openRate = totalSends > 0 ? (totalOpens / totalSends) * 100 : 0;
      const changePct = data.changePercentage;

      return [
        {
          id: 'total-sends',
          label: 'Total Sends',
          icon: 'fa-light fa-paper-plane',
          iconClass: 'bg-blue-100 text-blue-600',
          value: formatNumber(totalSends),
          momChange: null,
          momTrend: 'neutral' as const,
          momTrendClass: 'text-gray-500',
          yoyChange: null,
          yoyTrend: 'neutral' as const,
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
        {
          id: 'total-opens',
          label: 'Total Opens',
          icon: 'fa-light fa-envelope-open',
          iconClass: 'bg-green-100 text-green-600',
          value: formatNumber(totalOpens),
          momChange: null,
          momTrend: 'neutral' as const,
          momTrendClass: 'text-gray-500',
          yoyChange: null,
          yoyTrend: 'neutral' as const,
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
        {
          id: 'open-rate',
          label: 'Open Rate',
          icon: 'fa-light fa-chart-simple',
          iconClass: 'bg-amber-100 text-amber-600',
          value: `${openRate.toFixed(1)}%`,
          momChange: null,
          momTrend: 'neutral' as const,
          momTrendClass: 'text-gray-500',
          yoyChange: null,
          yoyTrend: 'neutral' as const,
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
        {
          id: 'ctr',
          label: 'Click-Through Rate',
          icon: 'fa-light fa-arrow-pointer',
          iconClass: 'bg-violet-100 text-violet-600',
          value: `${data.currentCtr.toFixed(2)}%`,
          momChange: this.formatChangePct(changePct, 'MoM'),
          momTrend: this.trendDirection(changePct),
          momTrendClass: this.trendColorClass(changePct),
          yoyChange: null,
          yoyTrend: 'neutral' as const,
          yoyTrendClass: 'text-gray-500',
          comparisonLine: '',
        },
      ];
    });
  }

  private initEmailTypeRows(): Signal<EmailTypeRow[]> {
    return computed(() => {
      const data = this.emailData();
      if (!data?.emailTypeBreakdown?.length) return [];

      return data.emailTypeBreakdown.map(
        (et): EmailTypeRow => ({
          emailType: et.emailType,
          campaignCount: et.campaignCount,
          sends: formatNumber(et.totalSends),
          opens: formatNumber(et.totalOpens),
          openRate: `${et.openRate.toFixed(1)}%`,
          ctr: `${et.ctr.toFixed(2)}%`,
        })
      );
    });
  }

  private initTopCampaigns(): Signal<TopCampaignRow[]> {
    return computed(() => {
      const data = this.emailData();
      if (!data?.emailTypeBreakdown?.length) return [];

      const allCampaigns = data.emailTypeBreakdown.flatMap((et) => et.campaigns ?? []);
      return allCampaigns
        .sort((a, b) => b.sends - a.sends)
        .slice(0, 5)
        .map(
          (c): TopCampaignRow => ({
            name: c.campaignName,
            type: c.emailType,
            sends: formatNumber(c.sends),
            opens: formatNumber(c.opens),
            openRate: `${c.openRate.toFixed(1)}%`,
            ctr: `${c.ctr.toFixed(2)}%`,
          })
        );
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
}
