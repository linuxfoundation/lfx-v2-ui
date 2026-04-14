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

import type { TrainingCertificationSummaryResponse } from '@lfx-one/shared/interfaces';

type CardMode = 'enrollment' | 'revenue';

const DEFAULT_SUMMARY: TrainingCertificationSummaryResponse = {
  projectId: '',
  range: 'YTD',
  enrollment: { instructorLed: 0, eLearning: 0, certExams: 0, edx: 0 },
  revenue: { instructorLed: 0, eLearning: 0, certExams: 0 },
};

@Component({
  selector: 'lfx-training-certification-card',
  standalone: true,
  imports: [SkeletonModule],
  templateUrl: './training-certification-card.component.html',
  styleUrl: './training-certification-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingCertificationCardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly loading = signal(true);
  protected readonly summaryData = signal<TrainingCertificationSummaryResponse>(DEFAULT_SUMMARY);
  protected readonly activeMode = signal<CardMode>('enrollment');

  protected readonly activeMetrics = computed(() => {
    const mode = this.activeMode();
    if (mode === 'enrollment') {
      const e = this.summaryData().enrollment;
      return [
        { label: 'Instructor Led', formatted: this.formatValue(e.instructorLed, 'enrollment') },
        { label: 'eLearning', formatted: this.formatValue(e.eLearning, 'enrollment') },
        { label: 'Cert Exams', formatted: this.formatValue(e.certExams, 'enrollment') },
        { label: 'edX', formatted: this.formatValue(e.edx, 'enrollment') },
      ];
    }
    const r = this.summaryData().revenue;
    return [
      { label: 'Instructor Led', formatted: this.formatValue(r.instructorLed, 'revenue') },
      { label: 'eLearning', formatted: this.formatValue(r.eLearning, 'revenue') },
      { label: 'Cert Exams', formatted: this.formatValue(r.certExams, 'revenue') },
    ];
  });

  protected readonly activeModeLabel = computed(() => {
    return this.activeMode() === 'enrollment' ? 'Enrollment' : 'Revenue';
  });

  protected readonly exploreMoreUrl = computed(() => {
    const data = this.summaryData();
    if (!data.projectId) return '';
    const pccBaseUrl = environment.urls.pcc;
    const baseUrl = pccBaseUrl.endsWith('/') ? pccBaseUrl.slice(0, -1) : pccBaseUrl;
    return `${baseUrl}/project/${data.projectId}/reports/health-metrics/training`;
  });

  public constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeDataFetching();
    }
  }

  protected setMode(mode: CardMode): void {
    this.activeMode.set(mode);
  }

  protected downloadCard(): void {
    // TODO: Implement download-as-PNG when html2canvas is added as a project dependency
  }

  private formatValue(value: number, mode: CardMode): string {
    if (mode === 'revenue') {
      if (value >= 1_000_000) {
        return `$${(value / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}M`;
      }
      if (value >= 1_000) {
        return `$${(value / 1_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}K`;
      }
      return `$${value.toLocaleString()}`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}K`;
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
        switchMap((slug) => this.analyticsService.getTrainingCertificationSummary(slug)),
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
