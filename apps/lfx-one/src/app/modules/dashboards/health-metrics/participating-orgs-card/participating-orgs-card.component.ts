// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { lfxColors } from '@lfx-one/shared/constants';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { catchError, filter, map, of, switchMap, tap } from 'rxjs';
import { environment } from '@environments/environment';

import type { ParticipatingOrgsSummaryResponse } from '@lfx-one/shared/interfaces';

const DEFAULT_SUMMARY: ParticipatingOrgsSummaryResponse = {
  projectId: '',
  totalActiveMembers: 0,
  totalNewMembers: 0,
  highEngagement: 0,
  medEngagement: 0,
  lowEngagement: 0,
};

interface EngagementSegment {
  label: string;
  count: number;
  percent: number;
  color: string;
  dotColor: string;
}

@Component({
  selector: 'lfx-participating-orgs-card',
  standalone: true,
  imports: [NgClass, SkeletonModule],
  templateUrl: './participating-orgs-card.component.html',
  styleUrl: './participating-orgs-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParticipatingOrgsCardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly loading = signal(true);
  protected readonly summaryData = signal<ParticipatingOrgsSummaryResponse>(DEFAULT_SUMMARY);

  protected readonly totalEngagement = computed(() => {
    const data = this.summaryData();
    return data.highEngagement + data.medEngagement + data.lowEngagement;
  });

  protected readonly segments = computed((): EngagementSegment[] => {
    const data = this.summaryData();
    const total = this.totalEngagement();
    if (total === 0) return [];

    const raw: EngagementSegment[] = [
      { label: 'High', count: data.highEngagement, percent: Math.round((data.highEngagement / total) * 100), color: lfxColors.emerald[300], dotColor: lfxColors.emerald[300] },
      { label: 'Medium', count: data.medEngagement, percent: Math.round((data.medEngagement / total) * 100), color: lfxColors.amber[200], dotColor: lfxColors.amber[200] },
      { label: 'Low', count: data.lowEngagement, percent: Math.round((data.lowEngagement / total) * 100), color: lfxColors.red[200], dotColor: lfxColors.red[200] },
    ];

    return raw.filter((s) => s.count > 0);
  });

  protected readonly dominantSegment = computed(() => {
    const data = this.summaryData();
    const total = this.totalEngagement();
    if (total === 0) return null;

    const highPct = Math.round((data.highEngagement / total) * 100);
    const lowPct = Math.round((data.lowEngagement / total) * 100);

    if (lowPct >= 50) return { level: 'low' as const, percent: lowPct };
    if (highPct >= 50) return { level: 'high' as const, percent: highPct };

    const segments = [
      { level: 'high' as const, percent: highPct },
      { level: 'medium' as const, percent: Math.round((data.medEngagement / total) * 100) },
      { level: 'low' as const, percent: lowPct },
    ];
    return segments.reduce((max, s) => (s.percent > max.percent ? s : max));
  });

  protected readonly isLowDominant = computed(() => this.dominantSegment()?.level === 'low');

  protected readonly alertMessage = computed(() => {
    const dominant = this.dominantSegment();
    if (!dominant) return '';
    const levelLabels: Record<string, string> = { high: 'High', medium: 'Medium', low: 'Low' };
    const label = levelLabels[dominant.level] ?? 'Low';
    return `${dominant.percent}% ${label} Engagement`;
  });

  protected readonly alertSubtitle = computed(() => {
    const data = this.summaryData();
    const total = this.totalEngagement();
    if (total === 0) return '';
    const highPct = Math.round((data.highEngagement / total) * 100);
    return `Only ${highPct}% of members are highly engaged this period`;
  });

  protected readonly alertBgClass = computed(() => {
    const dominant = this.dominantSegment();
    if (!dominant) return '';
    const bgMap: Record<string, string> = { high: 'bg-emerald-50', medium: 'bg-amber-50', low: 'bg-red-50' };
    return bgMap[dominant.level] ?? 'bg-red-50';
  });

  protected readonly exploreMoreUrl = computed(() => {
    const data = this.summaryData();
    if (!data.projectId) return '';
    const pccBaseUrl = environment.urls.pcc;
    const baseUrl = pccBaseUrl.endsWith('/') ? pccBaseUrl.slice(0, -1) : pccBaseUrl;
    return `${baseUrl}/project/${data.projectId}/reports/health-metrics/members`;
  });

  public constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDataFetching();
    }
  }

  protected downloadCard(): void {
    // TODO: Implement download-as-PNG when html2canvas is added as a project dependency
    // Install with: npm install html2canvas @types/html2canvas
    // Then use: import('html2canvas').then(mod => mod.default(el, options))
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
          this.analyticsService.getParticipatingOrgsSummary(slug).pipe(
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
}
