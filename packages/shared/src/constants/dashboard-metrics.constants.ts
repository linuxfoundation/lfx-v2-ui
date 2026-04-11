// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DashboardDrawerType, MarketingActionType } from '../interfaces';
import { hexToRgba } from '../utils';
import { EMPTY_CHART_DATA, NO_TOOLTIP_CHART_OPTIONS } from './chart-options.constants';
import { lfxColors } from './colors.constants';

import type { DashboardMetricCard, DualSignalRow, FilterPillOption } from '../interfaces';
// ============================================
// Marketing Action Icon Map
// ============================================

/**
 * Maps semantic action types to Font Awesome icon classes.
 * Keeps presentation out of data interfaces.
 */
export const MARKETING_ACTION_ICON_MAP: Record<MarketingActionType, string> = {
  decline: 'fa-light fa-chart-line-down',
  growth: 'fa-light fa-chart-line-up',
  target: 'fa-light fa-bullseye-arrow',
  revenue: 'fa-light fa-money-bill-trend-up',
  engagement: 'fa-light fa-user-group',
  conversion: 'fa-light fa-arrow-progress',
  content: 'fa-light fa-envelope-open-text',
  diversify: 'fa-light fa-arrows-split-up-and-left',
  optimize: 'fa-light fa-bullseye-pointer',
  investigate: 'fa-light fa-magnifying-glass-chart',
  monitor: 'fa-light fa-circle-info',
};

// ============================================
// Foundation Health Metrics
// ============================================

/**
 * Primary foundation health metrics configuration
 * NOTE: This contains only UI configuration (icons, categories, test IDs). Data values come from APIs or fallback to mock data.
 * This serves as a configuration template for building metric cards with consistent structure.
 */
export const PRIMARY_FOUNDATION_HEALTH_METRICS: DashboardMetricCard[] = [
  {
    title: 'Total Value of Projects',
    icon: 'fa-light fa-chart-column',
    chartType: 'line',
    category: 'projects',
    testId: 'foundation-health-card-total-value',
    drawerType: DashboardDrawerType.TotalValueOfProjects,
  },
  {
    title: 'Total Projects',
    icon: 'fa-light fa-chart-bar',
    chartType: 'line',
    category: 'projects',
    testId: 'foundation-health-card-total-projects',
    drawerType: DashboardDrawerType.TotalProjects,
  },
  {
    title: 'Total Members',
    icon: 'fa-light fa-user-group',
    chartType: 'line',
    category: 'projects',
    testId: 'foundation-health-card-total-members',
    drawerType: DashboardDrawerType.TotalMembers,
  },
  {
    title: 'Organization Dependency',
    icon: 'fa-light fa-shield',
    chartType: 'line',
    category: 'contributors',
    testId: 'foundation-health-card-org-dependency',
    customContentType: 'bus-factor',
    drawerType: DashboardDrawerType.OrganizationDependency,
  },
  {
    title: 'Active Contributors',
    icon: 'fa-light fa-code',
    chartType: 'line',
    category: 'contributors',
    testId: 'foundation-health-card-active-contributors',
    drawerType: DashboardDrawerType.ActiveContributors,
  },
  {
    title: 'Maintainers',
    icon: 'fa-light fa-user-check',
    chartType: 'line',
    category: 'contributors',
    testId: 'foundation-health-card-maintainers',
    drawerType: DashboardDrawerType.Maintainers,
  },
  {
    title: 'Events',
    icon: 'fa-light fa-calendar',
    chartType: 'bar',
    category: 'events',
    testId: 'foundation-health-card-events',
    customContentType: 'bar-chart',
    chartColor: lfxColors.blue[500],
    drawerType: DashboardDrawerType.Events,
  },
  {
    title: 'Project Health Scores',
    icon: 'fa-light fa-chart-bar',
    chartType: 'bar',
    category: 'projects',
    testId: 'foundation-health-card-project-health-scores',
    customContentType: 'health-scores',
    drawerType: DashboardDrawerType.ProjectHealthScores,
  },
];

// ============================================
// Organization Involvement Metrics
// ============================================

/**
 * Primary metrics configuration for board member organization involvement
 * NOTE: This contains only UI configuration (icons, chart styling). All data values come from live API.
 * This serves as a configuration template matched by title to determine visual presentation.
 */
export const PRIMARY_INVOLVEMENT_METRICS: DashboardMetricCard[] = [
  {
    title: 'Membership Tier',
    icon: 'fa-light fa-dollar-sign',
    chartType: 'line',
    isMembershipTier: true,
    testId: 'org-involvement-card-membership-tier',
  },
  {
    title: 'Active Contributors',
    icon: 'fa-light fa-code',
    chartType: 'bar',
    testId: 'org-involvement-card-active-contributors',
    chartData: EMPTY_CHART_DATA,
    drawerType: DashboardDrawerType.OrgActiveContributors,
  },
  {
    title: 'Maintainers',
    icon: 'fa-light fa-user-check',
    chartType: 'bar',
    testId: 'org-involvement-card-maintainers',
    chartData: EMPTY_CHART_DATA,
    drawerType: DashboardDrawerType.OrgMaintainers,
  },
  {
    title: 'Event Attendees',
    icon: 'fa-light fa-user-group',
    chartType: 'line',
    testId: 'org-involvement-card-event-attendees',
    chartData: EMPTY_CHART_DATA,
    drawerType: DashboardDrawerType.OrgEventAttendees,
  },
  {
    title: 'Event Speakers',
    icon: 'fa-light fa-award-simple',
    chartType: 'line',
    testId: 'org-involvement-card-event-speakers',
    chartData: EMPTY_CHART_DATA,
    drawerType: DashboardDrawerType.OrgEventSpeakers,
  },
  {
    title: 'Certified Employees',
    icon: 'fa-light fa-graduation-cap',
    chartType: 'line',
    testId: 'org-involvement-card-certified-employees',
    chartData: EMPTY_CHART_DATA,
    drawerType: DashboardDrawerType.OrgCertifiedEmployees,
  },
  {
    title: 'Training Enrollments',
    icon: 'fa-light fa-graduation-cap',
    chartType: 'line',
    testId: 'org-involvement-card-training-enrollments',
    chartData: EMPTY_CHART_DATA,
    drawerType: DashboardDrawerType.OrgTrainingEnrollments,
  },
];

// ============================================
// Marketing Overview Metrics (Executive Director)
// ============================================

/**
 * Marketing overview metrics for executive director dashboard
 * UI configuration templates (icons, categories, drawer types). Data values are populated at runtime.
 */
export const MARKETING_OVERVIEW_METRICS: DashboardMetricCard[] = [
  {
    title: 'Website Visits',
    icon: 'fa-light fa-globe',
    chartType: 'line',
    category: 'marketing',
    testId: 'marketing-card-website-visits',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.MarketingWebsiteVisits,
  },
  {
    title: 'Email CTR',
    icon: 'fa-light fa-envelope',
    chartType: 'line',
    category: 'marketing',
    testId: 'marketing-card-email-ctr',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.MarketingEmailCtr,
  },
  {
    title: 'Paid Social Reach',
    icon: 'fa-light fa-share-nodes',
    chartType: 'line',
    category: 'marketing',
    testId: 'marketing-card-paid-social-reach',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.MarketingPaidSocialReach,
  },
  {
    title: 'Social Media',
    icon: 'fa-light fa-thumbs-up',
    chartType: 'line',
    category: 'marketing',
    testId: 'marketing-card-social-media',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.MarketingSocialMedia,
  },
];

// ============================================
// North Star Metrics (Executive Director)
// ============================================

/**
 * North Star KPI metrics for executive director dashboard
 * UI configuration templates (icons, categories, drawer types). Data values populated at runtime
 * until Snowflake tables for membership/financial data are available.
 */
export const NORTH_STAR_METRICS: DashboardMetricCard[] = [
  {
    title: 'Engaged Community',
    icon: 'fa-light fa-users',
    chartType: 'line',
    category: 'memberships',
    testId: 'north-star-card-engaged-community',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.NorthStarEngagedCommunity,
  },
  {
    title: 'Member Acq. Rate & CAC',
    icon: 'fa-light fa-user-plus',
    chartType: 'bar',
    category: 'memberships',
    testId: 'north-star-card-member-acquisition',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.NorthStarMemberAcquisition,
  },
  {
    title: 'Member Retention & NRR',
    icon: 'fa-light fa-arrow-rotate-right',
    chartType: 'line',
    category: 'memberships',
    testId: 'north-star-card-member-retention',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.NorthStarMemberRetention,
  },
  {
    title: 'Flywheel Conv. Rate',
    icon: 'fa-light fa-rotate',
    chartType: 'line',
    category: 'memberships',
    testId: 'north-star-card-flywheel-conversion',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    drawerType: DashboardDrawerType.NorthStarFlywheelConversion,
  },
];

// ============================================
// Progress Metrics (Core Developer & Maintainer)
// ============================================

/**
 * Core Developer progress metrics
 * NOTE: Metrics with live API data use empty chartData - populated dynamically by transform functions
 */
export const CORE_DEVELOPER_PROGRESS_METRICS: DashboardMetricCard[] = [
  {
    title: 'Code Commits',
    value: '0',
    trend: 'up',
    subtitle: 'Last 30 days',
    chartType: 'line',
    testId: 'core-dev-progress-card-code-commits',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Pull Requests Merged',
    value: '0',
    trend: 'up',
    subtitle: 'Last 30 days',
    chartType: 'line',
    testId: 'core-dev-progress-card-pull-requests-merged',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Issues Resolved & Comments Added',
    value: '34',
    trend: 'up',
    subtitle: 'Combined activity last 30 days',
    chartType: 'line',
    testId: 'core-dev-progress-card-issues-resolved',
    chartData: {
      labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
      datasets: [
        {
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 5)),
          borderColor: lfxColors.blue[500],
          backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Active Weeks Streak',
    value: '0',
    trend: 'up',
    subtitle: 'Current streak',
    chartType: 'bar',
    testId: 'core-dev-progress-card-active-weeks-streak',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Learning Hours',
    value: '8.5',
    trend: 'up',
    subtitle: 'Last 30 days',
    chartType: 'line',
    testId: 'core-dev-progress-card-learning-hours',
    chartData: {
      labels: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
      datasets: [
        {
          data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 3)),
          borderColor: lfxColors.blue[300],
          backgroundColor: hexToRgba(lfxColors.blue[300], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
];

/**
 * Maintainer progress metrics
 * NOTE: Metrics with live API data use empty chartData - populated dynamically by transform functions
 */
export const MAINTAINER_PROGRESS_METRICS: DashboardMetricCard[] = [
  {
    title: 'Critical Security Issues',
    icon: 'fa-light fa-shield',
    value: '19',
    trend: 'down',
    subtitle: 'Open critical security vulnerabilities',
    chartType: 'line',
    category: 'projectHealth',
    testId: 'maintainer-progress-card-critical-security-issues',
    chartData: {
      labels: Array.from({ length: 12 }, (_, i) => `Month ${i + 1}`),
      datasets: [
        {
          data: Array.from({ length: 12 }, (_, i) => {
            const base = 28 - i * 0.75;
            return Math.max(15, Math.floor(base + (Math.random() * 4 - 2)));
          }),
          borderColor: lfxColors.red[500],
          backgroundColor: hexToRgba(lfxColors.red[500], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    },
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'PR Review & Merge Velocity',
    icon: 'fa-light fa-code-pull-request',
    value: '0',
    subtitle: 'Avg days to merge',
    chartType: 'bar',
    category: 'code',
    testId: 'maintainer-progress-card-pr-review-merge-velocity',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Open vs Closed Issues Trend',
    icon: 'fa-light fa-wave-pulse',
    value: '0%',
    subtitle: 'Issue resolution rate',
    chartType: 'line',
    category: 'code',
    testId: 'maintainer-progress-card-open-vs-closed-issues',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Contributors Mentored',
    icon: 'fa-light fa-user-group',
    value: '0',
    subtitle: 'Total contributors mentored',
    chartType: 'line',
    category: 'projectHealth',
    testId: 'maintainer-progress-card-contributors-mentored',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Unique Contributors per Week',
    icon: 'fa-light fa-user-group',
    value: '0',
    subtitle: 'Active contributors',
    chartType: 'bar',
    category: 'code',
    testId: 'maintainer-progress-card-unique-contributors',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Health Score',
    icon: 'fa-light fa-arrow-trend-up',
    value: '0',
    subtitle: 'Avg health score',
    chartType: 'line',
    category: 'projectHealth',
    testId: 'maintainer-progress-card-health-score',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
  {
    title: 'Code Commits',
    icon: 'fa-light fa-code-commit',
    value: '0',
    subtitle: 'Total commits',
    chartType: 'line',
    category: 'code',
    testId: 'maintainer-progress-card-code-commits',
    chartData: EMPTY_CHART_DATA,
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
  },
];

// ============================================
// ED Dashboard Evolution Prototype (8 Cards)
// ============================================

/** Helper to build a prototype sparkline dataset */
function protoSparkline(data: number[], color: string) {
  return {
    labels: data.map((_, i) => `M${i + 1}`),
    datasets: [
      {
        data,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.1),
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0,
      },
    ],
  };
}

/** Helper to build a dual-signal row with sparkline */
function protoDualSignal(label: string, value: string, data: number[], color: string, change?: string, trend?: 'up' | 'down'): DualSignalRow {
  return {
    label,
    value,
    changePercentage: change,
    trend,
    chartData: protoSparkline(data, color),
  };
}

/**
 * Filter options for the ED Evolution prototype dashboard
 */
export const ED_EVOLUTION_FILTER_OPTIONS: FilterPillOption[] = [
  { id: 'all', label: 'All' },
  { id: 'memberships', label: 'North Star' },
  { id: 'brand', label: 'Brand' },
  { id: 'influence', label: 'Influence' },
];

/**
 * ED Evolution prototype — 7 cards with dummy data
 * 4 North Star + 2 Brand + 1 Influence
 * Member Retention is merged into the Member Growth drawer.
 */
export const ED_EVOLUTION_METRICS: DashboardMetricCard[] = [
  // === North Star (4 cards — retention merged into Member Growth drawer) ===
  {
    title: 'Flywheel Conversion',
    icon: 'fa-light fa-arrows-spin',
    chartType: 'line',
    category: 'memberships',
    testId: 'ed-evo-flywheel-conversion',
    customContentType: 'funnel',
    value: '24.6%',
    changePercentage: '+2.1% MoM',
    trend: 'up',
    subtitle: 'Re-engagement within 90 days · Last 6 months',
    funnelSteps: [
      { label: 'Attendees', value: '8.2K' },
      { label: 'Newsletter', value: '1.4K' },
      { label: 'Community', value: '890' },
      { label: 'WG', value: '310' },
    ],
    tooltipText:
      'Percentage of event attendees who engage with newsletter, community, or working groups within 90 days post-event. Funnel: 8,200 → 1,420 → 890 → 310.',
    drawerType: DashboardDrawerType.NorthStarFlywheelConversion,
  },
  {
    title: 'Member Growth',
    icon: 'fa-light fa-user-group',
    chartType: 'line',
    category: 'memberships',
    testId: 'ed-evo-member-growth',
    value: '245',
    changePercentage: '+3.0% MoM',
    trend: 'up',
    subtitle: '87.2% retention · NRR 103% · Last 6 months',
    chartData: protoSparkline([210, 218, 225, 231, 238, 245], lfxColors.blue[500]),
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    tooltipText: 'Total paying corporate members with monthly net new over the last 6 months. Source: Salesforce B2B memberships.',
    drawerType: DashboardDrawerType.NorthStarMemberAcquisition,
  },
  {
    title: 'Engaged Community',
    icon: 'fa-light fa-people-group',
    chartType: 'line',
    category: 'memberships',
    testId: 'ed-evo-engaged-community',
    value: '12,400',
    changePercentage: '+3.2% MoM',
    trend: 'up',
    subtitle: '4 channels · Last 6 months',
    chartData: protoSparkline([10800, 11200, 11500, 11800, 12100, 12400], lfxColors.blue[500]),
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    tooltipText: 'Unique individuals active across Slack, Discord, GitHub, and mailing lists in the last 90 days.',
    drawerType: DashboardDrawerType.NorthStarEngagedCommunity,
  },
  {
    title: 'Event Growth',
    icon: 'fa-light fa-calendar-star',
    chartType: 'line',
    category: 'memberships',
    testId: 'ed-evo-event-growth',
    value: '8,200',
    changePercentage: '+9.3% MoM',
    trend: 'up',
    subtitle: 'Monthly attendees · Last 6 months',
    chartData: protoSparkline([5200, 5800, 6400, 7100, 7500, 8200], lfxColors.blue[500]),
    chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    tooltipText: 'Total monthly event attendees over the last 6 months. Source: Event registrations.',
    drawerType: DashboardDrawerType.NorthStarEventGrowth,
  },

  // === Brand (2 dual-signal cards) ===
  {
    title: 'Brand Reach',
    icon: 'fa-light fa-signal-bars',
    chartType: 'line',
    category: 'brand',
    testId: 'ed-evo-brand-reach',
    customContentType: 'dual-signal',
    dualSignals: [
      protoDualSignal('Social Followers', '474K', [420, 435, 448, 456, 465, 474], lfxColors.blue[500], '+8.2% MoM', 'up'),
      protoDualSignal('Monthly Sessions', '360K', [310, 325, 340, 348, 355, 360], lfxColors.violet[500], '+4.1% MoM', 'up'),
    ],
    tooltipText: 'Social followers across all platforms (stock) and monthly website sessions (flow). Shown separately — these are different metric types.',
    drawerType: DashboardDrawerType.BrandReach,
  },
  {
    title: 'Brand Health',
    icon: 'fa-light fa-heart-pulse',
    chartType: 'line',
    category: 'brand',
    testId: 'ed-evo-brand-health',
    customContentType: 'dual-signal',
    dualSignals: [
      protoDualSignal('Mentions', '2,400', [1800, 1950, 2100, 2200, 2300, 2400], lfxColors.blue[500], '+4.3% MoM', 'up'),
      protoDualSignal('Positive Sentiment', '72%', [65, 67, 68, 70, 71, 72], lfxColors.emerald[500], '+2pp MoM', 'up'),
    ],
    tooltipText: 'Total brand mentions across social and web (Octolens) with sentiment breakdown.',
    drawerType: DashboardDrawerType.BrandHealth,
  },

  // === Influence (1 dual-signal card) ===
  {
    title: 'Marketing Attribution',
    icon: 'fa-light fa-money-bill-trend-up',
    chartType: 'line',
    category: 'influence',
    testId: 'ed-evo-revenue-impact',
    customContentType: 'dual-signal',
    caption: '$5.5M attributed of $12.3M total (44% match rate)',
    dualSignals: [
      protoDualSignal('Pipeline Influenced', '$2.1M', [1200, 1400, 1600, 1800, 1950, 2100], lfxColors.blue[500], '+7.7% MoM', 'up'),
      protoDualSignal('Revenue Attributed', '$5.5M', [3800, 4200, 4600, 4900, 5200, 5500], lfxColors.emerald[500], '+5.8% MoM', 'up'),
    ],
    tooltipText: 'Marketing-influenced pipeline value and multi-touch attributed revenue. Match rate shows measurement confidence.',
    drawerType: DashboardDrawerType.RevenueImpact,
  },
];
