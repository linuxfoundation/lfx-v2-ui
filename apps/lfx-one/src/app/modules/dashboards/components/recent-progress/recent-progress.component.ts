// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, input, signal, ViewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '@app/shared/services/analytics.service';
import { PersonaService } from '@app/shared/services/persona.service';
import { ChartComponent } from '@components/chart/chart.component';
import { CORE_DEVELOPER_PROGRESS_METRICS, MAINTAINER_PROGRESS_METRICS } from '@lfx-one/shared/constants';
import { TooltipModule } from 'primeng/tooltip';
import { finalize, switchMap } from 'rxjs';
import { parseLocalDateString } from '@lfx-one/shared/utils';

import type {
  ActiveWeeksStreakResponse,
  ProgressItemWithChart,
  ProjectIssuesResolutionResponse,
  ProjectPullRequestsWeeklyResponse,
  UserCodeCommitsResponse,
  UserPullRequestsResponse,
} from '@lfx-one/shared/interfaces';
import type { TooltipItem } from 'chart.js';

@Component({
  selector: 'lfx-recent-progress',
  standalone: true,
  imports: [CommonModule, ChartComponent, TooltipModule],
  templateUrl: './recent-progress.component.html',
  styleUrl: './recent-progress.component.scss',
})
export class RecentProgressComponent {
  @ViewChild('progressScroll') protected progressScrollContainer!: ElementRef;

  // Input for project filter
  public projectId = input<string | undefined>(undefined);

  private readonly personaService = inject(PersonaService);
  private readonly analyticsService = inject(AnalyticsService);

  // Loading state signals for each API call
  private readonly activeWeeksStreakLoading = signal(true);
  private readonly pullRequestsMergedLoading = signal(true);
  private readonly codeCommitsLoading = signal(true);
  private readonly projectIssuesResolutionLoading = signal(true);
  private readonly projectPullRequestsWeeklyLoading = signal(true);

  /**
   * Active weeks streak data from Snowflake
   */
  private readonly activeWeeksStreakData = toSignal(
    this.analyticsService.getActiveWeeksStreak().pipe(
      finalize(() => this.activeWeeksStreakLoading.set(false))
    ),
    {
    initialValue: {
      data: [],
      currentStreak: 0,
      totalWeeks: 0,
    },
  });

  /**
   * Pull requests merged data from Snowflake
   */
  private readonly pullRequestsMergedData = toSignal(
    this.analyticsService.getPullRequestsMerged().pipe(
      finalize(() => this.pullRequestsMergedLoading.set(false))
    ),
    {
    initialValue: {
      data: [],
      totalPullRequests: 0,
      totalDays: 0,
    },
  });

  /**
   * Code commits data from Snowflake
   */
  private readonly codeCommitsData = toSignal(
    this.analyticsService.getCodeCommits().pipe(
      finalize(() => this.codeCommitsLoading.set(false))
    ),
    {
    initialValue: {
      data: [],
      totalCommits: 0,
      totalDays: 0,
    },
  });

  /**
   * Project issues resolution data from Snowflake
   * Automatically refetches when projectId input changes
   */
  private readonly projectIssuesResolutionData = toSignal(
    toObservable(this.projectId).pipe(
      switchMap((projectId) => {
        if (!projectId) {
          this.projectIssuesResolutionLoading.set(false);
          return [{ data: [], totalOpenedIssues: 0, totalClosedIssues: 0, resolutionRatePct: 0, medianDaysToClose: 0, totalDays: 0 }];
        }
        this.projectIssuesResolutionLoading.set(true);
        return this.analyticsService.getProjectIssuesResolution(projectId).pipe(
          finalize(() => this.projectIssuesResolutionLoading.set(false))
        );
      })
    ),
    {
      initialValue: {
        data: [],
        totalOpenedIssues: 0,
        totalClosedIssues: 0,
        resolutionRatePct: 0,
        medianDaysToClose: 0,
        totalDays: 0,
      },
    }
  );

  /**
   * Project pull requests weekly data from Snowflake
   * Automatically refetches when projectId input changes
   */
  private readonly projectPullRequestsWeeklyData = toSignal(
    toObservable(this.projectId).pipe(
      switchMap((projectId) => {
        if (!projectId) {
          this.projectPullRequestsWeeklyLoading.set(false);
          return [{ data: [], totalMergedPRs: 0, avgMergeTime: 0, totalWeeks: 0 }];
        }
        this.projectPullRequestsWeeklyLoading.set(true);
        return this.analyticsService.getProjectPullRequestsWeekly(projectId).pipe(
          finalize(() => this.projectPullRequestsWeeklyLoading.set(false))
        );
      })
    ),
    {
      initialValue: {
        data: [],
        totalMergedPRs: 0,
        avgMergeTime: 0,
        totalWeeks: 0,
      },
    }
  );

  /**
   * Computed signal that checks if any data is still loading
   */
  protected readonly isLoading = computed<boolean>(() => {
    return (
      this.activeWeeksStreakLoading() ||
      this.pullRequestsMergedLoading() ||
      this.codeCommitsLoading() ||
      this.projectIssuesResolutionLoading() ||
      this.projectPullRequestsWeeklyLoading()
    );
  });

  /**
   * Computed signal that returns progress metrics based on the current persona
   * Merges hardcoded metrics with real data from Snowflake
   */
  protected readonly progressItems = computed<ProgressItemWithChart[]>(() => {
    const persona = this.personaService.currentPersona();
    const activeWeeksData = this.activeWeeksStreakData();
    const pullRequestsData = this.pullRequestsMergedData();
    const codeCommitsDataValue = this.codeCommitsData();
    const issuesResolutionData = this.projectIssuesResolutionData();
    const prWeeklyData = this.projectPullRequestsWeeklyData();

    const baseMetrics = persona === 'maintainer' ? MAINTAINER_PROGRESS_METRICS : CORE_DEVELOPER_PROGRESS_METRICS;

    // Replace metrics with real data if available
    return baseMetrics.map((metric) => {
      if (metric.label === 'Active Weeks Streak') {
        return this.transformActiveWeeksStreak(activeWeeksData);
      }
      if (metric.label === 'Pull Requests Merged') {
        return this.transformPullRequestsMerged(pullRequestsData);
      }
      if (metric.label === 'Code Commits') {
        return this.transformCodeCommits(codeCommitsDataValue);
      }
      if (metric.label === 'Open vs Closed Issues Trend') {
        return this.transformProjectIssuesResolution(issuesResolutionData);
      }
      if (metric.label === 'PR Review & Merge Velocity') {
        return this.transformProjectPullRequestsWeekly(prWeeklyData);
      }
      return metric;
    });
  });

  protected scrollLeft(): void {
    const container = this.progressScrollContainer.nativeElement;
    container.scrollBy({ left: -300, behavior: 'smooth' });
  }

  protected scrollRight(): void {
    const container = this.progressScrollContainer.nativeElement;
    container.scrollBy({ left: 300, behavior: 'smooth' });
  }

  /**
   * Check if item has a tooltip
   */
  protected hasTooltip(label: string): boolean {
    return label === 'Open vs Closed Issues Trend' || label === 'PR Review & Merge Velocity';
  }

  /**
   * Get tooltip HTML content based on item label (similar to Chart.js callbacks)
   */
  protected getTooltipContent(label: string): string {
    if (label === 'Open vs Closed Issues Trend') {
      const dataStore = this.issuesTooltipDataStore();
      if (!dataStore) {
        return '';
      }
      return `<div class="flex flex-col">
        <div>Opened: ${dataStore.opened}</div>
        <div>Closed: ${dataStore.closed}</div>
        <div>Median time to close: ${dataStore.median}</div>
      </div>`;
    }
    if (label === 'PR Review & Merge Velocity') {
      const dataStore = this.prVelocityTooltipDataStore();
      if (!dataStore) {
        return '';
      }
      return `<div class="flex flex-col">
        <div>Total PRs merged: ${dataStore.total}</div>
        <div>Avg reviewers per PR: ${dataStore.reviewers}</div>
        <div>Pending PRs: ${dataStore.pending}</div>
      </div>`;
    }
    return '';
  }

  /**
   * Tooltip data for issues resolution - stored directly from API response
   */
  private readonly issuesTooltipDataStore = signal<{ opened: string; closed: string; median: string } | null>(null);

  /**
   * Tooltip data for PR velocity - stored directly from API response
   */
  private readonly prVelocityTooltipDataStore = signal<{ total: string; reviewers: string; pending: string } | null>(null);

  /**
   * Effect to update tooltip stores when data changes
   * This runs outside of computed signals to avoid the "writing to signals in computed" error
   */
  constructor() {
    effect(() => {
      // Update issues tooltip data when issues resolution data changes
      const issuesData = this.projectIssuesResolutionData();
      if (issuesData && issuesData.data.length > 0) {
        const totalOpened = issuesData.totalOpenedIssues || 0;
        const totalClosed = issuesData.totalClosedIssues || 0;
        const medianDays = issuesData.medianDaysToClose ? Math.round(issuesData.medianDaysToClose * 10) / 10 : 0;

        this.issuesTooltipDataStore.set({
          opened: totalOpened.toLocaleString(),
          closed: totalClosed.toLocaleString(),
          median: `${medianDays} days`,
        });
      }

      // Update PR velocity tooltip data when PR weekly data changes
      const prData = this.projectPullRequestsWeeklyData();
      if (prData && prData.data.length > 0) {
        const chartData = [...prData.data].reverse();
        const totalMergedPRs = prData.totalMergedPRs || 0;
        const avgPendingPRs =
          chartData.length > 0 ? Math.round(chartData.reduce((sum, row) => sum + row.PENDING_PR_COUNT, 0) / chartData.length) : 0;
        const avgReviewers =
          chartData.length > 0
            ? Math.round((chartData.reduce((sum, row) => sum + row.AVG_REVIEWERS_PER_PR, 0) / chartData.length) * 10) / 10
            : 0;

        this.prVelocityTooltipDataStore.set({
          total: totalMergedPRs.toLocaleString(),
          reviewers: avgReviewers.toString(),
          pending: avgPendingPRs.toString(),
        });
      }
    });
  }

  /**
   * Transform Active Weeks Streak API response to chart format
   * API returns data in ascending order by WEEKS_AGO (0, 1, 2, 3...)
   * Display as-is with newest week (week 0) on the left
   */
  private transformActiveWeeksStreak(data: ActiveWeeksStreakResponse): ProgressItemWithChart {
    // Use data as-is: week 0 (newest) on the left, older weeks on the right
    const chartData = data.data;

    return {
      label: 'Active Weeks Streak',
      value: data.currentStreak.toString(),
      trend: data.currentStreak > 0 ? 'up' : 'down',
      subtitle: 'Current streak',
      chartType: 'bar',
      chartData: {
        labels: chartData.map((row) => `Week ${row.WEEKS_AGO}`),
        datasets: [
          {
            data: chartData.map((row) => row.IS_ACTIVE),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            yAlign: 'bottom' as const,
            position: 'nearest' as const,
            callbacks: {
              title: (context: TooltipItem<'bar'>[]) => context[0].label,
              label: (context: TooltipItem<'bar'>) => {
                const isActive = context.parsed.y === 1;
                return isActive ? 'Active' : 'Inactive';
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false, min: 0, max: 1 },
        },
      },
    };
  }

  /**
   * Transform Pull Requests Merged API response to chart format
   * API returns data in ascending order by ACTIVITY_DATE
   * Display as-is with oldest date on the left, newest on the right
   */
  private transformPullRequestsMerged(data: UserPullRequestsResponse): ProgressItemWithChart {
    const chartData = data.data;

    return {
      label: 'Pull Requests Merged',
      value: data.totalPullRequests.toString(),
      trend: data.totalPullRequests > 0 ? 'up' : 'down',
      subtitle: 'Last 30 days',
      chartType: 'line',
      chartData: {
        labels: chartData.map((row) => row.ACTIVITY_DATE),
        datasets: [
          {
            data: chartData.map((row) => row.DAILY_COUNT),
            borderColor: '#0094FF',
            backgroundColor: 'rgba(0, 148, 255, 0.1)',
            fill: true,
            tension: 0,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            yAlign: 'bottom' as const,
            position: 'nearest' as const,
            callbacks: {
              title: (context: TooltipItem<'line'>[]) => {
                const dateStr = context[0].label;
                const date = parseLocalDateString(dateStr);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              },
              label: (context: TooltipItem<'line'>) => {
                const count = context.parsed.y;
                return `PRs Merged: ${count}`;
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    };
  }

  /**
   * Transform Code Commits API response to chart format
   * API returns data in ascending order by ACTIVITY_DATE
   * Display as-is with oldest date on the left, newest on the right
   */
  private transformCodeCommits(data: UserCodeCommitsResponse): ProgressItemWithChart {
    const chartData = data.data;

    return {
      label: 'Code Commits',
      value: data.totalCommits.toString(),
      trend: data.totalCommits > 0 ? 'up' : 'down',
      subtitle: 'Last 30 days',
      chartType: 'line',
      chartData: {
        labels: chartData.map((row) => row.ACTIVITY_DATE),
        datasets: [
          {
            data: chartData.map((row) => row.DAILY_COUNT),
            borderColor: '#0094FF',
            backgroundColor: 'rgba(0, 148, 255, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            callbacks: {
              title: (context: TooltipItem<'line'>[]) => {
                const dateStr = context[0].label;
                const date = parseLocalDateString(dateStr);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              },
              label: (context: TooltipItem<'line'>) => {
                const count = context.parsed.y;
                return `Commits: ${count}`;
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    };
  }

  /**
   * Transform Project Issues Resolution API response to chart format
   * API returns data in descending order by METRIC_DATE (newest first)
   * Reverse it so oldest date is on the left, newest on the right
   */
  private transformProjectIssuesResolution(data: ProjectIssuesResolutionResponse): ProgressItemWithChart {
    // Reverse the data to show oldest date on the left
    const chartData = [...data.data].reverse();

    // Use values directly from database (round resolution rate to integer, median to 1 decimal)
    const resolutionRate = data.resolutionRatePct ? Math.round(data.resolutionRatePct) : 0;
    const totalOpened = data.totalOpenedIssues || 0;
    const totalClosed = data.totalClosedIssues || 0;
    const medianDays = data.medianDaysToClose ? Math.round(data.medianDaysToClose * 10) / 10 : 0;

    // Note: Tooltip data is updated via effect() in constructor to avoid writing to signals in computed

    return {
      label: 'Open vs Closed Issues Trend',
      value: `${resolutionRate}%`,
      trend: resolutionRate >= 50 ? 'up' : 'down',
      subtitle: 'Issue resolution rate',
      isConnected: true,
      chartType: 'line',
      chartData: {
        labels: chartData.map((row) => row.METRIC_DATE),
        datasets: [
          {
            label: 'Opened Issues',
            data: chartData.map((row) => row.OPENED_ISSUES_COUNT),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
          {
            label: 'Closed Issues',
            data: chartData.map((row) => row.CLOSED_ISSUES_COUNT),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        hover: {
          mode: 'index' as const,
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false,
            yAlign: 'bottom' as const,
            position: 'nearest' as const,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#1f2937',
            bodyColor: '#4b5563',
            footerColor: '#6b7280',
            borderColor: 'rgba(209, 213, 219, 0.8)',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            bodySpacing: 6,
            footerSpacing: 4,
            footerMarginTop: 8,
            cornerRadius: 8,
            caretSize: 6,
            caretPadding: 8,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            titleFont: {
              size: 13,
              weight: 'bold' as const,
            },
            bodyFont: {
              size: 12,
            },
            footerFont: {
              size: 11,
              weight: 'normal' as const,
            },
            boxPadding: 6,
            callbacks: {
              labelPointStyle: () => {
                return {
                  pointStyle: 'circle',
                  rotation: 0,
                };
              },
              title: (context: TooltipItem<'line'>[]) => {
                const dateStr = context[0].label;
                const date = parseLocalDateString(dateStr);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              },
              label: (context: TooltipItem<'line'>) => {
                const datasetLabel = context.dataset?.label || '';
                const count = context.parsed.y;
                return `${datasetLabel}: ${count.toLocaleString()}`;
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    };
  }

  /**
   * Transform Project Pull Requests Weekly API response to chart format
   * API returns data in descending order by WEEK_START_DATE (newest first)
   * Reverse it so oldest week is on the left, newest on the right
   */
  private transformProjectPullRequestsWeekly(data: ProjectPullRequestsWeeklyResponse): ProgressItemWithChart {
    // Reverse the data to show oldest week on the left
    const chartData = [...data.data].reverse();

    // Calculate average merge time and round to 1 decimal place
    const avgMergeTime = data.avgMergeTime ? Math.round(data.avgMergeTime * 10) / 10 : 0;
    const totalMergedPRs = data.totalMergedPRs || 0;

    // Calculate average pending PRs and reviewers
    const avgPendingPRs =
      chartData.length > 0 ? Math.round(chartData.reduce((sum, row) => sum + row.PENDING_PR_COUNT, 0) / chartData.length) : 0;
    const avgReviewers =
      chartData.length > 0
        ? Math.round((chartData.reduce((sum, row) => sum + row.AVG_REVIEWERS_PER_PR, 0) / chartData.length) * 10) / 10
        : 0;

    // Note: Tooltip data is updated via effect() in constructor to avoid writing to signals in computed

    return {
      label: 'PR Review & Merge Velocity',
      value: `${avgMergeTime}`,
      subtitle: 'Avg days to merge',
      isConnected: true,
      chartType: 'bar',
      chartData: {
        labels: chartData.map((row) => row.WEEK_START_DATE),
        datasets: [
          {
            label: 'Avg Days to Merge',
            data: chartData.map((row) => row.AVG_MERGED_IN_DAYS),
            borderColor: '#0094FF',
            backgroundColor: 'rgba(0, 148, 255, 0.5)',
            borderWidth: 0,
            borderRadius: 2,
            barPercentage: 0.95,
            categoryPercentage: 0.95,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 5,
            bottom: 5,
          },
        },
        interaction: {
          mode: 'index' as const,
          intersect: false,
        },
        hover: {
          mode: 'index' as const,
          intersect: false,
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            mode: 'index' as const,
            intersect: false,
            position: 'nearest' as const,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            titleColor: '#1f2937',
            bodyColor: '#4b5563',
            footerColor: '#6b7280',
            borderColor: 'rgba(209, 213, 219, 0.8)',
            borderWidth: 1,
            padding: 12,
            displayColors: false,
            bodySpacing: 6,
            footerSpacing: 4,
            footerMarginTop: 8,
            cornerRadius: 8,
            caretSize: 6,
            caretPadding: 8,
            titleFont: {
              size: 13,
              weight: 'bold' as const,
            },
            bodyFont: {
              size: 12,
            },
            footerFont: {
              size: 11,
              weight: 'normal' as const,
            },
            callbacks: {
              title: (context: TooltipItem<'bar'>[]) => {
                try {
                  const dateStr = context[0]?.label || '';
                  if (!dateStr) return '';
                  const date = parseLocalDateString(dateStr);
                  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return `Week of ${formattedDate}`;
                } catch (e) {
                  console.error('Error in title callback:', e);
                  return context[0]?.label || '';
                }
              },
              label: (context: TooltipItem<'bar'>) => {
                try {
                  const dataIndex = context.dataIndex;
                  const weekData = chartData[dataIndex];
                  return `Avg days to merge: ${Math.round(weekData.AVG_MERGED_IN_DAYS * 10) / 10}`;
                } catch (e) {
                  console.error('Error in label callback:', e);
                  return '';
                }
              },
              footer: (context: TooltipItem<'bar'>[]) => {
                try {
                  const dataIndex = context[0]?.dataIndex;
                  if (dataIndex === undefined) return '';
                  const weekData = chartData[dataIndex];
                  return [
                    `PRs merged: ${weekData.MERGED_PR_COUNT}`,
                    `Avg reviewers: ${Math.round(weekData.AVG_REVIEWERS_PER_PR * 10) / 10}`
                  ];
                } catch (e) {
                  console.error('Error in footer callback:', e);
                  return '';
                }
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    };
  }
}
