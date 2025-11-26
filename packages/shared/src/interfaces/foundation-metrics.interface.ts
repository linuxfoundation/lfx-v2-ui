// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CompanyBusFactor, ProjectHealthDistribution, TopProjectByValue } from './dashboard-metric.interface';

// Re-export shared types from unified dashboard metric interface
export type { CompanyBusFactor, MetricCategory, ProjectHealthDistribution, TopProjectByValue, TopProjectDisplay } from './dashboard-metric.interface';

/**
 * Aggregate foundation metrics
 * @description Summary metrics across all foundations
 */
export interface AggregateFoundationMetrics {
  /** Total number of projects across all foundations */
  totalProjects: number;
  /** Historical data for total projects (365 days) */
  totalProjectsData: number[];
  /** Total number of member organizations */
  totalMembers: number;
  /** Historical data for total members (365 days) */
  totalMembersData: number[];
  /** Total estimated software value in millions */
  softwareValue: number;
  /** Historical data for software value (365 days) */
  softwareValueData: number[];
  /** Top 3 projects by software value */
  topProjectsByValue: TopProjectByValue[];
  /** Company bus factor metrics */
  companyBusFactor: CompanyBusFactor;
  /** Average active contributors across foundations */
  avgActiveContributors: number;
  /** Historical data for active contributors (365 days) */
  activeContributorsData: number[];
  /** Average maintainers across foundations */
  avgMaintainers: number;
  /** Historical data for maintainers (365 days) */
  maintainersData: number[];
  /** Total events across all foundations (past year) */
  totalEvents: number;
  /** Monthly event counts (12 months) */
  eventsMonthlyData: number[];
  /** Project health score distribution */
  projectHealthDistribution: ProjectHealthDistribution;
}
