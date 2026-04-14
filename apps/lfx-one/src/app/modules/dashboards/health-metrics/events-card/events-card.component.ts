// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { catchError, filter, map, of, switchMap, tap } from 'rxjs';
import { environment } from '@environments/environment';
import type { EventsSummaryResponse } from '@lfx-one/shared/interfaces';

const DEFAULT_SUMMARY: EventsSummaryResponse = {
  projectId: '',
  totalEvents: 0,
  eventChange: 0,
  sponsorshipRevenue: 0,
  sponsorshipGoal: 0,
  sponsorshipProgressPct: 0,
};

@Component({
  selector: 'lfx-events-card',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './events-card.component.html',
  styleUrl: './events-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsCardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly loading = signal(true);
  protected readonly summaryData = signal<EventsSummaryResponse>(DEFAULT_SUMMARY);

  protected readonly formattedTotalEvents = computed(() => {
    return this.summaryData().totalEvents.toLocaleString();
  });

  protected readonly changeDirection = computed((): 'up' | 'down' | 'neutral' => {
    const change = this.summaryData().eventChange;
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  });

  protected readonly formattedChange = computed(() => {
    const change = this.summaryData().eventChange;
    const pct = Math.abs(change * 100).toFixed(0);
    if (change > 0) return `↑ ${pct}%`;
    if (change < 0) return `↓ ${pct}%`;
    return '0%';
  });

  protected readonly showChangeIndicator = computed(() => {
    return this.summaryData().totalEvents > 0 || this.summaryData().eventChange !== 0;
  });

  protected readonly sponsorshipProgressWidth = computed(() => {
    const pct = this.summaryData().sponsorshipProgressPct;
    return Math.min(pct, 100);
  });

  protected readonly formattedProgressLabel = computed(() => {
    const pct = Math.round(this.summaryData().sponsorshipProgressPct);
    return `${pct}% of goal`;
  });

  protected readonly formattedRevenue = computed(() => {
    return this.abbreviateDollar(this.summaryData().sponsorshipRevenue);
  });

  protected readonly formattedGoal = computed(() => {
    return this.abbreviateDollar(this.summaryData().sponsorshipGoal);
  });

  protected readonly formattedDollarLabel = computed(() => {
    return `${this.formattedRevenue()} / ${this.formattedGoal()}`;
  });

  protected readonly exploreMoreUrl = computed(() => {
    const data = this.summaryData();
    if (!data.projectId) return '';
    const pccBaseUrl = environment.urls.pcc;
    const baseUrl = pccBaseUrl.endsWith('/') ? pccBaseUrl.slice(0, -1) : pccBaseUrl;
    return `${baseUrl}/project/${data.projectId}/reports/health-metrics/events`;
  });

  public constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDataFetching();
    }
  }

  protected downloadCard(): void {
    // TODO: Implement download-as-PNG when html2canvas is added as a project dependency
  }

  private initializeDataFetching(): void {
    toObservable(this.projectContextService.selectedFoundation)
      .pipe(
        map((foundation) => foundation?.slug || ''),
        filter((slug): slug is string => !!slug),
        tap(() => {
          this.loading.set(true);
          this.summaryData.set(DEFAULT_SUMMARY);
        }),
        switchMap((slug) =>
          this.analyticsService.getEventsSummary(slug).pipe(
            catchError(() => of(DEFAULT_SUMMARY))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.summaryData.set(data);
        this.loading.set(false);
      });
  }

  private abbreviateDollar(value: number): string {
    if (value >= 1_000_000) {
      const millions = value / 1_000_000;
      return `$${millions.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (value >= 1_000) {
      const thousands = value / 1_000;
      return `$${thousands.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}K`;
    }
    return `$${value.toLocaleString()}`;
  }
}
