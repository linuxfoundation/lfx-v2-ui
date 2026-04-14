// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { filter, map, switchMap, tap } from 'rxjs';

import type { CodeContributionSummaryResponse } from '@lfx-one/shared/interfaces';

const DEFAULT_SUMMARY: CodeContributionSummaryResponse = {
  dataAvailable: false,
  projectId: '',
  projectSlug: '',
  range: 'YTD',
  totalContributors: 0,
  totalContributorsChange: 0,
  newContributors: 0,
  newContributorsChange: 0,
  committers: 0,
  maintainers: 0,
  reviewers: 0,
};

@Component({
  selector: 'lfx-code-contribution-card',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './code-contribution-card.component.html',
  styleUrl: './code-contribution-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeContributionCardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly loading = signal(true);
  protected readonly summaryData = signal<CodeContributionSummaryResponse>(DEFAULT_SUMMARY);

  protected readonly hasContributorData = computed(() => this.summaryData().dataAvailable);

  protected readonly formattedTotalContributors = computed(() => {
    return this.abbreviateCount(this.summaryData().totalContributors);
  });

  protected readonly formattedNewContributors = computed(() => {
    return this.abbreviateCount(this.summaryData().newContributors);
  });

  protected readonly showTotalChange = computed(() => {
    const change = this.summaryData().totalContributorsChange;
    return change >= 0.01;
  });

  protected readonly formattedTotalChange = computed(() => {
    const pct = Math.abs(this.summaryData().totalContributorsChange * 100).toFixed(0);
    return `↑ ${pct}%`;
  });

  protected readonly showNewChange = computed(() => {
    const change = this.summaryData().newContributorsChange;
    return change >= 0.01;
  });

  protected readonly formattedNewChange = computed(() => {
    const pct = Math.abs(this.summaryData().newContributorsChange * 100).toFixed(0);
    return `↑ ${pct}%`;
  });

  protected readonly hasRoleData = computed(() => {
    const data = this.summaryData();
    return data.committers > 0 || data.maintainers > 0 || data.reviewers > 0;
  });

  protected readonly totalRoleCount = computed(() => {
    const data = this.summaryData();
    return data.committers + data.maintainers + data.reviewers;
  });

  protected readonly committersWidthPct = computed(() => {
    const total = this.totalRoleCount();
    if (total === 0) return 0;
    return (this.summaryData().committers / total) * 100;
  });

  protected readonly maintainersWidthPct = computed(() => {
    const total = this.totalRoleCount();
    if (total === 0) return 0;
    return (this.summaryData().maintainers / total) * 100;
  });

  protected readonly reviewersWidthPct = computed(() => {
    const committersW = this.committersWidthPct();
    const maintainersW = this.maintainersWidthPct();
    const total = this.totalRoleCount();
    if (total === 0) return 0;
    return 100 - committersW - maintainersW;
  });

  protected readonly formattedCommitters = computed(() => {
    return this.summaryData().committers.toLocaleString();
  });

  protected readonly formattedMaintainers = computed(() => {
    return this.summaryData().maintainers.toLocaleString();
  });

  protected readonly formattedReviewers = computed(() => {
    return this.summaryData().reviewers.toLocaleString();
  });

  protected readonly exploreMoreUrl = computed(() => {
    const slug = this.summaryData().projectSlug;
    if (!slug) return '';
    return `https://insights.linuxfoundation.org/project/${slug}/contributors`;
  });

  public constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDataFetching();
    }
  }

  protected downloadCard(): void {
    // TODO: Implement download-as-PNG when html2canvas is added as a project dependency
  }

  private abbreviateCount(value: number): string {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
    }
    return value.toLocaleString();
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
        switchMap((slug) => this.analyticsService.getCodeContributionSummary(slug)),
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
