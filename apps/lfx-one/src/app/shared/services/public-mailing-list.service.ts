// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PublicMailingListSubscribeRequest, PublicMailingListSubscribeResponse } from '@lfx-one/shared/interfaces';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PublicMailingListService {
  private readonly http = inject(HttpClient);

  public subscribe(mailingListId: string, data: PublicMailingListSubscribeRequest): Observable<PublicMailingListSubscribeResponse> {
    return this.http.post<PublicMailingListSubscribeResponse>(`/public/api/mailing-lists/${mailingListId}/subscribe`, data);
  }
}
