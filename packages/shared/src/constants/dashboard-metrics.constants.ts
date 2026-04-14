// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { BrandReachPlatformType, DashboardDrawerType, MarketingActionType } from '../interfaces';
import { formatCurrency, formatNumber, hexToRgba } from '../utils';
import { EMPTY_CHART_DATA, NO_TOOLTIP_CHART_OPTIONS } from './chart-options.constants';
import { lfxColors } from './colors.constants';

import type { DashboardMetricCard, DualSignalRow, EdEvolutionData, FilterPillOption } from '../interfaces';
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

/**
 * Maps social platform types to Font Awesome icon + Tailwind color classes.
 * Keeps presentation out of Brand Reach data interfaces.
 */
export const MARKETING_SOCIAL_PLATFORM_MAP: Record<BrandReachPlatformType, { icon: string; colorClass: string }> = {
  linkedin: { icon: 'fa-brands fa-linkedin', colorClass: 'text-blue-700' },
  twitter: { icon: 'fa-brands fa-x-twitter', colorClass: 'text-gray-900' },
  youtube: { icon: 'fa-brands fa-youtube', colorClass: 'text-red-600' },
  facebook: { icon: 'fa-brands fa-facebook', colorClass: 'text-blue-600' },
  mastodon: { icon: 'fa-brands fa-mastodon', colorClass: 'text-purple-600' },
  other: { icon: 'fa-light fa-hashtag', colorClass: 'text-gray-500' },
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
    title: 'Flywheel Re-engagement',
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

/** Format a MoM change as a display string */
function formatMomChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}% MoM`;
}

/** Extract values from NorthStarMonthlyDataPoint[] */
function monthlyValues(data: { month: string; value: number }[]): number[] {
  return data.map((d) => d.value);
}

/**
 * Build ED Evolution dashboard cards from live API data.
 * 4 North Star + 2 Brand + 1 Influence.
 * Member Retention is merged into the Member Growth drawer.
 */
export function buildEdEvolutionMetrics(data: EdEvolutionData): DashboardMetricCard[] {
  const { flywheel, memberAcquisition, memberRetention, engagedCommunity, eventGrowth, brandReach, brandHealth, revenueImpact } = data;

  return [
    // === North Star (4 cards — retention merged into Member Growth drawer) ===
    {
      title: 'Flywheel Conversion',
      icon: 'fa-light fa-arrows-spin',
      chartType: 'line',
      category: 'memberships',
      testId: 'ed-evo-flywheel-conversion',
      customContentType: 'funnel',
      value: `${flywheel.reengagement.reengagementRate.toFixed(1)}%`,
      changePercentage: formatMomChange(flywheel.reengagement.reengagementMomChange),
      trend: flywheel.reengagement.reengagementMomChange >= 0 ? 'up' : 'down',
      subtitle: 'Re-engagement within 90 days · Last 6 months',
      funnelSteps: [
        { label: 'Attendees', value: formatNumber(flywheel.funnel.eventAttendees) },
        { label: 'Newsletter', value: formatNumber(flywheel.reengagement.reengagedToNewsletter) },
        { label: 'Community', value: formatNumber(flywheel.reengagement.reengagedToCommunity) },
        { label: 'WG', value: formatNumber(flywheel.reengagement.reengagedToWorkingGroup) },
      ],
      tooltipText: 'Percentage of event attendees who engage with newsletter, community, or working groups within 90 days post-event.',
      drawerType: DashboardDrawerType.NorthStarFlywheelConversion,
    } as DashboardMetricCard,
    {
      title: 'Member Growth',
      icon: 'fa-light fa-user-group',
      chartType: 'line',
      category: 'memberships',
      testId: 'ed-evo-member-growth',
      value: formatNumber(memberAcquisition.totalMembers),
      changePercentage: formatMomChange(memberAcquisition.changePercentage),
      trend: memberAcquisition.trend,
      subtitle: `${memberRetention.renewalRate.toFixed(1)}% retention · NRR ${memberRetention.netRevenueRetention.toFixed(1)}% · Last 6 months`,
      chartData: protoSparkline(memberAcquisition.totalMembersMonthlyData.length > 0 ? memberAcquisition.totalMembersMonthlyData : [0], lfxColors.blue[500]),
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
      tooltipText: 'Total paying corporate members with monthly net new over the last 6 months. Source: Salesforce B2B memberships.',
      drawerType: DashboardDrawerType.NorthStarMemberAcquisition,
    } as DashboardMetricCard,
    {
      title: 'Engaged Community',
      icon: 'fa-light fa-people-group',
      chartType: 'line',
      category: 'memberships',
      testId: 'ed-evo-engaged-community',
      value: formatNumber(engagedCommunity.totalMembers),
      changePercentage: formatMomChange(engagedCommunity.changePercentage),
      trend: engagedCommunity.trend,
      subtitle: `${Object.values(engagedCommunity.breakdown).filter((v) => v > 0).length} channels · Last 6 months`,
      chartData: protoSparkline(engagedCommunity.monthlyData.length > 0 ? monthlyValues(engagedCommunity.monthlyData) : [0], lfxColors.blue[500]),
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
      tooltipText: 'Unique individuals active across Slack, Discord, GitHub, and mailing lists in the last 90 days.',
      drawerType: DashboardDrawerType.NorthStarEngagedCommunity,
    } as DashboardMetricCard,
    {
      title: 'Event Growth',
      icon: 'fa-light fa-calendar-star',
      chartType: 'line',
      category: 'memberships',
      testId: 'ed-evo-event-growth',
      value: formatNumber(eventGrowth.totalAttendees),
      changePercentage: formatMomChange(eventGrowth.attendeeMomChange),
      trend: eventGrowth.trend,
      subtitle: `${formatNumber(eventGrowth.totalEvents)} events · YTD attendees`,
      chartData: eventGrowth.monthlyData.length > 0 ? protoSparkline(monthlyValues(eventGrowth.monthlyData), lfxColors.blue[500]) : EMPTY_CHART_DATA,
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
      tooltipText: 'Year-to-date event attendees and YoY change. Source: Event registrations.',
      drawerType: DashboardDrawerType.NorthStarEventGrowth,
    } as DashboardMetricCard,

    // === Brand (2 dual-signal cards) ===
    {
      title: 'Brand Reach',
      icon: 'fa-light fa-signal-bars',
      chartType: 'line',
      category: 'brand',
      testId: 'ed-evo-brand-reach',
      customContentType: 'dual-signal',
      dualSignals: [
        protoDualSignal(
          'Social Followers',
          formatNumber(brandReach.totalSocialFollowers),
          brandReach.dailyTrend.length > 0 ? brandReach.dailyTrend.map((d) => d.sessions) : [0],
          lfxColors.blue[500],
          formatMomChange(brandReach.changePercentage),
          brandReach.trend
        ),
        protoDualSignal(
          'Monthly Sessions',
          formatNumber(brandReach.totalMonthlySessions),
          brandReach.dailyTrend.length > 0 ? brandReach.dailyTrend.map((d) => d.sessions) : [0],
          lfxColors.violet[500]
        ),
      ],
      tooltipText: 'Social followers across all platforms (stock) and monthly website sessions (flow). Shown separately — these are different metric types.',
      drawerType: DashboardDrawerType.BrandReach,
    } as DashboardMetricCard,
    {
      title: 'Brand Health',
      icon: 'fa-light fa-heart-pulse',
      chartType: 'line',
      category: 'brand',
      testId: 'ed-evo-brand-health',
      customContentType: 'dual-signal',
      dualSignals: [
        protoDualSignal(
          'Mentions',
          formatNumber(brandHealth.totalMentions),
          brandHealth.monthlyMentions.length > 0 ? monthlyValues(brandHealth.monthlyMentions) : [0],
          lfxColors.blue[500],
          formatMomChange(brandHealth.sentimentMomChangePp),
          brandHealth.trend
        ),
        protoDualSignal(
          'Positive Sentiment',
          `${brandHealth.sentiment.positive.toFixed(1)}%`,
          brandHealth.monthlyMentions.length > 0 ? monthlyValues(brandHealth.monthlyMentions) : [0],
          lfxColors.emerald[500],
          `${brandHealth.sentimentMomChangePp >= 0 ? '+' : ''}${brandHealth.sentimentMomChangePp.toFixed(1)}pp MoM`,
          brandHealth.sentimentMomChangePp >= 0 ? 'up' : 'down'
        ),
      ],
      tooltipText: 'Total brand mentions across social and web (Octolens) with sentiment breakdown.',
      drawerType: DashboardDrawerType.BrandHealth,
    } as DashboardMetricCard,

    // === Influence (1 dual-signal card) ===
    {
      title: 'Attribution',
      icon: 'fa-light fa-money-bill-trend-up',
      chartType: 'line',
      category: 'influence',
      testId: 'ed-evo-revenue-impact',
      customContentType: 'dual-signal',
      caption: `${formatCurrency(revenueImpact.revenueAttributed)} attributed of ${formatCurrency(revenueImpact.pipelineInfluenced + revenueImpact.revenueAttributed)} total (${revenueImpact.matchRate.toFixed(1)}% match rate)`,
      dualSignals: [
        protoDualSignal(
          'Sales Pipeline',
          formatCurrency(revenueImpact.pipelineInfluenced),
          [0],
          lfxColors.blue[500],
          formatMomChange(revenueImpact.changePercentage),
          revenueImpact.trend
        ),
        protoDualSignal('Paid Media', formatCurrency(revenueImpact.paidMedia.adSpend), [0], lfxColors.emerald[500]),
      ],
      tooltipText:
        'Membership growth pipeline influenced by marketing, with paid media spend and return on ad spend (ROAS). Match rate shows measurement confidence.',
      drawerType: DashboardDrawerType.RevenueImpact,
    } as DashboardMetricCard,
  ];
}
