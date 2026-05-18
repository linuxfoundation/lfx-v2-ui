// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { IndividualEnrollment } from '@lfx-one/shared/interfaces';
import { catchError, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EnrollmentService {
  private readonly http = inject(HttpClient);

  public getEnrollments(): Observable<IndividualEnrollment[]> {
    return this.http.get<IndividualEnrollment[]>('/api/enrollments').pipe(catchError(() => of([])));
  }
}
