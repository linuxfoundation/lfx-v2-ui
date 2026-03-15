// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { afterNextRender, Component, computed, inject, signal, Signal, ViewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';
import { MARKETING_OVERVIEW_METRICS, NO_TOOLTIP_CHART_OPTIONS } from '@lfx-one/shared/constants';
import { lfxColors } from '@lfx-one/shared/constants';
import {
  DashboardDrawerType,
  DashboardMetricCard,
  EmailCtrResponse,
  SocialMediaResponse,
  SocialReachResponse,
  WebActivitiesSummaryResponse,
} from '@lfx-one/shared/interfaces';
import { hexToRgba } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { ProjectContextService } from '@services/project-context.service';
import { ScrollShadowDirective } from '@shared/directives/scroll-shadow.directive';
import { catchError, combineLatest, filter, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { EmailCtrDrawerComponent } from '../email-ctr-drawer/email-ctr-drawer.component';
import { PaidSocialReachDrawerComponent } from '../paid-social-reach-drawer/paid-social-reach-drawer.component';
import { SocialMediaDrawerComponent } from '../social-media-drawer/social-media-drawer.component';
import { WebsiteVisitsDrawerComponent } from '../website-visits-drawer/website-visits-drawer.component';

@Component({
  selector: 'lfx-marketing-overview',
  imports: [
    MetricCardComponent,
    ScrollShadowDirective,
    WebsiteVisitsDrawerComponent,
    EmailCtrDrawerComponent,
    PaidSocialReachDrawerComponent,
    SocialMediaDrawerComponent,
  ],
  templateUrl: './marketing-overview.component.html',
})
export class MarketingOverviewComponent {
  @ViewChild(ScrollShadowDirective) public scrollShadowDirective!: ScrollShadowDirective;

  // === Services ===
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);

  // === WritableSignals ===
  private readonly marketingDataLoading = signal(true);
  private readonly browserReady = signal(false);
  public readonly activeDrawer = signal<DashboardDrawerType | null>(null);

  // === Observables ===
  private readonly selectedFoundationSlug$ = toObservable(this.projectContextService.selectedFoundation).pipe(map((foundation) => foundation?.slug || ''));

  // === Constants ===
  protected readonly DashboardDrawerType = DashboardDrawerType;

  // === Dummy Data ===
  protected readonly marketingInsights: string[] = [
    'Primary driver: Email CTR declined due to weaker newsletter engagement',
    'Event registrations increased 18% vs last month driven by KubeCon promotion',
    'Social reach growth aligns with major product announcements in February',
  ];

  protected readonly socialMediaData: SocialMediaResponse = {
    totalFollowers: 284_500,
    totalPlatforms: 5,
    changePercentage: 8.3,
    trend: 'up',
    platforms: [
      { platform: 'Twitter/X', followers: 125_000, engagementRate: 3.2, postsLast30Days: 45, impressions: 1_250_000, iconClass: 'fa-brands fa-x-twitter' },
      { platform: 'LinkedIn', followers: 89_000, engagementRate: 4.8, postsLast30Days: 28, impressions: 890_000, iconClass: 'fa-brands fa-linkedin' },
      { platform: 'YouTube', followers: 42_000, engagementRate: 2.1, postsLast30Days: 8, impressions: 520_000, iconClass: 'fa-brands fa-youtube' },
      { platform: 'Mastodon', followers: 18_500, engagementRate: 5.4, postsLast30Days: 32, impressions: 185_000, iconClass: 'fa-brands fa-mastodon' },
      { platform: 'Bluesky', followers: 10_000, engagementRate: 6.1, postsLast30Days: 22, impressions: 95_000, iconClass: 'fa-brands fa-bluesky' },
    ],
    monthlyData: [
      { month: 'Oct 2025', totalFollowers: 248_000, totalEngagements: 42_000 },
      { month: 'Nov 2025', totalFollowers: 256_000, totalEngagements: 45_500 },
      { month: 'Dec 2025', totalFollowers: 261_000, totalEngagements: 38_000 },
      { month: 'Jan 2026', totalFollowers: 270_000, totalEngagements: 48_200 },
      { month: 'Feb 2026', totalFollowers: 278_000, totalEngagements: 51_000 },
      { month: 'Mar 2026', totalFollowers: 284_500, totalEngagements: 53_400 },
    ],
  };

  // === Computed Signals ===
  protected readonly marketingData: Signal<{ webActivities: WebActivitiesSummaryResponse; emailCtr: EmailCtrResponse; socialReach: SocialReachResponse }> =
    this.initMarketingData();
  protected readonly marketingCards: Signal<DashboardMetricCard[]> = this.initMarketingCards();

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
      const { webActivities, emailCtr, socialReach } = this.marketingData();
      const loading = this.marketingDataLoading();

      return MARKETING_OVERVIEW_METRICS.map((card) => {
        if (card.title === 'Website Visits') {
          return this.transformWebsiteVisits(card, webActivities, loading);
        }
        if (card.title === 'Email CTR') {
          return this.transformEmailCtr(card, emailCtr, loading);
        }
        if (card.title === 'Paid Social Reach') {
          return this.transformSocialReach(card, socialReach, loading);
        }
        if (card.title === 'Social Media') {
          return this.transformSocialMedia(card);
        }
        return card;
      });
    });
  }

  private initMarketingData(): Signal<{ webActivities: WebActivitiesSummaryResponse; emailCtr: EmailCtrResponse; socialReach: SocialReachResponse }> {
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

    const defaultValue = { webActivities: defaultWebActivities, emailCtr: defaultEmailCtr, socialReach: defaultSocialReach };

    return toSignal(
      combineLatest([toObservable(this.browserReady), this.selectedFoundationSlug$]).pipe(
        filter(([ready, slug]) => ready && !!slug),
        map(([, slug]) => slug),
        tap(() => {
          this.marketingDataLoading.set(true);
          this.activeDrawer.set(null);
        }),
        switchMap((foundationSlug) =>
          forkJoin({
            webActivities: this.analyticsService.getWebActivitiesSummary(foundationSlug),
            emailCtr: this.analyticsService.getEmailCtr(foundationSlug),
            socialReach: this.analyticsService.getSocialReach(foundationSlug),
          }).pipe(
            tap(() => this.marketingDataLoading.set(false)),
            catchError(() => {
              this.marketingDataLoading.set(false);
              return of(defaultValue);
            })
          )
        )
      ),
      { initialValue: defaultValue }
    );
  }

  // === Private Helpers ===
  private transformWebsiteVisits(card: DashboardMetricCard, data: WebActivitiesSummaryResponse, loading: boolean): DashboardMetricCard {
    return {
      ...card,
      loading,
      value: data.totalSessions > 0 ? this.formatNumber(data.totalSessions) : undefined,
      subtitle: data.totalSessions > 0 ? `Last 30 days · ${this.formatNumber(data.totalPageViews)} page views` : undefined,
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

  private transformSocialMedia(card: DashboardMetricCard): DashboardMetricCard {
    const data = this.socialMediaData;
    return {
      ...card,
      loading: false,
      value: this.formatNumber(data.totalFollowers),
      subtitle: `${data.totalPlatforms} platforms · Last 6 months`,
      changePercentage: data.changePercentage !== 0 ? `${data.changePercentage > 0 ? '+' : ''}${data.changePercentage}%` : undefined,
      trend: data.trend,
      chartData: {
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
      },
      chartOptions: NO_TOOLTIP_CHART_OPTIONS,
    };
  }

  private getSocialReachValue(data: SocialReachResponse): string | undefined {
    if (data.roas > 0) return `${data.roas.toFixed(2)}x`;
    if (data.totalReach > 0) return this.formatNumber(data.totalReach);
    return undefined;
  }

  private getSocialReachSubtitle(data: SocialReachResponse): string | undefined {
    if (data.roas > 0) return 'ROAS · Last 30 days';
    if (data.totalReach > 0) return 'Last 6 months';
    return undefined;
  }

  private formatNumber(num: number): string {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  }
}
