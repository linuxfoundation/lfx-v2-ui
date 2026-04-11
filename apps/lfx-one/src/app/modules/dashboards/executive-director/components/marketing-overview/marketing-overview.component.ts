// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, signal, Signal, viewChild } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';

import { ED_EVOLUTION_FILTER_OPTIONS, ED_EVOLUTION_METRICS, NO_TOOLTIP_CHART_OPTIONS } from '@lfx-one/shared/constants';
import {
  DashboardDrawerType,
  DashboardMetricCard,
  FlywheelConversionResponse,
  MemberAcquisitionResponse,
  MemberRetentionResponse,
  EngagedCommunitySizeResponse,
} from '@lfx-one/shared/interfaces';
import { formatNumber } from '@lfx-one/shared/utils';

import { ScrollShadowDirective } from '@shared/directives/scroll-shadow.directive';
import { TooltipModule } from 'primeng/tooltip';

import { BrandHealthDrawerComponent } from '../brand-health-drawer/brand-health-drawer.component';
import { BrandReachDrawerComponent } from '../brand-reach-drawer/brand-reach-drawer.component';
import { EmailCtrDrawerComponent } from '../email-ctr-drawer/email-ctr-drawer.component';
import { EngagedCommunityDrawerComponent } from '../engaged-community-drawer/engaged-community-drawer.component';
import { EventGrowthDrawerComponent } from '../event-growth-drawer/event-growth-drawer.component';
import { FlywheelConversionDrawerComponent } from '../flywheel-conversion-drawer/flywheel-conversion-drawer.component';
import { MemberAcquisitionDrawerComponent } from '../member-acquisition-drawer/member-acquisition-drawer.component';
import { PaidSocialReachDrawerComponent } from '../paid-social-reach-drawer/paid-social-reach-drawer.component';
import { RevenueImpactDrawerComponent } from '../revenue-impact-drawer/revenue-impact-drawer.component';
import { SocialMediaDrawerComponent } from '../social-media-drawer/social-media-drawer.component';
import { WebsiteVisitsDrawerComponent } from '../website-visits-drawer/website-visits-drawer.component';

@Component({
  selector: 'lfx-marketing-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    ChartComponent,
    FilterPillsComponent,
    MetricCardComponent,
    ScrollShadowDirective,
    TooltipModule,

    // Existing drawers
    WebsiteVisitsDrawerComponent,
    EmailCtrDrawerComponent,
    PaidSocialReachDrawerComponent,
    SocialMediaDrawerComponent,
    EngagedCommunityDrawerComponent,
    MemberAcquisitionDrawerComponent,
    FlywheelConversionDrawerComponent,

    // New prototype drawers
    EventGrowthDrawerComponent,
    BrandReachDrawerComponent,
    BrandHealthDrawerComponent,
    RevenueImpactDrawerComponent,
  ],
  templateUrl: './marketing-overview.component.html',
  styleUrl: './marketing-overview.component.scss',
})
export class MarketingOverviewComponent {
  public readonly scrollShadowDirective = viewChild(ScrollShadowDirective);

  // === Constants ===
  protected readonly filterOptions = ED_EVOLUTION_FILTER_OPTIONS;
  protected readonly noTooltipChartOptions = NO_TOOLTIP_CHART_OPTIONS;
  protected readonly DashboardDrawerType = DashboardDrawerType;

  // === Prototype Drawer Data (dummy data for stakeholder review) ===
  protected readonly protoFlywheelData: FlywheelConversionResponse = {
    conversionRate: 24.6,
    changePercentage: 3.2,
    trend: 'up',
    funnel: {
      eventAttendees: 8200,
      convertedToNewsletter: 1420,
      convertedToCommunity: 890,
      convertedToWorkingGroup: 310,
    },
    monthlyData: [
      { month: 'Nov', value: 21.2 },
      { month: 'Dec', value: 22.0 },
      { month: 'Jan', value: 22.8 },
      { month: 'Feb', value: 23.5 },
      { month: 'Mar', value: 24.1 },
      { month: 'Apr', value: 24.6 },
    ],
  };

  protected readonly protoMemberAcquisitionData: MemberAcquisitionResponse = {
    totalMembers: 245,
    totalMembersMonthlyData: [230, 233, 236, 239, 242, 245],
    totalMembersMonthlyLabels: ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'],
    newMembersThisQuarter: 8,
    newMemberRevenue: 420000,
    changePercentage: 5.2,
    trend: 'up',
    quarterlyData: [
      { quarter: 'Q1 2025', newMembers: 6, revenue: 310000 },
      { quarter: 'Q2 2025', newMembers: 7, revenue: 365000 },
      { quarter: 'Q3 2025', newMembers: 5, revenue: 280000 },
      { quarter: 'Q4 2025', newMembers: 8, revenue: 420000 },
    ],
  };

  protected readonly protoMemberRetentionData: MemberRetentionResponse = {
    renewalRate: 87.2,
    netRevenueRetention: 103,
    changePercentage: 2.1,
    trend: 'up',
    target: 85,
    monthlyData: [
      { month: 'Nov', value: 84.5 },
      { month: 'Dec', value: 85.1 },
      { month: 'Jan', value: 85.8 },
      { month: 'Feb', value: 86.3 },
      { month: 'Mar', value: 86.9 },
      { month: 'Apr', value: 87.2 },
    ],
  };

  protected readonly protoEngagedCommunityData: EngagedCommunitySizeResponse = {
    totalMembers: 12400,
    changePercentage: 8.5,
    trend: 'up',
    breakdown: {
      newsletterSubscribers: 4200,
      communityMembers: 5800,
      workingGroupMembers: 1800,
      certifiedIndividuals: 600,
    },
    monthlyData: [
      { month: 'Nov', value: 10800 },
      { month: 'Dec', value: 11100 },
      { month: 'Jan', value: 11500 },
      { month: 'Feb', value: 11800 },
      { month: 'Mar', value: 12100 },
      { month: 'Apr', value: 12400 },
    ],
  };

  // === WritableSignals ===
  public readonly selectedFilter = signal<string>('all');
  public readonly activeDrawer = signal<DashboardDrawerType | null>(null);

  // === Computed Signals ===
  protected readonly filteredCards = computed<DashboardMetricCard[]>(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') return ED_EVOLUTION_METRICS;
    return ED_EVOLUTION_METRICS.filter((card) => card.category === filter);
  });

  protected readonly northStarCards = computed<DashboardMetricCard[]>(() => this.filteredCards().filter((c) => c.category === 'memberships'));
  protected readonly nonNorthStarCards = computed<DashboardMetricCard[]>(() => this.filteredCards().filter((c) => c.category !== 'memberships'));
  protected readonly showInsightsCard = computed<boolean>(() => this.northStarCards().length > 0);

  protected readonly marketingInsights: Signal<string[]> = this.initMarketingInsights();

  // === Public Methods ===
  public handleCardClick(drawerType: DashboardDrawerType): void {
    this.activeDrawer.set(drawerType);
  }

  public handleDrawerClose(): void {
    this.activeDrawer.set(null);
  }

  // === Private Initializers ===
  private initMarketingInsights(): Signal<string[]> {
    return computed(() => {
      const signals: { label: string; change: number; detail: string }[] = [
        {
          label: 'Engaged community',
          change: this.protoEngagedCommunityData.changePercentage,
          detail: formatNumber(this.protoEngagedCommunityData.totalMembers),
        },
        {
          label: 'Member base',
          change: this.protoMemberAcquisitionData.changePercentage,
          detail: formatNumber(this.protoMemberAcquisitionData.totalMembers),
        },
        {
          label: 'Flywheel conversion',
          change: this.protoFlywheelData.changePercentage,
          detail: `${this.protoFlywheelData.conversionRate}%`,
        },
        {
          label: 'Member retention',
          change: this.protoMemberRetentionData.changePercentage,
          detail: `${this.protoMemberRetentionData.renewalRate}%`,
        },
      ];

      const sorted = signals.filter((s) => s.change !== 0).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

      return sorted.slice(0, 3).map((s) => {
        const direction = s.change > 0 ? 'up' : 'down';
        return `${s.label} is ${direction} ${Math.abs(s.change)}% — now at ${s.detail}`;
      });
    });
  }
}
