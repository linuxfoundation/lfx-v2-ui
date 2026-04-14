// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { filter, map, switchMap, tap } from 'rxjs';
import { environment } from '@environments/environment';

import type { MembershipChurnPerTierSummaryResponse } from '@lfx-one/shared/interfaces';

const DEFAULT_SUMMARY: MembershipChurnPerTierSummaryResponse = {
  projectId: '',
  range: 'YTD',
  comparisonAvailable: true,
  currentPeriod: { churnRatePct: 0, valueLost: 0, membersLost: 0 },
  previousYear: { churnRatePct: 0, valueLost: 0, membersLost: 0 },
  trend: null,
};

@Component({
  selector: 'lfx-membership-churn-tier-card',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './membership-churn-tier-card.component.html',
  styleUrl: './membership-churn-tier-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MembershipChurnTierCardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly loading = signal(true);
  protected readonly summaryData = signal<MembershipChurnPerTierSummaryResponse>(DEFAULT_SUMMARY);

  protected readonly currentPeriod = computed(() => this.summaryData().currentPeriod);
  protected readonly previousYear = computed(() => this.summaryData().previousYear);
  protected readonly comparisonAvailable = computed(() => this.summaryData().comparisonAvailable);
  protected readonly trend = computed(() => this.summaryData().trend);

  protected readonly formattedChurnRate = computed(() => {
    const pct = this.currentPeriod().churnRatePct;
    return `${pct.toFixed(1)}%`;
  });

  protected readonly formattedValueLostHeadline = computed(() => {
    const value = this.currentPeriod().valueLost;
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `$${Math.round(value / 1_000)}K`;
    }
    return `$${value.toLocaleString()}`;
  });

  protected readonly formattedMembersLost = computed(() => {
    return this.currentPeriod().membersLost.toLocaleString();
  });

  protected readonly currentPeriodLine = computed(() => {
    const p = this.currentPeriod();
    return `$${p.valueLost.toLocaleString()} lost \u00B7 ${p.membersLost} members`;
  });

  protected readonly previousYearLine = computed(() => {
    const p = this.previousYear();
    if (!p) return '';
    return `$${p.valueLost.toLocaleString()} lost \u00B7 ${p.membersLost} members`;
  });

  protected readonly isChurnWorsening = computed(() => {
    const pct = this.currentPeriod().churnRatePct;
    return pct > 0;
  });

  protected readonly exploreMoreUrl = computed(() => {
    const data = this.summaryData();
    if (!data.projectId) return '';
    const pccBaseUrl = environment.urls.pcc;
    const baseUrl = pccBaseUrl.endsWith('/') ? pccBaseUrl.slice(0, -1) : pccBaseUrl;
    return `${baseUrl}/project/${data.projectId}/reports/health-metrics/membership-churn`;
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
        switchMap((slug) => this.analyticsService.getMembershipChurnPerTierSummary(slug)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (data) => {
          this.summaryData.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }
}
