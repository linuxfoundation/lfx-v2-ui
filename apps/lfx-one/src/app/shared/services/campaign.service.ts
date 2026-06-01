// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SSEEvent } from '@lfx-one/shared/interfaces';
import { catchError, map, Observable, of, switchMap, takeWhile, timer } from 'rxjs';

import { SseService } from './sse.service';

// ---------------------------------------------------------------------------
// Inline campaign types — will move to @lfx-one/shared/interfaces and
// @lfx-one/shared/constants once the shared-package PR (LFXV2-2026) merges.
// ---------------------------------------------------------------------------

const CAMPAIGN_JOB_POLL_INTERVAL_MS = 2000;

type CampaignPlatform = 'google-ads' | 'microsoft-ads' | 'linkedin-ads' | 'meta-ads' | 'reddit-ads' | 'brave-ads' | 'feathr' | 'twitter-ads';

type CampaignGoal = 'conversions' | 'brand-awareness' | 'traffic' | 'lead-generation' | 'engagement';

type CampaignType = 'search' | 'demand-gen';

type CampaignSSEEventType = 'status' | 'event' | 'hubspot_utm' | 'copy_token' | 'copy_done' | 'copy_structured' | 'keywords' | 'error' | 'done';

type CampaignStatus = 'draft' | 'paused' | 'enabled' | 'removed' | 'limited';

type PacingLabel = 'underspending' | 'normal' | 'constrained' | 'overspending';

type ActionPriority = 'HIGH' | 'MED' | 'LOW';

interface CampaignBriefRequest {
  url: string;
  platforms: CampaignPlatform[];
  campaignGoal?: CampaignGoal;
  targetAudience?: string;
  valueProp?: string;
  totalBudget?: number;
}

interface CampaignKeyword {
  term: string;
  matchType: 'Exact' | 'Phrase' | 'Broad';
  intentLevel: 'High' | 'Medium' | 'Low';
  notes: string;
}

interface CampaignCreateRequest {
  eventName: string;
  eventSlug: string;
  countryCode: string;
  registrationUrl: string;
  hsToken?: string;
  campaignTypes: CampaignType[];
  budgetUsd: number;
  searchBudgetPct: number;
  startDate: string;
  endDate: string;
  keywords: CampaignKeyword[];
  headlines: string[];
  descriptions: string[];
  displayHeadlines?: string[];
  displayDescriptions?: string[];
  displayBusinessName?: string;
  displayCallToAction?: string;
  geoTargets: string[];
  project?: string;
  driveFolderUrl?: string;
}

interface CampaignCreateResult {
  type: CampaignType;
  campaignName: string;
  campaignId: string;
  adGroupCount: number;
  keywordCount: number;
  adCount: number;
  googleAdsUrl: string;
  steps: string[];
}

interface CampaignCreateResponse {
  success: boolean;
  campaigns: CampaignCreateResult[];
  errors: string[];
}

interface CampaignJobStatus {
  status: 'running' | 'done';
  result?: CampaignCreateResponse;
}

interface CampaignActionItem {
  campaign: string;
  priority: ActionPriority;
  issue: string;
  action: string;
  owner: string;
}

interface CampaignMetrics {
  name: string;
  shortName: string;
  eventName: string;
  adFormat: string;
  targeting: string;
  status: CampaignStatus;
  budgetDay: number;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  pacingPct: number;
  pacingLabel: PacingLabel;
  actionRules: CampaignActionItem[];
}

interface CampaignAccountTotals {
  budgetDay: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface CampaignMonitorResponse {
  pulledAt: string;
  dateRange: { mode: string };
  campaigns: CampaignMetrics[];
  accountTotals: CampaignAccountTotals;
  actionItems: CampaignActionItem[];
  message?: string;
}

interface KeywordMetrics {
  keyword: string;
  matchType: string;
  qualityScore: number | null;
  status: string;
  adGroup: string;
  campaign: string;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
  spend: number;
  conversions: number;
}

interface KeywordTotals {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  avgCtr: number;
}

interface KeywordMetricsResponse {
  pulledAt: string;
  days: number;
  totalKeywords: number;
  totals: KeywordTotals;
  keywords: KeywordMetrics[];
}

interface AudienceBucket {
  label: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
}

interface AudienceDemographics {
  pulledAt: string;
  days: number;
  age: AudienceBucket[];
  gender: AudienceBucket[];
  device: AudienceBucket[];
}

interface HubSpotUtmLookupResult {
  found: boolean;
  hs_utm: string | null;
  campaign_name: string;
  all_matches: { name: string; hs_utm: string }[];
}

interface HubSpotUtmCreateResult {
  created: boolean;
  hs_utm: string | null;
  campaign_name: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable({ providedIn: 'root' })
export class CampaignService {
  private readonly http = inject(HttpClient);
  private readonly sse = inject(SseService);

  public generateBrief(request: CampaignBriefRequest): Observable<SSEEvent<CampaignSSEEventType>> {
    return this.sse.connect<CampaignSSEEventType>('/api/campaigns/brief/generate', {
      method: 'POST',
      body: request,
    });
  }

  public createCampaign(request: CampaignCreateRequest): Observable<{ jobId: string }> {
    return this.http.post<{ jobId: string }>('/api/campaigns/create', request).pipe(catchError(() => of({ jobId: '' })));
  }

  public getCreateResult(jobId: string): Observable<CampaignCreateResponse | null> {
    return this.pollJobStatus(jobId).pipe(
      map((status) => (status.status === 'done' ? (status.result ?? null) : null)),
      catchError(() => of(null))
    );
  }

  public getMonitorData(days: number = 14): Observable<CampaignMonitorResponse | null> {
    return this.http.get<CampaignMonitorResponse>('/api/campaigns/monitor', { params: { days } }).pipe(catchError(() => of(null)));
  }

  public getKeywords(days: number = 14): Observable<KeywordMetricsResponse | null> {
    return this.http.get<KeywordMetricsResponse>('/api/campaigns/keywords', { params: { days } }).pipe(catchError(() => of(null)));
  }

  public getAudience(days: number = 14): Observable<AudienceDemographics | null> {
    return this.http.get<AudienceDemographics>('/api/campaigns/audience', { params: { days } }).pipe(catchError(() => of(null)));
  }

  public lookupHubSpotUtm(eventName: string): Observable<HubSpotUtmLookupResult | null> {
    return this.http.get<HubSpotUtmLookupResult>('/api/campaigns/hubspot/utm', { params: { event_name: eventName } }).pipe(catchError(() => of(null)));
  }

  public createHubSpotUtm(eventName: string): Observable<HubSpotUtmCreateResult | null> {
    return this.http
      .post<HubSpotUtmCreateResult>('/api/campaigns/hubspot/utm/create', null, { params: { event_name: eventName } })
      .pipe(catchError(() => of(null)));
  }

  private pollJobStatus(jobId: string): Observable<CampaignJobStatus> {
    return timer(0, CAMPAIGN_JOB_POLL_INTERVAL_MS).pipe(
      switchMap(() => this.http.get<CampaignJobStatus>(`/api/campaigns/jobs/${encodeURIComponent(jobId)}`)),
      takeWhile((status) => status.status === 'running', true)
    );
  }
}
