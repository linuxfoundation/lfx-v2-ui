// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { buildHealthMetricsYearOptions, getYearForRange, HEALTH_METRICS_STATUS_COUNT, HEALTH_METRICS_SUMMARY_CARDS } from '@lfx-one/shared/constants';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { catchError, filter, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { MembershipChurnTierCardComponent } from './membership-churn-tier-card/membership-churn-tier-card.component';
import { NpsCardComponent } from './nps-card/nps-card.component';
import { OutstandingBalanceCardComponent } from './outstanding-balance-card/outstanding-balance-card.component';
import { ParticipatingOrgsCardComponent } from './participating-orgs-card/participating-orgs-card.component';
import { EventsCardComponent } from './events-card/events-card.component';
import { TrainingCertificationCardComponent } from './training-certification-card/training-certification-card.component';
import { CodeContributionCardComponent } from './code-contribution-card/code-contribution-card.component';
import { BoardMeetingCardComponent } from './board-meeting-card/board-meeting-card.component';
import { FlywheelConversionCardComponent } from './flywheel-conversion-card/flywheel-conversion-card.component';
import { HealthMetricsFullPageEmptyStateComponent } from './health-metrics-full-page-empty-state/health-metrics-full-page-empty-state.component';

import type { HealthMetricsData, DisplayCard, HealthMetricsRange } from '@lfx-one/shared/interfaces';

const DEFAULT_DATA: HealthMetricsData = {
  totalValue: null,
  totalProjects: null,
  totalMembers: null,
  flywheel: null,
};

@Component({
  selector: 'lfx-health-metrics',
  standalone: true,
  imports: [
    NgClass,
    SkeletonModule,
    MembershipChurnTierCardComponent,
    NpsCardComponent,
    OutstandingBalanceCardComponent,
    ParticipatingOrgsCardComponent,
    EventsCardComponent,
    TrainingCertificationCardComponent,
    CodeContributionCardComponent,
    BoardMeetingCardComponent,
    FlywheelConversionCardComponent,
    HealthMetricsFullPageEmptyStateComponent,
  ],
  templateUrl: './health-metrics.component.html',
  styleUrl: './health-metrics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthMetricsComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly metricsData = signal<HealthMetricsData>(DEFAULT_DATA);
  protected readonly statusCount = HEALTH_METRICS_STATUS_COUNT;
  protected readonly selectedRange = signal<HealthMetricsRange>('YTD');

  private readonly cardDataStates = signal<Record<string, boolean>>({});

  protected readonly hasFoundation = computed(() => !!this.projectContextService.selectedFoundation());

  private readonly cardNames = ['events', 'nps', 'outstanding-balance', 'membership-churn', 'participating-orgs', 'training', 'code-contribution', 'flywheel', 'board-meeting'];

  protected readonly allCardsEmpty = computed(() => {
    if (this.loading()) return false;

    // Foundation-level totals are filter-independent (cumulative). If any are
    // present, the foundation has data somewhere in the year-filter range, so
    // we must show the cards (with per-card empty states for the current
    // filter) rather than the full-page empty state.
    const data = this.metricsData();
    const hasFoundationTotals =
      (data.totalValue?.totalValue ?? 0) > 0 || (data.totalProjects?.totalProjects ?? 0) > 0 || (data.totalMembers?.totalMembers ?? 0) > 0;
    if (hasFoundationTotals) return false;

    // Wait until every card has reported its hasData state before evaluating
    // emptiness. Otherwise the page renders the cards first and then snaps
    // to the full-page empty state once children emit hasDataChange, which
    // causes a visible flicker dependent on per-card API latency.
    const states = this.cardDataStates();
    const allReported = this.cardNames.every((name) => name in states);
    if (!allReported) return false;

    return this.cardNames.every((name) => states[name] === false);
  });

  protected readonly yearOptions = computed(() => buildHealthMetricsYearOptions());

  protected readonly dateRangeLabel = computed(() => {
    const range = this.selectedRange();
    const now = new Date();

    if (range === 'YTD') {
      const start = new Date(now.getFullYear(), 0, 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const end = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      return `${start} \u2013 ${end}`;
    }

    const year = getYearForRange(range);
    const start = new Date(year, 0, 1).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const end = new Date(year, 11, 31).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `${start} \u2013 ${end}`;
  });

  protected readonly displayCards = computed((): DisplayCard[] => {
    const data = this.metricsData();
    const rawValues: Record<string, number | null> = {
      totalValue: data.totalValue?.totalValue ?? null,
      projects: data.totalProjects?.totalProjects ?? null,
      members: data.totalMembers?.totalMembers ?? null,
      flywheel: data.flywheel?.conversionRate ?? null,
    };

    return HEALTH_METRICS_SUMMARY_CARDS.map((config) => {
      const raw = rawValues[config.key];
      const card: DisplayCard = { config, value: '\u2014' };

      if (raw !== null) {
        card.value = this.formatByType(raw, config.format);
      }

      if (config.key === 'flywheel' && data.flywheel) {
        card.changePercentage = `${data.flywheel.changePercentage >= 0 ? '+' : ''}${data.flywheel.changePercentage.toFixed(2)}%`;
        card.trend = data.flywheel.trend as 'up' | 'down';
      }

      return card;
    });
  });

  public constructor() {
    this.initializeDataFetching();
  }

  protected selectRange(range: HealthMetricsRange): void {
    this.selectedRange.set(range);
  }

  protected updateCardDataState(name: string, hasData: boolean): void {
    this.cardDataStates.update((s) => ({ ...s, [name]: hasData }));
  }

  private initializeDataFetching(): void {
    toObservable(this.projectContextService.selectedFoundation)
      .pipe(
        map((foundation) => foundation?.slug || ''),
        filter((slug) => !!slug),
        tap(() => {
          this.loading.set(true);
          this.metricsData.set(DEFAULT_DATA);
          // Reset per-card data states so stale values from a previous
          // foundation don't incorrectly trigger the full-page empty state
          // while child cards re-fetch and re-emit hasDataChange.
          this.cardDataStates.set({});
        }),
        switchMap((slug) =>
          forkJoin({
            totalValue: this.analyticsService.getFoundationValueConcentration(slug).pipe(catchError(() => of(null))),
            totalProjects: this.analyticsService.getFoundationTotalProjects(slug).pipe(catchError(() => of(null))),
            totalMembers: this.analyticsService.getFoundationTotalMembers(slug).pipe(catchError(() => of(null))),
            flywheel: this.analyticsService.getFlywheelConversion(slug),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.metricsData.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  private formatByType(value: number, format: string): string {
    switch (format) {
      case 'currency':
        return `$${this.formatSoftwareValue(value)}`;
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'count':
      default:
        return value.toLocaleString();
    }
  }

  private formatSoftwareValue(valueInMillions: number): string {
    if (valueInMillions >= 1000) {
      const billions = valueInMillions / 1000;
      return `${billions.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}B`;
    }
    return `${valueInMillions.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  }
}
