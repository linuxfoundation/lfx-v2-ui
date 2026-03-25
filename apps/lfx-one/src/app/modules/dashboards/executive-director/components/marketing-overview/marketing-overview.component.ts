// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal, Signal, ViewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';

import { MARKETING_OVERVIEW_METRICS, NO_TOOLTIP_CHART_OPTIONS } from '@lfx-one/shared/constants';
import { lfxColors } from '@lfx-one/shared/constants';
import {
  DashboardDrawerType,
  DashboardMetricCard,
  EmailCtrResponse,
  EngagedCommunitySizeResponse,
  FlywheelConversionResponse,
  MemberAcquisitionResponse,
  MemberRetentionResponse,
  SocialMediaResponse,
  SocialReachResponse,
  WebActivitiesSummaryResponse,
} from '@lfx-one/shared/interfaces';
import { formatNumber, hexToRgba } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { ScrollShadowDirective } from '@shared/directives/scroll-shadow.directive';
import { catchError, combineLatest, filter, finalize, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { EmailCtrDrawerComponent } from '../email-ctr-drawer/email-ctr-drawer.component';
import { EngagedCommunityDrawerComponent } from '../engaged-community-drawer/engaged-community-drawer.component';
import { FlywheelConversionDrawerComponent } from '../flywheel-conversion-drawer/flywheel-conversion-drawer.component';
import { MemberAcquisitionDrawerComponent } from '../member-acquisition-drawer/member-acquisition-drawer.component';
import { PaidSocialReachDrawerComponent } from '../paid-social-reach-drawer/paid-social-reach-drawer.component';
import { SocialMediaDrawerComponent } from '../social-media-drawer/social-media-drawer.component';
import { WebsiteVisitsDrawerComponent } from '../website-visits-drawer/website-visits-drawer.component';

@Component({
  selector: 'lfx-marketing-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    MetricCardComponent,
    ScrollShadowDirective,

    WebsiteVisitsDrawerComponent,
    EmailCtrDrawerComponent,
    PaidSocialReachDrawerComponent,
    SocialMediaDrawerComponent,
    EngagedCommunityDrawerComponent,
    MemberAcquisitionDrawerComponent,
    FlywheelConversionDrawerComponent,
  ],
  templateUrl: './marketing-overview.component.html',
  styleUrl: './marketing-overview.component.scss',
})
export class MarketingOverviewComponent {
  @ViewChild(ScrollShadowDirective) public scrollShadowDirective!: ScrollShadowDirective;

  // === Services ===
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);

  // === WritableSignals ===
  protected readonly marketingDataLoading = signal(true);
  private readonly browserReady = signal(false);
  public readonly activeDrawer = signal<DashboardDrawerType | null>(null);

  // === Observables ===
  private readonly selectedFoundation$ = toObservable(this.projectContextService.selectedFoundation).pipe(
    map((foundation) => ({ slug: foundation?.slug || '', name: foundation?.name || '' }))
  );

  // === Constants ===
  protected readonly DashboardDrawerType = DashboardDrawerType;

  // === Computed Signals ===
  protected readonly marketingInsights: Signal<string[]> = this.initMarketingInsights();
  protected readonly marketingData: Signal<{
    webActivities: WebActivitiesSummaryResponse;
    emailCtr: EmailCtrResponse;
    socialReach: SocialReachResponse;
    socialMedia: SocialMediaResponse;
    memberRetention: MemberRetentionResponse;
    memberAcquisition: MemberAcquisitionResponse;
    engagedCommunity: EngagedCommunitySizeResponse;
    flywheelConversion: FlywheelConversionResponse;
  }> = this.initMarketingData();
  protected readonly marketingCards: Signal<DashboardMetricCard[]> = this.initMarketingCards();
  protected readonly formatNumber = formatNumber;
  protected readonly noTooltipChartOptions = NO_TOOLTIP_CHART_OPTIONS;

  // North Star sparkline chart data
  protected readonly memberGrowthChartData = computed(() => {
    const { totalMembersMonthlyData, totalMembersMonthlyLabels } = this.marketingData().memberAcquisition;
    if (totalMembersMonthlyData.length === 0) return undefined;
    return {
      labels: totalMembersMonthlyLabels,
      datasets: [
        {
          data: totalMembersMonthlyData,
          borderColor: lfxColors.blue[500],
          backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  });

  protected readonly flywheelChartData = computed(() => {
    const { monthlyData } = this.marketingData().flywheelConversion;
    if (monthlyData.length === 0) return undefined;
    return {
      labels: monthlyData.map((d) => d.month),
      datasets: [
        {
          data: monthlyData.map((d) => d.value),
          borderColor: lfxColors.blue[500],
          backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  });

  protected readonly engagedCommunityChartData = computed(() => {
    const { monthlyData } = this.marketingData().engagedCommunity;
    if (monthlyData.length === 0) return undefined;
    return {
      labels: monthlyData.map((d) => d.month),
      datasets: [
        {
          data: monthlyData.map((d) => d.value),
          borderColor: lfxColors.blue[500],
          backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  });

  public constructor() {
    afterNextRender(() => {
      this.browserReady.set(true);
    });
  }

  // === Public Methods ===
  public handleCardClick(drawerType: DashboardDrawerType): void {
    this.activeDrawer.set(drawerType);
  }

  public handleDrawerClose(): void {
    this.activeDrawer.set(null);
  }

  // === Private Initializers ===
  private initMarketingCards(): Signal<DashboardMetricCard[]> {
    return computed(() => {
      const { webActivities, emailCtr, socialReach, socialMedia } = this.marketingData();
      const loading = this.marketingDataLoading();

      return MARKETING_OVERVIEW_METRICS.map((card) => {
        switch (card.drawerType) {
          case DashboardDrawerType.MarketingWebsiteVisits:
            return this.transformWebsiteVisits(card, webActivities, loading);
          case DashboardDrawerType.MarketingEmailCtr:
            return this.transformEmailCtr(card, emailCtr, loading);
          case DashboardDrawerType.MarketingPaidSocialReach:
            return this.transformSocialReach(card, socialReach, loading);
          case DashboardDrawerType.MarketingSocialMedia:
            return this.transformSocialMedia(card, socialMedia, loading);
          default:
            return card;
        }
      });
    });
  }

  private initMarketingData(): Signal<{
    webActivities: WebActivitiesSummaryResponse;
    emailCtr: EmailCtrResponse;
    socialReach: SocialReachResponse;
    socialMedia: SocialMediaResponse;
    memberRetention: MemberRetentionResponse;
    memberAcquisition: MemberAcquisitionResponse;
    engagedCommunity: EngagedCommunitySizeResponse;
    flywheelConversion: FlywheelConversionResponse;
  }> {
    const defaultWebActivities: WebActivitiesSummaryResponse = {
      totalSessions: 0,
      totalPageViews: 0,
      domainGroups: [],
      dailyData: [],
      dailyLabels: [],
    };

    const defaultEmailCtr: EmailCtrResponse = {
      currentCtr: 0,
      changePercentage: 0,
      trend: 'up',
      monthlyData: [],
      monthlyLabels: [],
      campaignGroups: [],
      monthlySends: [],
      monthlyOpens: [],
    };

    const defaultSocialReach: SocialReachResponse = {
      totalReach: 0,
      roas: 0,
      totalSpend: 0,
      totalRevenue: 0,
      changePercentage: 0,
      trend: 'up',
      monthlyData: [],
      monthlyLabels: [],
      monthlyRoas: [],
      channelGroups: [],
    };

    const defaultSocialMedia: SocialMediaResponse = {
      totalFollowers: 0,
      totalPlatforms: 0,
      changePercentage: 0,
      trend: 'up',
      platforms: [],
      monthlyData: [],
    };

    const defaultMemberRetention: MemberRetentionResponse = {
      renewalRate: 0,
      netRevenueRetention: 0,
      changePercentage: 0,
      trend: 'up',
      target: 85,
      monthlyData: [],
    };

    const defaultMemberAcquisition: MemberAcquisitionResponse = {
      totalMembers: 0,
      totalMembersMonthlyData: [],
      totalMembersMonthlyLabels: [],
      newMembersThisQuarter: 0,
      newMemberRevenue: 0,
      changePercentage: 0,
      trend: 'up',
      quarterlyData: [],
    };

    const defaultEngagedCommunity: EngagedCommunitySizeResponse = {
      totalMembers: 0,
      changePercentage: 0,
      trend: 'up',
      breakdown: {
        newsletterSubscribers: 0,
        communityMembers: 0,
        workingGroupMembers: 0,
        certifiedIndividuals: 0,
      },
      monthlyData: [],
    };

    const defaultFlywheelConversion: FlywheelConversionResponse = {
      conversionRate: 0,
      changePercentage: 0,
      trend: 'up',
      funnel: {
        eventAttendees: 0,
        convertedToNewsletter: 0,
        convertedToCommunity: 0,
        convertedToWorkingGroup: 0,
      },
      monthlyData: [],
    };

    const defaultValue = {
      webActivities: defaultWebActivities,
      emailCtr: defaultEmailCtr,
      socialReach: defaultSocialReach,
      socialMedia: defaultSocialMedia,
      memberRetention: defaultMemberRetention,
      memberAcquisition: defaultMemberAcquisition,
      engagedCommunity: defaultEngagedCommunity,
      flywheelConversion: defaultFlywheelConversion,
    };

    return toSignal(
      combineLatest([toObservable(this.browserReady), this.selectedFoundation$]).pipe(
        filter(([ready, foundation]) => ready && !!foundation.slug),
        map(([, foundation]) => foundation),
        tap(() => {
          this.marketingDataLoading.set(true);
          this.activeDrawer.set(null);
        }),
        switchMap((foundation) =>
          forkJoin({
            webActivities: this.analyticsService.getWebActivitiesSummary(foundation.slug),
            emailCtr: this.analyticsService.getEmailCtr(foundation.name),
            socialReach: this.analyticsService.getSocialReach(foundation.name),
            socialMedia: this.analyticsService.getSocialMedia(foundation.name),
            memberRetention: this.analyticsService.getMemberRetention(foundation.slug),
            memberAcquisition: this.analyticsService.getMemberAcquisition(foundation.slug),
            engagedCommunity: this.analyticsService.getEngagedCommunity(foundation.slug),
            flywheelConversion: this.analyticsService.getFlywheelConversion(foundation.slug),
          }).pipe(
            tap(() => this.marketingDataLoading.set(false)),
            catchError(() => {
              this.marketingDataLoading.set(false);
              return of(defaultValue);
            })
          )
        ),
        finalize(() => this.marketingDataLoading.set(false))
      ),
      { initialValue: defaultValue }
    );
  }

  private initMarketingInsights(): Signal<string[]> {
    return computed(() => {
      const { webActivities, emailCtr } = this.marketingData();
      const loading = this.marketingDataLoading();
      const insights: string[] = [];

      if (loading) {
        return insights;
      }

      // Email CTR insight
      if (emailCtr.currentCtr > 0) {
        if (emailCtr.changePercentage < 0) {
          insights.push(`Email CTR declined ${Math.abs(emailCtr.changePercentage)}% to ${emailCtr.currentCtr.toFixed(1)}% — review newsletter engagement`);
        } else if (emailCtr.changePercentage > 0) {
          insights.push(`Email CTR grew ${emailCtr.changePercentage}% to ${emailCtr.currentCtr.toFixed(1)}% — content strategy is working`);
        } else {
          insights.push(`Email CTR steady at ${emailCtr.currentCtr.toFixed(1)}%`);
        }
      }

      // Website visits insight
      if (webActivities.totalSessions > 0) {
        const pagesPerSession = webActivities.totalPageViews / webActivities.totalSessions;
        insights.push(`${formatNumber(webActivities.totalSessions)} website sessions with ${pagesPerSession.toFixed(1)} pages per visit`);
      }

      // Domain concentration insight
      if (webActivities.domainGroups.length > 1 && webActivities.totalSessions > 0) {
        const sorted = [...webActivities.domainGroups].sort((a, b) => b.totalSessions - a.totalSessions);
        const topDomain = sorted[0];
        const topShare = (topDomain.totalSessions / webActivities.totalSessions) * 100;
        insights.push(`${topDomain.domainGroup} drives ${topShare.toFixed(0)}% of web traffic`);
      }

      return insights;
    });
  }

  // === Private Helpers ===
  private transformWebsiteVisits(card: DashboardMetricCard, data: WebActivitiesSummaryResponse, loading: boolean): DashboardMetricCard {
    return {
      ...card,
      loading,
      value: data.totalSessions > 0 ? formatNumber(data.totalSessions) : undefined,
      subtitle: data.totalSessions > 0 ? `Last 30 days · ${formatNumber(data.totalPageViews)} page views` : undefined,
      chartData:
        data.dailyData.length > 0
          ? {
              labels: data.dailyLabels,
              datasets: [
                {
                  data: data.dailyData,
                  borderColor: lfxColors.blue[500],
                  backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
                  fill: true,
                  tension: 0.4,
                  borderWidth: 2,
                  pointRadius: 0,
                },
              ],
            }
          : card.chartData,
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    };
  }

  private transformEmailCtr(card: DashboardMetricCard, data: EmailCtrResponse, loading: boolean): DashboardMetricCard {
    return {
      ...card,
      loading,
      value: data.currentCtr > 0 ? `${data.currentCtr.toFixed(1)}%` : undefined,
      subtitle: data.currentCtr > 0 ? 'Last 6 months' : undefined,
      changePercentage: data.changePercentage !== 0 ? `${data.changePercentage}%` : undefined,
      trend: data.trend,
      chartData:
        data.monthlyData.length > 0
          ? {
              labels: data.monthlyLabels,
              datasets: [
                {
                  data: data.monthlyData,
                  borderColor: lfxColors.blue[500],
                  backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
                  fill: true,
                  tension: 0.4,
                  borderWidth: 2,
                  pointRadius: 0,
                },
              ],
            }
          : card.chartData,
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    };
  }

  private transformSocialReach(card: DashboardMetricCard, data: SocialReachResponse, loading: boolean): DashboardMetricCard {
    return {
      ...card,
      loading,
      value: this.getSocialReachValue(data),
      subtitle: this.getSocialReachSubtitle(data),
      changePercentage: data.changePercentage !== 0 ? `${data.changePercentage > 0 ? '+' : ''}${data.changePercentage}%` : undefined,
      trend: data.trend,
      chartData:
        data.monthlyRoas && data.monthlyRoas.length > 0
          ? {
              labels: data.monthlyLabels,
              datasets: [
                {
                  data: data.monthlyRoas,
                  borderColor: lfxColors.blue[500],
                  backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
                  fill: true,
                  tension: 0.4,
                  borderWidth: 2,
                  pointRadius: 0,
                },
              ],
            }
          : card.chartData,
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    };
  }

  private transformSocialMedia(card: DashboardMetricCard, data: SocialMediaResponse, loading: boolean): DashboardMetricCard {
    return {
      ...card,
      loading,
      value: data.totalFollowers > 0 ? formatNumber(data.totalFollowers) : undefined,
      subtitle: data.totalFollowers > 0 ? `${data.totalPlatforms} platforms · Last 6 months` : undefined,
      changePercentage: data.changePercentage !== 0 ? `${data.changePercentage > 0 ? '+' : ''}${data.changePercentage}%` : undefined,
      trend: data.trend,
      chartData:
        data.monthlyData.length > 0
          ? {
              labels: data.monthlyData.map((d) => d.month),
              datasets: [
                {
                  data: data.monthlyData.map((d) => d.totalFollowers),
                  borderColor: lfxColors.blue[500],
                  backgroundColor: hexToRgba(lfxColors.blue[500], 0.1),
                  fill: true,
                  tension: 0.4,
                  borderWidth: 2,
                  pointRadius: 0,
                },
              ],
            }
          : card.chartData,
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    };
  }

  private getSocialReachValue(data: SocialReachResponse): string | undefined {
    if (data.roas > 0) return `${data.roas.toFixed(2)}x`;
    if (data.totalReach > 0) return formatNumber(data.totalReach);
    return undefined;
  }

  private getSocialReachSubtitle(data: SocialReachResponse): string | undefined {
    if (data.roas > 0) return 'ROAS · Last 6 months';
    if (data.totalReach > 0) return 'Last 6 months';
    return undefined;
  }
}
