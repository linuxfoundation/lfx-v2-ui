// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DataCopilotComponent } from '@app/shared/components/data-copilot/data-copilot.component';
import { FilterOption, FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';
import { TagComponent } from '@components/tag/tag.component';
import { BASE_BAR_CHART_OPTIONS, BASE_LINE_CHART_OPTIONS, PRIMARY_INVOLVEMENT_METRICS } from '@lfx-one/shared/constants';
import type { DashboardMetricCard } from '@lfx-one/shared/interfaces';
import { AccountContextService } from '@services/account-context.service';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { combineLatest, finalize, map, of, switchMap } from 'rxjs';

import type { TooltipItem } from 'chart.js';

@Component({
  selector: 'lfx-organization-involvement',
  standalone: true,
  imports: [CommonModule, FilterPillsComponent, MetricCardComponent, TagComponent, DataCopilotComponent],
  templateUrl: './organization-involvement.component.html',
  styleUrl: './organization-involvement.component.scss',
})
export class OrganizationInvolvementComponent {
  @ViewChild('carouselScroll') public carouselScrollContainer!: ElementRef;

  private readonly analyticsService = inject(AnalyticsService);
  private readonly accountContextService = inject(AccountContextService);
  private readonly projectContextService = inject(ProjectContextService);

  private readonly contributionsLoading = signal(true);
  private readonly dashboardLoading = signal(true);
  private readonly eventsLoading = signal(true);
  private readonly selectedAccountId$ = toObservable(this.accountContextService.selectedAccount).pipe(map((account) => account.accountId));
  private readonly selectedFoundationSlug$ = toObservable(this.projectContextService.selectedFoundation).pipe(map((foundation) => foundation?.slug || ''));
  public readonly hasFoundationSelected = computed<boolean>(() => !!this.projectContextService.selectedFoundation());
  private readonly contributionsOverviewData = this.initializeContributionsOverviewData();
  private readonly boardMemberDashboardData = this.initializeBoardMemberDashboardData();
  private readonly eventsOverviewData = this.initializeEventsOverviewData();
  public readonly isLoading = computed<boolean>(() => this.contributionsLoading() || this.dashboardLoading() || this.eventsLoading());
  public readonly selectedFilter = signal<string>('all');
  public readonly accountName = computed<string>(() => this.accountContextService.selectedAccount().accountName || 'Organization');
  private readonly lineChartOptions = BASE_LINE_CHART_OPTIONS;
  private readonly barChartOptions = BASE_BAR_CHART_OPTIONS;

  private readonly activeContributorsChartOptions = {
    ...BASE_BAR_CHART_OPTIONS,
    plugins: {
      ...BASE_BAR_CHART_OPTIONS.plugins,
      tooltip: {
        ...(BASE_BAR_CHART_OPTIONS.plugins?.tooltip ?? {}),
        callbacks: {
          title: (context: TooltipItem<'bar'>[]) => context[0].label,
          label: (context: TooltipItem<'bar'>) => {
            const count = context.parsed.y;
            return `Active contributors: ${count}`;
          },
        },
      },
    },
  };

  private readonly maintainersChartOptions = {
    ...BASE_BAR_CHART_OPTIONS,
    plugins: {
      ...BASE_BAR_CHART_OPTIONS.plugins,
      tooltip: {
        ...(BASE_BAR_CHART_OPTIONS.plugins?.tooltip ?? {}),
        callbacks: {
          title: (context: TooltipItem<'bar'>[]) => context[0].label,
          label: (context: TooltipItem<'bar'>) => {
            const count = context.parsed.y;
            return `Maintainers: ${count}`;
          },
        },
      },
    },
  };

  private readonly eventAttendeesChartOptions = {
    ...BASE_LINE_CHART_OPTIONS,
    plugins: {
      ...BASE_LINE_CHART_OPTIONS.plugins,
      tooltip: {
        ...(BASE_LINE_CHART_OPTIONS.plugins?.tooltip ?? {}),
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => context[0].label,
          label: (context: TooltipItem<'line'>) => {
            const count = context.parsed.y;
            return `Event attendees: ${count}`;
          },
        },
      },
    },
  };

  private readonly eventSpeakersChartOptions = {
    ...BASE_LINE_CHART_OPTIONS,
    plugins: {
      ...BASE_LINE_CHART_OPTIONS.plugins,
      tooltip: {
        ...(BASE_LINE_CHART_OPTIONS.plugins?.tooltip ?? {}),
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => context[0].label,
          label: (context: TooltipItem<'line'>) => {
            const count = context.parsed.y;
            return `Event speakers: ${count}`;
          },
        },
      },
    },
  };

  private readonly certifiedEmployeesChartOptions = {
    ...BASE_LINE_CHART_OPTIONS,
    plugins: {
      ...BASE_LINE_CHART_OPTIONS.plugins,
      tooltip: {
        ...(BASE_LINE_CHART_OPTIONS.plugins?.tooltip ?? {}),
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => context[0].label,
          label: (context: TooltipItem<'line'>) => {
            const count = context.parsed.y;
            return `Certified employees: ${count}`;
          },
        },
      },
    },
  };

  private readonly trainingEnrollmentsChartOptions = {
    ...BASE_LINE_CHART_OPTIONS,
    plugins: {
      ...BASE_LINE_CHART_OPTIONS.plugins,
      tooltip: {
        ...(BASE_LINE_CHART_OPTIONS.plugins?.tooltip ?? {}),
        callbacks: {
          title: (context: TooltipItem<'line'>[]) => context[0].label,
          label: (context: TooltipItem<'line'>) => {
            const count = context.parsed.y;
            return `Training enrollments: ${count}`;
          },
        },
      },
    },
  };
  public readonly filterOptions: FilterOption[] = [
    { id: 'all', label: 'All' },
    { id: 'contributions', label: 'Contribution' },
    { id: 'events', label: 'Event' },
    { id: 'education', label: 'Education' },
  ];

  public readonly primaryMetrics = computed<DashboardMetricCard[]>((): DashboardMetricCard[] => {
    const contributionsData = this.contributionsOverviewData();
    const dashboardData = this.boardMemberDashboardData();
    const eventsData = this.eventsOverviewData();
    const filter = this.selectedFilter();

    const allMetrics = PRIMARY_INVOLVEMENT_METRICS.map((metric) => {
      if (metric.title === 'Active Contributors') {
        return this.transformActiveContributors(contributionsData.contributors, metric);
      }
      if (metric.title === 'Maintainers') {
        return this.transformMaintainers(contributionsData.maintainers, metric);
      }
      if (metric.title === 'Event Attendees') {
        return this.transformEventAttendees(eventsData.eventAttendance, metric);
      }
      if (metric.title === 'Event Speakers') {
        return this.transformEventSpeakers(eventsData.eventAttendance, metric);
      }
      if (metric.title === 'Certified Employees') {
        return this.transformCertifiedEmployees(dashboardData.certifiedEmployees, metric);
      }
      if (metric.title === 'Training Enrollments') {
        return this.transformTrainingEnrollments(metric);
      }
      if (metric.isMembershipTier) {
        return this.transformMembershipTier(dashboardData.membershipTier, metric);
      }
      return this.transformDefaultMetric(metric);
    });

    // Filter metrics based on selected filter
    if (filter === 'all') {
      return allMetrics;
    }

    // Always show Membership Tier
    const filteredMetrics = allMetrics.filter((metric) => {
      if (metric.isMembershipTier) return true;

      if (filter === 'contributions') {
        return metric.title === 'Active Contributors' || metric.title === 'Maintainers';
      }
      if (filter === 'events') {
        return metric.title === 'Event Attendees' || metric.title === 'Event Speakers';
      }
      if (filter === 'education') {
        return metric.title === 'Certified Employees' || metric.title === 'Training Enrollments';
      }
      return false;
    });

    return filteredMetrics;
  });

  public handleFilterChange(filter: string): void {
    this.selectedFilter.set(filter);
  }

  public scrollLeft(): void {
    if (!this.carouselScrollContainer?.nativeElement) return;
    const container = this.carouselScrollContainer.nativeElement;
    container.scrollBy({ left: -300, behavior: 'smooth' });
  }

  public scrollRight(): void {
    if (!this.carouselScrollContainer?.nativeElement) return;
    const container = this.carouselScrollContainer.nativeElement;
    container.scrollBy({ left: 300, behavior: 'smooth' });
  }

  private initializeContributionsOverviewData() {
    return toSignal(
      this.selectedAccountId$.pipe(
        switchMap((accountId) => {
          this.contributionsLoading.set(true);
          return this.analyticsService.getOrganizationContributionsOverview(accountId).pipe(finalize(() => this.contributionsLoading.set(false)));
        })
      ),
      {
        initialValue: {
          maintainers: {
            maintainers: 0,
            projects: 0,
          },
          contributors: {
            contributors: 0,
            projects: 0,
          },
          technicalCommittee: {
            totalRepresentatives: 0,
            totalProjects: 0,
          },
          accountId: '',
          accountName: '',
        },
      }
    );
  }

  private initializeBoardMemberDashboardData() {
    return toSignal(
      combineLatest([this.selectedAccountId$, this.selectedFoundationSlug$]).pipe(
        switchMap(([accountId, foundationSlug]) => {
          this.dashboardLoading.set(true);

          // Return empty data if no foundation is selected
          if (!foundationSlug) {
            this.dashboardLoading.set(false);
            return of({
              membershipTier: {
                tier: '',
                membershipStartDate: '',
                membershipEndDate: '',
                membershipStatus: '',
              },
              certifiedEmployees: {
                certifications: 0,
                certifiedEmployees: 0,
              },
              accountId: '',
              uid: '',
            });
          }

          return this.analyticsService.getBoardMemberDashboard(accountId, foundationSlug).pipe(finalize(() => this.dashboardLoading.set(false)));
        })
      ),
      {
        initialValue: {
          membershipTier: {
            tier: '',
            membershipStartDate: '',
            membershipEndDate: '',
            membershipStatus: '',
          },
          certifiedEmployees: {
            certifications: 0,
            certifiedEmployees: 0,
          },
          accountId: '',
          uid: '',
        },
      }
    );
  }

  private initializeEventsOverviewData() {
    return toSignal(
      this.selectedAccountId$.pipe(
        switchMap((accountId) => {
          this.eventsLoading.set(true);
          return this.analyticsService.getOrganizationEventsOverview(accountId).pipe(finalize(() => this.eventsLoading.set(false)));
        })
      ),
      {
        initialValue: {
          eventAttendance: {
            totalAttendees: 0,
            totalSpeakers: 0,
            totalEvents: 0,
            accountName: '',
          },
          accountId: '',
        },
      }
    );
  }

  private transformActiveContributors(data: { contributors: number; projects: number }, metric: DashboardMetricCard): DashboardMetricCard {
    return {
      ...metric,
      value: data.contributors.toString(),
      subtitle: 'Contributors from our organization',
      chartOptions: this.activeContributorsChartOptions,
    };
  }

  private transformMaintainers(data: { maintainers: number; projects: number }, metric: DashboardMetricCard): DashboardMetricCard {
    return {
      ...metric,
      value: data.maintainers.toString(),
      subtitle: `Across ${data.projects} projects`,
      chartOptions: this.maintainersChartOptions,
    };
  }

  private transformMembershipTier(
    data: {
      tier: string;
      membershipStartDate: string;
      membershipEndDate: string;
      membershipStatus: string;
    },
    metric: DashboardMetricCard
  ): DashboardMetricCard {
    if (!data.tier) {
      return {
        ...metric,
        value: 'No Membership',
        subtitle: 'Not a member',
        tier: '',
        tierSince: '',
        nextDue: '',
      };
    }

    const startDate = new Date(data.membershipStartDate);
    const endDate = new Date(data.membershipEndDate);
    const tierSince = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const nextDue = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    return {
      ...metric,
      value: data.tier,
      subtitle: `Active membership`,
      tier: data.tier,
      tierSince,
      nextDue,
    };
  }

  private transformEventAttendees(
    data: { totalAttendees: number; totalSpeakers: number; totalEvents: number; accountName: string },
    metric: DashboardMetricCard
  ): DashboardMetricCard {
    return {
      ...metric,
      value: data.totalAttendees.toString(),
      subtitle: 'Employees at foundation events',
      chartOptions: this.eventAttendeesChartOptions,
    };
  }

  private transformEventSpeakers(
    data: { totalAttendees: number; totalSpeakers: number; totalEvents: number; accountName: string },
    metric: DashboardMetricCard
  ): DashboardMetricCard {
    return {
      ...metric,
      value: data.totalSpeakers.toString(),
      subtitle: 'Employee speakers at events',
      chartOptions: this.eventSpeakersChartOptions,
    };
  }

  private transformCertifiedEmployees(data: { certifications: number; certifiedEmployees: number }, metric: DashboardMetricCard): DashboardMetricCard {
    return {
      ...metric,
      value: `${data.certifiedEmployees} employees`,
      subtitle: `${data.certifications} total certifications`,
      chartOptions: this.certifiedEmployeesChartOptions,
    };
  }

  private transformTrainingEnrollments(metric: DashboardMetricCard): DashboardMetricCard {
    return {
      ...metric,
      value: '156',
      subtitle: 'Employees enrolled in training',
      chartOptions: this.trainingEnrollmentsChartOptions,
    };
  }

  private transformDefaultMetric(metric: DashboardMetricCard): DashboardMetricCard {
    return {
      ...metric,
      value: metric.value ?? 'N/A',
      subtitle: metric.subtitle ?? 'No data available',
      chartOptions: metric.chartType === 'bar' ? this.barChartOptions : this.lineChartOptions,
    };
  }
}
