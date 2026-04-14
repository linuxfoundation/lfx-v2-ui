// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal, Signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';

import { buildEdEvolutionMetrics, ED_EVOLUTION_FILTER_OPTIONS, NO_TOOLTIP_CHART_OPTIONS } from '@lfx-one/shared/constants';
import {
  BrandHealthResponse,
  BrandReachResponse,
  DashboardDrawerType,
  DashboardMetricCard,
  EdEvolutionData,
  EngagedCommunitySizeResponse,
  EventGrowthResponse,
  FlywheelConversionResponse,
  MemberAcquisitionResponse,
  MemberRetentionResponse,
  RevenueImpactResponse,
} from '@lfx-one/shared/interfaces';
import { formatNumber } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';

import { ScrollShadowDirective } from '@shared/directives/scroll-shadow.directive';
import { combineLatest, filter, finalize, forkJoin, map, switchMap, tap } from 'rxjs';

import { BrandHealthDrawerComponent } from '../brand-health-drawer/brand-health-drawer.component';
import { BrandReachDrawerComponent } from '../brand-reach-drawer/brand-reach-drawer.component';
import { EngagedCommunityDrawerComponent } from '../engaged-community-drawer/engaged-community-drawer.component';
import { EventGrowthDrawerComponent } from '../event-growth-drawer/event-growth-drawer.component';
import { FlywheelConversionDrawerComponent } from '../flywheel-conversion-drawer/flywheel-conversion-drawer.component';
import { MemberAcquisitionDrawerComponent } from '../member-acquisition-drawer/member-acquisition-drawer.component';
import { RevenueImpactDrawerComponent } from '../revenue-impact-drawer/revenue-impact-drawer.component';

type EdEvolutionFilterId = 'all' | 'memberships' | 'brand' | 'influence';

@Component({
  selector: 'lfx-marketing-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    FilterPillsComponent,
    MetricCardComponent,
    ScrollShadowDirective,
    BrandHealthDrawerComponent,
    BrandReachDrawerComponent,
    EngagedCommunityDrawerComponent,
    EventGrowthDrawerComponent,
    FlywheelConversionDrawerComponent,
    MemberAcquisitionDrawerComponent,
    RevenueImpactDrawerComponent,
  ],
  templateUrl: './marketing-overview.component.html',
  styleUrl: './marketing-overview.component.scss',
})
export class MarketingOverviewComponent {
  public readonly scrollShadowDirective = viewChild(ScrollShadowDirective);

  // === Services ===
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);

  // === WritableSignals ===
  protected readonly edDataLoading = signal(true);
  public readonly selectedFilter = signal<EdEvolutionFilterId>('all');
  public readonly activeDrawer = signal<DashboardDrawerType | null>(null);
  private readonly browserReady = signal(false);

  // === Observables ===
  private readonly selectedFoundation$ = toObservable(this.projectContextService.selectedFoundation).pipe(
    map((foundation) => ({ slug: foundation?.slug || '', name: foundation?.name || '' }))
  );

  // === Constants ===
  protected readonly DashboardDrawerType = DashboardDrawerType;
  protected readonly filterOptions = ED_EVOLUTION_FILTER_OPTIONS;
  protected readonly noTooltipChartOptions = NO_TOOLTIP_CHART_OPTIONS;
  protected readonly formatNumber = formatNumber;

  // === Complex signals ===
  protected readonly edData: Signal<EdEvolutionData> = this.initEdData();

  protected readonly allCards: Signal<DashboardMetricCard[]> = computed(() => buildEdEvolutionMetrics(this.edData()));

  protected readonly visibleCards: Signal<DashboardMetricCard[]> = computed(() => {
    const filterId = this.selectedFilter();
    const cards = this.allCards();
    if (filterId === 'all') return cards;
    return cards.filter((c) => c.category === filterId);
  });

  public constructor() {
    afterNextRender(() => {
      this.browserReady.set(true);
    });
  }

  // === Public Methods ===
  public handleFilterChange(filterId: string): void {
    this.selectedFilter.set(filterId as EdEvolutionFilterId);
  }

  public handleCardClick(drawerType: DashboardDrawerType | undefined): void {
    if (!drawerType) return;
    this.activeDrawer.set(drawerType);
  }

  public handleDrawerClose(): void {
    this.activeDrawer.set(null);
  }

  // === Private Initializers ===
  private initEdData(): Signal<EdEvolutionData> {
    const defaultFlywheel: FlywheelConversionResponse = {
      conversionRate: 0,
      changePercentage: 0,
      trend: 'up',
      funnel: { eventAttendees: 0, convertedToNewsletter: 0, convertedToCommunity: 0, convertedToWorkingGroup: 0 },
      reengagement: {
        totalReengaged: 0,
        reengagementRate: 0,
        reengagementMomChange: 0,
        reengagedToNewsletter: 0,
        reengagedToCommunity: 0,
        reengagedToWorkingGroup: 0,
      },
      monthlyData: [],
    };
    const defaultAcquisition: MemberAcquisitionResponse = {
      totalMembers: 0,
      totalMembersMonthlyData: [],
      totalMembersMonthlyLabels: [],
      newMembersThisQuarter: 0,
      newMemberRevenue: 0,
      changePercentage: 0,
      trend: 'up',
      quarterlyData: [],
    };
    const defaultRetention: MemberRetentionResponse = {
      renewalRate: 0,
      netRevenueRetention: 0,
      changePercentage: 0,
      trend: 'up',
      target: 85,
      monthlyData: [],
    };
    const defaultEngaged: EngagedCommunitySizeResponse = {
      totalMembers: 0,
      changePercentage: 0,
      trend: 'up',
      breakdown: { newsletterSubscribers: 0, communityMembers: 0, workingGroupMembers: 0, certifiedIndividuals: 0 },
      monthlyData: [],
    };
    const defaultEventGrowth: EventGrowthResponse = {
      totalAttendees: 0,
      totalEvents: 0,
      totalRevenue: 0,
      revenuePerAttendee: 0,
      attendeeMomChange: 0,
      revenueMomChange: 0,
      trend: 'up',
      monthlyData: [],
      topEvents: [],
    };
    const defaultBrandReach: BrandReachResponse = {
      totalSocialFollowers: 0,
      totalMonthlySessions: 0,
      activePlatforms: 0,
      changePercentage: 0,
      trend: 'up',
      socialPlatforms: [],
      websiteDomains: [],
      dailyTrend: [],
    };
    const defaultBrandHealth: BrandHealthResponse = {
      totalMentions: 0,
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      sentimentMomChangePp: 0,
      trend: 'up',
      monthlyMentions: [],
      topProjects: [],
    };
    const defaultRevenueImpact: RevenueImpactResponse = {
      pipelineInfluenced: 0,
      revenueAttributed: 0,
      matchRate: 0,
      changePercentage: 0,
      trend: 'up',
      attributionModels: { linear: 0, firstTouch: 0, lastTouch: 0 },
      engagementTypes: [],
      paidMedia: { roas: 0, impressions: 0, adSpend: 0, adRevenue: 0 },
    };

    const defaultValue: EdEvolutionData = {
      flywheel: defaultFlywheel,
      memberAcquisition: defaultAcquisition,
      memberRetention: defaultRetention,
      engagedCommunity: defaultEngaged,
      eventGrowth: defaultEventGrowth,
      brandReach: defaultBrandReach,
      brandHealth: defaultBrandHealth,
      revenueImpact: defaultRevenueImpact,
    };

    return toSignal(
      combineLatest([toObservable(this.browserReady), this.selectedFoundation$]).pipe(
        filter(([ready, foundation]) => ready && !!foundation.slug),
        map(([, foundation]) => foundation),
        tap(() => {
          this.edDataLoading.set(true);
          this.activeDrawer.set(null);
        }),
        switchMap((foundation) =>
          forkJoin({
            flywheel: this.analyticsService.getFlywheelConversion(foundation.slug),
            memberAcquisition: this.analyticsService.getMemberAcquisition(foundation.slug),
            memberRetention: this.analyticsService.getMemberRetention(foundation.slug),
            engagedCommunity: this.analyticsService.getEngagedCommunity(foundation.slug),
            eventGrowth: this.analyticsService.getEventGrowth(foundation.slug),
            brandReach: this.analyticsService.getBrandReach(foundation.slug),
            brandHealth: this.analyticsService.getBrandHealth(foundation.slug),
            revenueImpact: this.analyticsService.getRevenueImpact(foundation.slug),
          }).pipe(tap(() => this.edDataLoading.set(false)))
        ),
        finalize(() => this.edDataLoading.set(false))
      ),
      { initialValue: defaultValue }
    );
  }
}
