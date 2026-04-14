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
import type { OutstandingBalanceSummaryResponse } from '@lfx-one/shared/interfaces';

const DEFAULT_SUMMARY: OutstandingBalanceSummaryResponse = {
  projectId: '',
  totalOutstandingBalance: 0,
  totalMembersAtRisk: 0,
  primaryRiskLevel: null,
  primaryRiskAmount: 0,
  overdueBreakdown: {
    medium: { riskLevel: 'Medium', overdueRangeLabel: '60-89', outstandingBalance: 0, membersAtRisk: 0 },
    high: { riskLevel: 'High', overdueRangeLabel: '90+', outstandingBalance: 0, membersAtRisk: 0 },
  },
};

@Component({
  selector: 'lfx-outstanding-balance-card',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './outstanding-balance-card.component.html',
  styleUrl: './outstanding-balance-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OutstandingBalanceCardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly loading = signal(true);
  protected readonly summaryData = signal<OutstandingBalanceSummaryResponse>(DEFAULT_SUMMARY);
  protected readonly formattedBalance = computed(() => {
    const value = this.summaryData().totalOutstandingBalance;
    return `$${value.toLocaleString()}`;
  });

  protected readonly primaryRiskLevel = computed(() => this.summaryData().primaryRiskLevel);

  protected readonly formattedPrimaryRiskAmount = computed(() => {
    const value = this.summaryData().primaryRiskAmount;
    return `$${value.toLocaleString()}`;
  });

  protected readonly primaryRiskLabel = computed(() => {
    const level = this.primaryRiskLevel();
    if (!level) return 'No Risk';
    return `${level} Risk`;
  });

  protected readonly overdueBreakdown = computed(() => this.summaryData().overdueBreakdown);

  protected readonly warningBannerText = computed(() => {
    const count = this.summaryData().totalMembersAtRisk;
    if (count === 0) return '';
    return `${count} Member${count !== 1 ? 's' : ''} at Risk of Churn`;
  });

  protected readonly exploreMoreUrl = computed(() => {
    const data = this.summaryData();
    if (!data.projectId) return '';
    const pccBaseUrl = environment.urls.pcc;
    const baseUrl = pccBaseUrl.endsWith('/') ? pccBaseUrl.slice(0, -1) : pccBaseUrl;
    return `${baseUrl}/project/${data.projectId}/reports/health-metrics/outstanding-balance`;
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
        switchMap((slug) => this.analyticsService.getOutstandingBalanceSummary(slug)),
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
