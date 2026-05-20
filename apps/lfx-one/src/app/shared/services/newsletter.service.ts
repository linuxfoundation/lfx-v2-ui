// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  NewsletterRecipientCount,
  NewsletterRecipientCountPayload,
  NewsletterSendPayload,
  NewsletterSendResult,
  NewsletterTestSendPayload,
} from '@lfx-one/shared/interfaces';
import { Observable, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NewsletterService {
  private readonly http = inject(HttpClient);

  public getRecipientCount(payload: NewsletterRecipientCountPayload): Observable<NewsletterRecipientCount> {
    return this.http.post<NewsletterRecipientCount>('/api/newsletters/recipient-count', payload).pipe(take(1));
  }

  public testSend(payload: NewsletterTestSendPayload): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>('/api/newsletters/test-send', payload).pipe(take(1));
  }

  public send(payload: NewsletterSendPayload): Observable<NewsletterSendResult> {
    return this.http.post<NewsletterSendResult>('/api/newsletters/send', payload).pipe(take(1));
  }
}
