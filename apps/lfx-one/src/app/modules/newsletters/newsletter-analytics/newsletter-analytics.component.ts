// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, PLATFORM_ID, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { NewsletterAnalytics } from '@lfx-one/shared/interfaces';
import { NewsletterService } from '@services/newsletter.service';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, finalize, of, switchMap, take } from 'rxjs';

@Component({
  selector: 'lfx-newsletter-analytics',
  imports: [DatePipe, CardComponent, ChartComponent, EmptyStateComponent, SkeletonModule],
  templateUrl: './newsletter-analytics.component.html',
  styleUrl: './newsletter-analytics.component.scss',
})
export class NewsletterAnalyticsComponent {
  // === Services ===
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly newsletterService = inject(NewsletterService);
  private readonly messageService = inject(MessageService);
  private readonly platformId = inject(PLATFORM_ID);

  // === Signals ===
  protected readonly analytics = signal<NewsletterAnalytics | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly openRatePercent = computed(() => {
    const a = this.analytics();
    if (!a) return null;
    return Math.round((a.openRate ?? 0) * 100);
  });
  protected readonly hasOpens = computed(() => (this.analytics()?.totalOpens ?? 0) > 0);
  protected readonly canRenderChart = signal<boolean>(false);

  protected readonly chartData: Signal<any> = computed(() => {
    const a = this.analytics();
    if (!a || !this.canRenderChart()) return null;
    const dates = a.dailyOpens.map((d) => d.date);
    const totalOpens = a.dailyOpens.map((d) => d.opens);
    const uniqueOpens = a.dailyOpens.map((d) => d.uniqueOpens);
    return {
      labels: dates,
      datasets: [
        {
          label: 'Total opens',
          data: totalOpens,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.3,
          fill: true,
        },
        {
          label: 'Unique opens',
          data: uniqueOpens,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          fill: true,
        },
      ],
    };
  });

  protected readonly chartOptions = computed<Record<string, unknown>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  }));

  public constructor() {
    // Lazy chart rendering on the browser only — Chart.js touches `window` on init.
    if (isPlatformBrowser(this.platformId)) {
      this.canRenderChart.set(true);
    }

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.loading.set(false);
            this.loadError.set('Missing newsletter id.');
            return of(null);
          }
          this.loading.set(true);
          this.loadError.set(null);
          return this.newsletterService.getAnalytics(id).pipe(
            take(1),
            catchError((err: HttpErrorResponse) => {
              this.loadError.set(err?.error?.message || err?.message || 'Could not load analytics. Please try again.');
              this.messageService.add({
                severity: 'error',
                summary: 'Could not load analytics',
                detail: this.loadError() ?? '',
              });
              return of(null);
            }),
            finalize(() => this.loading.set(false))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((data) => {
        this.analytics.set(data);
      });
  }

  // The `:id/analytics` route has two URL segments, so `['..']` resolves to
  // `/<id>` which doesn't match any route. Anchor to `this.route.parent` (the
  // newsletter module root) and navigate to the explicit `list` child.
  protected goBack(): void {
    this.router.navigate(['list'], { relativeTo: this.route.parent });
  }
}
