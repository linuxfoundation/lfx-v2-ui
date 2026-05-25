// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { InitiativesResponse } from '@lfx-one/shared/interfaces';
import { catchError, Observable, of } from 'rxjs';

const EMPTY_RESPONSE: InitiativesResponse = { data: [], total: 0, pageSize: 0, offset: 0 };

@Injectable({
  providedIn: 'root',
})
export class CrowdfundingService {
  private readonly http = inject(HttpClient);

  public getMyInitiatives(): Observable<InitiativesResponse> {
    return this.http.get<InitiativesResponse>('/api/crowdfunding/initiatives').pipe(catchError(() => of(EMPTY_RESPONSE)));
  }
}
