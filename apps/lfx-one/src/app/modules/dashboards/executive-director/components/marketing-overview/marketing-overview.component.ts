// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { ChartComponent } from '@components/chart/chart.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';

import { ED_EVOLUTION_FILTER_OPTIONS, ED_EVOLUTION_METRICS, NO_TOOLTIP_CHART_OPTIONS } from '@lfx-one/shared/constants';
import { DashboardDrawerType, DashboardMetricCard } from '@lfx-one/shared/interfaces';

import { ScrollShadowDirective } from '@shared/directives/scroll-shadow.directive';
import { TooltipModule } from 'primeng/tooltip';

import { BrandHealthDrawerComponent } from '../brand-health-drawer/brand-health-drawer.component';
import { BrandReachDrawerComponent } from '../brand-reach-drawer/brand-reach-drawer.component';
import { EmailCtrDrawerComponent } from '../email-ctr-drawer/email-ctr-drawer.component';
import { EngagedCommunityDrawerComponent } from '../engaged-community-drawer/engaged-community-drawer.component';
import { EventGrowthDrawerComponent } from '../event-growth-drawer/event-growth-drawer.component';
import { FlywheelConversionDrawerComponent } from '../flywheel-conversion-drawer/flywheel-conversion-drawer.component';
import { MemberAcquisitionDrawerComponent } from '../member-acquisition-drawer/member-acquisition-drawer.component';
import { MemberRetentionDrawerComponent } from '../member-retention-drawer/member-retention-drawer.component';
import { PaidSocialReachDrawerComponent } from '../paid-social-reach-drawer/paid-social-reach-drawer.component';
import { RevenueImpactDrawerComponent } from '../revenue-impact-drawer/revenue-impact-drawer.component';
import { SocialMediaDrawerComponent } from '../social-media-drawer/social-media-drawer.component';
import { WebsiteVisitsDrawerComponent } from '../website-visits-drawer/website-visits-drawer.component';

@Component({
  selector: 'lfx-marketing-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
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
    MemberRetentionDrawerComponent,
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

  // === WritableSignals ===
  public readonly selectedFilter = signal<string>('all');
  public readonly activeDrawer = signal<DashboardDrawerType | null>(null);

  // === Computed Signals ===
  protected readonly filteredCards = computed<DashboardMetricCard[]>(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') return ED_EVOLUTION_METRICS;
    return ED_EVOLUTION_METRICS.filter((card) => card.category === filter);
  });

  // === Public Methods ===
  public handleCardClick(drawerType: DashboardDrawerType): void {
    this.activeDrawer.set(drawerType);
  }

  public handleDrawerClose(): void {
    this.activeDrawer.set(null);
  }
}
