// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { DashboardMetricCard } from '../interfaces';
import { lfxColors } from './colors.constants';

/**
 * Empty chart data placeholder for metrics populated by live data
 */
const EMPTY_CHART_DATA = {
  labels: [],
  datasets: [],
};

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
  },
  {
    title: 'Active Contributors',
    icon: 'fa-light fa-code',
    chartType: 'bar',
    chartData: EMPTY_CHART_DATA,
    sparklineColor: lfxColors.blue[300],
  },
  {
    title: 'Maintainers',
    icon: 'fa-light fa-user-check',
    chartType: 'bar',
    chartData: EMPTY_CHART_DATA,
    sparklineColor: lfxColors.blue[300],
  },
  {
    title: 'Event Attendees',
    icon: 'fa-light fa-user-group',
    chartType: 'line',
    chartData: EMPTY_CHART_DATA,
    sparklineColor: lfxColors.violet[500],
  },
  {
    title: 'Event Speakers',
    icon: 'fa-light fa-award-simple',
    chartType: 'line',
    chartData: EMPTY_CHART_DATA,
    sparklineColor: lfxColors.emerald[500],
  },
  {
    title: 'Certified Employees',
    icon: 'fa-light fa-graduation-cap',
    chartType: 'line',
    chartData: EMPTY_CHART_DATA,
    sparklineColor: lfxColors.amber[500],
  },
  {
    title: 'Training Enrollments',
    icon: 'fa-light fa-graduation-cap',
    chartType: 'line',
    chartData: EMPTY_CHART_DATA,
    sparklineColor: lfxColors.gray[300],
  },
];
