// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { MailingListMember, UserSubscriptionsResponse } from '@lfx-one/shared/interfaces';
import { Observable } from 'rxjs';

/**
 * Service for managing the current user's mailing list subscriptions.
 */
@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/subscriptions';

  /**
   * Fetches all mailing lists with subscription status for the given email.
   */
  public getUserSubscriptions(email: string): Observable<UserSubscriptionsResponse> {
    const params = new HttpParams().set('email', email);
    return this.http.get<UserSubscriptionsResponse>(this.baseUrl, { params });
  }

  /**
   * Subscribes the given email to a mailing list.
   */
  public subscribe(mailingListId: string, email: string): Observable<MailingListMember> {
    return this.http.post<MailingListMember>(`${this.baseUrl}/${mailingListId}/subscribe`, { email });
  }

  /**
   * Unsubscribes a member (by member UID) from a mailing list.
   */
  public unsubscribe(mailingListId: string, memberId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${mailingListId}/members/${memberId}`);
  }
}
