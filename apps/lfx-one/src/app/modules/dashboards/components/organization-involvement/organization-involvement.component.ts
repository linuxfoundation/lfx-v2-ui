// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AnalyticsService } from '@app/shared/services/analytics.service';
import { ChartComponent } from '@components/chart/chart.component';
import { CONTRIBUTIONS_METRICS, IMPACT_METRICS, PRIMARY_INVOLVEMENT_METRICS } from '@lfx-one/shared/constants';
import { OrganizationInvolvementMetricWithChart } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-organization-involvement',
  standalone: true,
  imports: [CommonModule, ChartComponent],
  templateUrl: './organization-involvement.component.html',
  styleUrl: './organization-involvement.component.scss',
})
export class OrganizationInvolvementComponent {
  private readonly analyticsService = inject(AnalyticsService);

  /**
   * Organization maintainers data from Snowflake
   */
  private readonly organizationMaintainersData = toSignal(this.analyticsService.getOrganizationMaintainers());

  /**
   * Membership tier data from Snowflake
   */
  private readonly membershipTierData = toSignal(this.analyticsService.getMembershipTier());

  /**
   * Loading state - true while any data is being fetched
   */
  protected readonly isLoading = computed<boolean>(() => {
    return !this.organizationMaintainersData() || !this.membershipTierData();
  });

  /**
   * Chart options for sparkline
   */
  protected readonly sparklineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  /**
   * Contributions metrics displayed in list format
   */
  protected readonly contributionsMetrics = CONTRIBUTIONS_METRICS;

  /**
   * Impact metrics displayed in list format
   */
  protected readonly impactMetrics = IMPACT_METRICS;

  /**
   * Primary metrics with chart data precomputed
   * Merges hardcoded metrics with real data from Snowflake
   */
  protected readonly primaryMetrics = computed<OrganizationInvolvementMetricWithChart[]>((): OrganizationInvolvementMetricWithChart[] => {
    const maintainersData = this.organizationMaintainersData();
    const tierData = this.membershipTierData();

    return PRIMARY_INVOLVEMENT_METRICS.map((metric) => {
      // Replace Maintainers metric with real data if available
      if (metric.title === 'Maintainers' && maintainersData && maintainersData.maintainers > 0) {
        return {
          title: metric.title,
          value: maintainersData.maintainers.toString(),
          subtitle: `Across ${maintainersData.projects} projects`,
          icon: metric.icon ?? '',
          chartData: {
            labels: Array.from({ length: metric.sparklineData?.length ?? 0 }, (_, i) => `Point ${i + 1}`),
            datasets: [
              {
                data: metric.sparklineData ?? [],
                borderColor: metric.sparklineColor ?? '',
                backgroundColor: this.hexToRgba(metric.sparklineColor ?? '', 0.1),
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
              },
            ],
          },
        };
      }

      // Replace Membership tier card with real data if available
      if (metric.isMembershipTier && tierData?.tier) {
        const startDate = new Date(tierData.membershipStartDate);
        const endDate = new Date(tierData.membershipEndDate);
        const tierSince = startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const nextDue = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const annualFee = `$${tierData.membershipPrice.toLocaleString()}`;

        return {
          title: metric.title,
          value: tierData.tier,
          subtitle: `since ${tierSince}`,
          icon: metric.icon ?? '',
          tier: tierData.tier,
          tierSince,
          annualFee,
          nextDue,
          isMembershipTier: metric.isMembershipTier,
        };
      }

      // Membership tier card with placeholder data
      if (metric.isMembershipTier) {
        return {
          title: metric.title,
          value: metric.value,
          subtitle: metric.subtitle,
          icon: metric.icon ?? '',
          tier: metric.tier,
          tierSince: metric.tierSince,
          annualFee: metric.annualFee,
          nextDue: metric.nextDue,
          isMembershipTier: metric.isMembershipTier,
        };
      }

      // Regular metrics with sparkline data
      return {
        title: metric.title,
        value: metric.value,
        subtitle: metric.subtitle,
        icon: metric.icon ?? '',
        chartData: {
          labels: Array.from({ length: metric.sparklineData?.length ?? 0 }, (_, i) => `Point ${i + 1}`),
          datasets: [
            {
              data: metric.sparklineData ?? [],
              borderColor: metric.sparklineColor ?? '',
              backgroundColor: this.hexToRgba(metric.sparklineColor ?? '', 0.1),
              fill: true,
              tension: 0.4,
              borderWidth: 2,
              pointRadius: 0,
            },
          ],
        },
      };
    });
  });

  /**
   * Convert hex color to rgba
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
