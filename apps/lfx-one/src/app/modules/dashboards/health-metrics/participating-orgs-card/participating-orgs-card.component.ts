// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { HEALTH_METRICS_PARTICIPATING_ORGS_DEFAULT_SUMMARY, lfxColors } from '@lfx-one/shared/constants';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { filter, map, switchMap, tap } from 'rxjs';
import { environment } from '@environments/environment';

import type { EngagementSegment, ParticipatingOrgsSummaryResponse } from '@lfx-one/shared/interfaces';

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
  protected readonly summaryData = signal<ParticipatingOrgsSummaryResponse>(HEALTH_METRICS_PARTICIPATING_ORGS_DEFAULT_SUMMARY);

  protected readonly totalEngagement = computed(() => {
    const data = this.summaryData();
    return data.highEngagement + data.medEngagement + data.lowEngagement;
  });

  protected readonly segments = computed((): EngagementSegment[] => {
    const data = this.summaryData();
    const total = this.totalEngagement();
    if (total === 0) return [];

    const visible = [
      { label: 'High', count: data.highEngagement, color: lfxColors.emerald[300], dotColor: lfxColors.emerald[300] },
      { label: 'Medium', count: data.medEngagement, color: lfxColors.amber[200], dotColor: lfxColors.amber[200] },
      { label: 'Low', count: data.lowEngagement, color: lfxColors.red[200], dotColor: lfxColors.red[200] },
    ].filter((s) => s.count > 0);

    let usedPercent = 0;
    return visible.map((segment, index) => {
      const isLast = index === visible.length - 1;
      const percent = isLast ? 100 - usedPercent : Math.round((segment.count / total) * 100);
      usedPercent += percent;
      return { ...segment, percent };
    });
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
    const dominant = this.dominantSegment();
    if (total === 0 || !dominant) return '';

    const pctMap: Record<string, number> = {
      high: Math.round((data.highEngagement / total) * 100),
      medium: Math.round((data.medEngagement / total) * 100),
      low: Math.round((data.lowEngagement / total) * 100),
    };
    const pct = pctMap[dominant.level] ?? 0;

    const subtitleMap: Record<string, string> = {
      high: `${pct}% of members are highly engaged this period`,
      medium: `${pct}% of members show medium engagement this period`,
      low: `Only ${pct}% of members are highly engaged this period`,
    };
    return subtitleMap[dominant.level] ?? '';
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
          this.summaryData.set(HEALTH_METRICS_PARTICIPATING_ORGS_DEFAULT_SUMMARY);
        }),
        switchMap((slug) => this.analyticsService.getParticipatingOrgsSummary(slug)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.summaryData.set(data);
        this.loading.set(false);
      });
  }
}
