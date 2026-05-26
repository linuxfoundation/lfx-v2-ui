// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY_CROWDFUNDING_STATS, EMPTY_INITIATIVES_RESPONSE } from '@lfx-one/shared/constants';
import { CrowdfundingInitiativesStats, InitiativesResponse } from '@lfx-one/shared/interfaces';
import { catchError, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CrowdfundingService {
  private readonly http = inject(HttpClient);

  public getMyInitiatives(): Observable<InitiativesResponse> {
    return this.http.get<InitiativesResponse>('/api/crowdfunding/initiatives').pipe(
      catchError((err) => {
        console.error('[CrowdfundingService] getMyInitiatives failed', err);
        return of(EMPTY_INITIATIVES_RESPONSE);
      })
    );
  }

  public getMyInitiativesStats(): Observable<CrowdfundingInitiativesStats> {
    return this.http.get<CrowdfundingInitiativesStats>('/api/crowdfunding/initiatives/stats').pipe(
      catchError((err) => {
        console.error('[CrowdfundingService] getMyInitiativesStats failed', err);
        return of(EMPTY_CROWDFUNDING_STATS);
      })
    );
  }
}
