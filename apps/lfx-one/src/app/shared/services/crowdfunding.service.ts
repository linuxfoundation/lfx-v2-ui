// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CrowdfundingInitiativesStats, InitiativesResponse } from '@lfx-one/shared/interfaces';
import { catchError, Observable, of } from 'rxjs';

const EMPTY_RESPONSE: InitiativesResponse = { data: [], total: 0, pageSize: 0, offset: 0 };
const EMPTY_STATS: CrowdfundingInitiativesStats = { activeCount: 0, totalRaised: 0, monthlyGain: 0, totalSponsors: 0 };

@Injectable({
  providedIn: 'root',
})
export class CrowdfundingService {
  private readonly http = inject(HttpClient);

  public getMyInitiatives(): Observable<InitiativesResponse> {
    return this.http.get<InitiativesResponse>('/api/crowdfunding/initiatives').pipe(
      catchError((err) => {
        console.error('[CrowdfundingService] getMyInitiatives failed', err);
        return of(EMPTY_RESPONSE);
      })
    );
  }

  public getMyInitiativesStats(): Observable<CrowdfundingInitiativesStats> {
    return this.http.get<CrowdfundingInitiativesStats>('/api/crowdfunding/initiatives/stats').pipe(
      catchError((err) => {
        console.error('[CrowdfundingService] getMyInitiativesStats failed', err);
        return of(EMPTY_STATS);
      })
    );
  }
}
