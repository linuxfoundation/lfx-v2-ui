// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { UserSearchParams, UserSearchResponse, UserSearchResult } from '@lfx-one/shared/interfaces';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly http = inject(HttpClient);

  /**
   * Search for users (meeting registrants or committee members)
   */
  public searchUsers(name: string, type: 'committee_member' | 'meeting_registrant'): Observable<UserSearchResult[]> {
    if (!name || !type) {
      return of([]);
    }

    const params = new HttpParams().set('name', name).set('type', type).set('limit', '20');

    return this.http.get<UserSearchResponse>('/api/search/users', { params }).pipe(
      map((response) => response.results || []),
      catchError((error) => {
        console.error('Error searching users:', error);
        return of([]);
      })
    );
  }

  /**
   * Search for users with custom parameters
   */
  public searchUsersAdvanced(params: UserSearchParams): Observable<UserSearchResponse> {
    const httpParams = new HttpParams()
      .set('name', params.name)
      .set('type', params.type)
      .set('limit', (params.limit || 20).toString())
      .set('offset', (params.offset || 0).toString());

    return this.http.get<UserSearchResponse>('/api/search/users', { params: httpParams }).pipe(
      catchError((error) => {
        console.error('Error searching users:', error);
        return of({ results: [], total: 0, has_more: false });
      })
    );
  }
}
