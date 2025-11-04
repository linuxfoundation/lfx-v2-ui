// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AccountContextService } from '@app/shared/services/account-context.service';
import { AnalyticsService } from '@app/shared/services/analytics.service';
import { ChartComponent } from '@components/chart/chart.component';
import { CONTRIBUTIONS_METRICS, IMPACT_METRICS, PRIMARY_INVOLVEMENT_METRICS } from '@lfx-one/shared/constants';
import {
  ContributionMetric,
  ImpactMetric,
  MembershipTierResponse,
  OrganizationContributorsResponse,
  OrganizationEventSponsorshipsResponse,
  OrganizationInvolvementMetricWithChart,
  OrganizationMaintainersResponse,
  PrimaryInvolvementMetric,
} from '@lfx-one/shared/interfaces';
import { hexToRgba } from '@lfx-one/shared/utils';
import { map, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-organization-involvement',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  providers: [CurrencyPipe],
  templateUrl: './organization-involvement.component.html',
  styleUrl: './organization-involvement.component.scss',
})
export class OrganizationInvolvementComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly accountContextService = inject(AccountContextService);
  private readonly currencyPipe = inject(CurrencyPipe);

  private readonly selectedAccountId$ = toObservable(this.accountContextService.selectedAccount).pipe(map((account) => account.accountId));

  private readonly organizationMaintainersData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationMaintainers(accountId))),
    {
      initialValue: {
        maintainers: 0,
        projects: 0,
        accountId: '',
      },
    }
  );

  private readonly organizationContributorsData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationContributors(accountId))),
    {
      initialValue: {
        contributors: 0,
        accountId: '',
        accountName: '',
        projects: 0,
      },
    }
  );

  private readonly membershipTierData = toSignal(this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getMembershipTier(accountId))), {
    initialValue: {
      tier: '',
      membershipStartDate: '',
      membershipEndDate: '',
      membershipPrice: 0,
      membershipStatus: '',
      accountId: '',
    },
  });

  private readonly eventAttendanceData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationEventAttendance(accountId))),
    {
      initialValue: {
        totalAttendees: 0,
        totalSpeakers: 0,
        totalEvents: 0,
        accountId: '',
        accountName: '',
      },
    }
  );

  private readonly technicalCommitteeData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationTechnicalCommittee(accountId))),
    {
      initialValue: {
        totalRepresentatives: 0,
        totalProjects: 0,
        accountId: '',
      },
    }
  );

  private readonly projectsParticipatingData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationProjectsParticipating(accountId))),
    {
      initialValue: {
        projectsParticipating: 0,
        accountId: '',
        segmentId: '',
      },
    }
  );

  private readonly totalCommitsData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationTotalCommits(accountId))),
    {
      initialValue: {
        totalCommits: 0,
        accountId: '',
        segmentId: '',
      },
    }
  );

  private readonly certifiedEmployeesData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationCertifiedEmployees(accountId))),
    {
      initialValue: {
        certifications: 0,
        certifiedEmployees: 0,
        accountId: '',
      },
    }
  );

  private readonly boardMeetingAttendanceData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationBoardMeetingAttendance(accountId))),
    {
      initialValue: {
        totalMeetings: 0,
        attendedMeetings: 0,
        notAttendedMeetings: 0,
        attendancePercentage: 0,
        accountId: '',
      },
    }
  );

  private readonly eventSponsorshipsData = toSignal(
    this.selectedAccountId$.pipe(switchMap((accountId) => this.analyticsService.getOrganizationEventSponsorships(accountId))),
    {
      initialValue: {
        currencySummaries: [],
        totalEvents: 0,
        accountId: '',
      },
    }
  );

  protected readonly isLoading = computed<boolean>(() => {
    const maintainersData = this.organizationMaintainersData();
    const contributorsData = this.organizationContributorsData();
    const tierData = this.membershipTierData();
    return maintainersData.maintainers === 0 && contributorsData.contributors === 0 && tierData.tier === '';
  });

  protected readonly sparklineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  protected readonly barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    datasets: {
      bar: {
        barPercentage: 0.9,
        categoryPercentage: 0.95,
        borderRadius: 4,
        borderSkipped: false,
      },
    },
  };

  protected readonly contributionsMetrics = computed<ContributionMetric[]>((): ContributionMetric[] => {
    const techCommitteeData = this.technicalCommitteeData();
    const commitsData = this.totalCommitsData();
    const boardMeetingData = this.boardMeetingAttendanceData();

    return CONTRIBUTIONS_METRICS.map((metric) => {
      if (metric.title === 'TOC/TSC/TAG Participation') {
        return {
          ...metric,
          descriptiveValue: `${techCommitteeData.totalRepresentatives} representatives`,
          isConnected: true,
        };
      }
      if (metric.title === 'Total Commits') {
        return {
          ...metric,
          descriptiveValue: `${commitsData.totalCommits.toLocaleString()} commits`,
          isConnected: true,
        };
      }
      if (metric.title === 'Board Meetings Participation') {
        const percentage = boardMeetingData.attendancePercentage.toFixed(0);
        return {
          ...metric,
          descriptiveValue: `${percentage}% attendance`,
          isConnected: true,
        };
      }
      return {
        ...metric,
        isConnected: false, // Hardcoded data
      };
    });
  });

  protected readonly impactMetrics = computed<ImpactMetric[]>((): ImpactMetric[] => {
    const eventData = this.eventAttendanceData();
    const projectsData = this.projectsParticipatingData();
    const certifiedData = this.certifiedEmployeesData();

    return IMPACT_METRICS.map((metric) => {
      if (metric.title === 'Event Attendees') {
        return {
          ...metric,
          descriptiveValue: `${eventData.totalAttendees} employees`,
          isConnected: true,
        };
      }
      if (metric.title === 'Event Speakers') {
        return {
          ...metric,
          descriptiveValue: `${eventData.totalSpeakers} speakers`,
          isConnected: true,
        };
      }
      if (metric.title === 'Projects Participating') {
        return {
          ...metric,
          descriptiveValue: `${projectsData.projectsParticipating} projects`,
          isConnected: true,
        };
      }
      if (metric.title === 'Certified Employees') {
        return {
          ...metric,
          descriptiveValue: `${certifiedData.certifications.toLocaleString()} certifications (${certifiedData.certifiedEmployees} employees)`,
          isConnected: true,
        };
      }
      return {
        ...metric,
        isConnected: false, // Hardcoded placeholder data
      };
    });
  });

  protected readonly primaryMetrics = computed<OrganizationInvolvementMetricWithChart[]>((): OrganizationInvolvementMetricWithChart[] => {
    const maintainersData = this.organizationMaintainersData();
    const contributorsData = this.organizationContributorsData();
    const tierData = this.membershipTierData();
    const sponsorshipsData = this.eventSponsorshipsData();

    return PRIMARY_INVOLVEMENT_METRICS.map((metric) => {
      if (metric.title === 'Event Sponsorship') {
        return this.transformEventSponsorship(sponsorshipsData, metric);
      }
      if (metric.title === 'Active Contributors') {
        return this.transformActiveContributors(contributorsData, metric);
      }
      if (metric.title === 'Maintainers') {
        return this.transformMaintainers(maintainersData, metric);
      }
      if (metric.isMembershipTier) {
        return this.transformMembershipTier(tierData, metric);
      }
      return this.transformDefaultMetric(metric);
    });
  });

  private transformActiveContributors(data: OrganizationContributorsResponse, metric: PrimaryInvolvementMetric): OrganizationInvolvementMetricWithChart {
    return {
      title: metric.title,
      value: data.contributors.toString(),
      subtitle: 'Contributors from our organization',
      icon: metric.icon ?? '',
      isConnected: true,
      chartData: {
        labels: Array.from({ length: metric.sparklineData?.length ?? 0 }, (_, i) => `Point ${i + 1}`),
        datasets: [
          {
            data: metric.sparklineData ?? [],
            borderColor: metric.sparklineColor ?? '',
            backgroundColor: metric.sparklineColor ?? '',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
    };
  }

  private transformMaintainers(data: OrganizationMaintainersResponse, metric: PrimaryInvolvementMetric): OrganizationInvolvementMetricWithChart {
    return {
      title: metric.title,
      value: data.maintainers.toString(),
      subtitle: `Across ${data.projects} projects`,
      icon: metric.icon ?? '',
      isConnected: true,
      chartData: {
        labels: Array.from({ length: metric.sparklineData?.length ?? 0 }, (_, i) => `Point ${i + 1}`),
        datasets: [
          {
            data: metric.sparklineData ?? [],
            borderColor: metric.sparklineColor ?? '',
            backgroundColor: metric.sparklineColor ?? '',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
    };
  }

  private transformMembershipTier(data: MembershipTierResponse, metric: PrimaryInvolvementMetric): OrganizationInvolvementMetricWithChart {
    if (!data.tier) {
      return {
        title: metric.title,
        value: 'No Membership',
        subtitle: 'Not a member',
        icon: metric.icon ?? '',
        tier: '',
        tierSince: '',
        annualFee: '$0',
        nextDue: '',
        isMembershipTier: metric.isMembershipTier,
        isConnected: true,
      };
    }

    const startDate = new Date(data.membershipStartDate);
    const endDate = new Date(data.membershipEndDate);
    const tierSince = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const nextDue = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const annualFee = `$${data.membershipPrice.toLocaleString()}`;

    return {
      title: metric.title,
      value: data.tier,
      subtitle: `since ${tierSince}`,
      icon: metric.icon ?? '',
      tier: data.tier,
      tierSince,
      annualFee,
      nextDue,
      isMembershipTier: metric.isMembershipTier,
      isConnected: true,
    };
  }

  private transformEventSponsorship(data: OrganizationEventSponsorshipsResponse, metric: PrimaryInvolvementMetric): OrganizationInvolvementMetricWithChart {
    // Filter out summaries with null/empty currency codes and transform remaining valid entries
    const formattedAmounts = data.currencySummaries
      .filter((summary) => summary.currencyCode && summary.currencyCode.trim() !== '')
      .map((summary) => this.currencyPipe.transform(summary.amount, summary.currencyCode, 'symbol', '1.0-0'))
      .filter((formatted) => formatted !== null);

    const displayValue = formattedAmounts.length > 0 ? formattedAmounts.join(' + ') : '$0';

    return {
      title: metric.title,
      value: displayValue,
      subtitle: `${data.totalEvents} events sponsored this year`,
      icon: metric.icon ?? '',
      isConnected: true,
      chartData: {
        labels: Array.from({ length: metric.sparklineData?.length ?? 0 }, (_, i) => `Point ${i + 1}`),
        datasets: [
          {
            data: metric.sparklineData ?? [],
            borderColor: metric.sparklineColor ?? '',
            backgroundColor: hexToRgba(metric.sparklineColor ?? '', 0.1),
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
    };
  }

  private transformDefaultMetric(metric: PrimaryInvolvementMetric): OrganizationInvolvementMetricWithChart {
    return {
      title: metric.title,
      value: metric.value,
      subtitle: metric.subtitle,
      icon: metric.icon ?? '',
      isConnected: false,
      chartData: {
        labels: Array.from({ length: metric.sparklineData?.length ?? 0 }, (_, i) => `Point ${i + 1}`),
        datasets: [
          {
            data: metric.sparklineData ?? [],
            borderColor: metric.sparklineColor ?? '',
            backgroundColor: hexToRgba(metric.sparklineColor ?? '', 0.1),
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
    };
  }
}
