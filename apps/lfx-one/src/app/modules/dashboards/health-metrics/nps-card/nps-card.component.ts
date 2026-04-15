// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { SkeletonModule } from 'primeng/skeleton';
import { HEALTH_METRICS_NPS_DEFAULT_SUMMARY } from '@lfx-one/shared/constants';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { catchError, filter, map, of, switchMap, tap } from 'rxjs';
import { environment } from '@environments/environment';

import type { NpsSummaryResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-nps-card',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './nps-card.component.html',
  styleUrl: './nps-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpsCardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly loading = signal(true);
  protected readonly summaryData = signal<NpsSummaryResponse>(HEALTH_METRICS_NPS_DEFAULT_SUMMARY);

  private static readonly ARC_LENGTH = Math.PI * 80; // semicircle radius 80 ≈ 251.3

  protected readonly arcFillLength = computed(() => {
    const score = this.summaryData().npsScore;
    const clamped = Math.max(-100, Math.min(100, score));
    const ratio = (clamped + 100) / 200;
    return ratio * NpsCardComponent.ARC_LENGTH;
  });

  protected readonly arcTotalLength = NpsCardComponent.ARC_LENGTH;

  protected readonly formattedScore = computed(() => {
    const score = this.summaryData().npsScore;
    return score > 0 ? `+${score}` : `${score}`;
  });

  protected readonly exploreMoreUrl = computed(() => {
    const data = this.summaryData();
    if (!data.projectId) return '';
    const pccBaseUrl = environment.urls.pcc;
    const baseUrl = pccBaseUrl.endsWith('/') ? pccBaseUrl.slice(0, -1) : pccBaseUrl;
    return `${baseUrl}/project/${data.projectId}/reports/health-metrics/nps-details`;
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
          this.summaryData.set(HEALTH_METRICS_NPS_DEFAULT_SUMMARY);
        }),
        switchMap((slug) =>
          this.analyticsService.getNpsSummary(slug).pipe(
            catchError(() => of(HEALTH_METRICS_NPS_DEFAULT_SUMMARY))
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
