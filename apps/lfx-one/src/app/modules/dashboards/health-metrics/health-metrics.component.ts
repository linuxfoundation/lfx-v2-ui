// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SkeletonModule } from 'primeng/skeleton';
import { HEALTH_METRICS_STATUS_COUNT, HEALTH_METRICS_SUMMARY_CARDS } from '@lfx-one/shared/constants';
import { AnalyticsService } from '@services/analytics.service';
import { PersonaService } from '@services/persona.service';
import { ProjectContextService } from '@services/project-context.service';
import { catchError, filter, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { MembershipChurnTierCardComponent } from './membership-churn-tier-card/membership-churn-tier-card.component';
import { NpsCardComponent } from './nps-card/nps-card.component';
import { OutstandingBalanceCardComponent } from './outstanding-balance-card/outstanding-balance-card.component';
import { ParticipatingOrgsCardComponent } from './participating-orgs-card/participating-orgs-card.component';
import { EventsCardComponent } from './events-card/events-card.component';
import { TrainingCertificationCardComponent } from './training-certification-card/training-certification-card.component';
import { CodeContributionCardComponent } from './code-contribution-card/code-contribution-card.component';

import type {
  FlywheelConversionResponse,
  FoundationTotalMembersResponse,
  FoundationTotalProjectsResponse,
  FoundationValueConcentrationResponse,
  HealthMetricsSummaryCard,
} from '@lfx-one/shared/interfaces';

interface HealthMetricsData {
  totalValue: FoundationValueConcentrationResponse | null;
  totalProjects: FoundationTotalProjectsResponse | null;
  totalMembers: FoundationTotalMembersResponse | null;
  flywheel: FlywheelConversionResponse | null;
}

interface DisplayCard {
  config: HealthMetricsSummaryCard;
  value: string;
  changePercentage?: string;
  trend?: 'up' | 'down';
}

const DEFAULT_DATA: HealthMetricsData = {
  totalValue: null,
  totalProjects: null,
  totalMembers: null,
  flywheel: null,
};

@Component({
  selector: 'lfx-health-metrics',
  standalone: true,
  imports: [NgClass, SkeletonModule, MembershipChurnTierCardComponent, NpsCardComponent, OutstandingBalanceCardComponent, ParticipatingOrgsCardComponent, EventsCardComponent, TrainingCertificationCardComponent, CodeContributionCardComponent],
  templateUrl: './health-metrics.component.html',
  styleUrl: './health-metrics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HealthMetricsComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly personaService = inject(PersonaService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly metricsData = signal<HealthMetricsData>(DEFAULT_DATA);
  protected readonly statusCount = HEALTH_METRICS_STATUS_COUNT;

  protected readonly hasFoundation = computed(() => !!this.projectContextService.selectedFoundation());

  protected readonly ytdDateRange = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const startDate = new Date(year, 0, 1);
    const start = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const end = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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
    if (isPlatformBrowser(this.platformId)) {
      effect(() => {
        const persona = this.personaService.currentPersona();
        if (persona && persona !== 'executive-director') {
          this.router.navigate(['/foundation/overview']);
        }
      });
    }

    this.initializeDataFetching();
  }

  private initializeDataFetching(): void {
    toObservable(this.projectContextService.selectedFoundation)
      .pipe(
        map((foundation) => foundation?.slug || ''),
        filter((slug) => !!slug),
        tap(() => {
          this.loading.set(true);
          this.metricsData.set(DEFAULT_DATA);
        }),
        switchMap((slug) =>
          forkJoin({
            totalValue: this.analyticsService.getFoundationValueConcentration(slug).pipe(catchError(() => of(null))),
            totalProjects: this.analyticsService.getFoundationTotalProjects(slug).pipe(catchError(() => of(null))),
            totalMembers: this.analyticsService.getFoundationTotalMembers(slug).pipe(catchError(() => of(null))),
            flywheel: this.analyticsService.getFlywheelConversion(slug).pipe(catchError(() => of(null))),
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((data) => {
        this.metricsData.set(data);
        this.loading.set(false);
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
