// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of } from 'rxjs';

import { EMPTY_ORG_ALL_EMPLOYEE_DETAIL, EMPTY_ORG_ALL_EMPLOYEES_RESPONSE } from '@lfx-one/shared/constants';
import type { OrgAllEmployeeDetail, OrgAllEmployeesResponse } from '@lfx-one/shared/interfaces';

/** HTTP client for the Org Lens "All Employees" BFF endpoints. */
@Injectable({ providedIn: 'root' })
export class AllEmployeesService {
  private readonly http = inject(HttpClient);

  public getAllEmployees(accountId: string): Observable<OrgAllEmployeesResponse> {
    return this.http
      .get<OrgAllEmployeesResponse>(`/api/orgs/${encodeURIComponent(accountId)}/lens/people/all`)
      .pipe(catchError(() => of<OrgAllEmployeesResponse>({ ...EMPTY_ORG_ALL_EMPLOYEES_RESPONSE, accountId })));
  }

  public getEmployeeDetail(accountId: string, personKey: string): Observable<OrgAllEmployeeDetail> {
    return this.http
      .get<OrgAllEmployeeDetail>(`/api/orgs/${encodeURIComponent(accountId)}/lens/people/${encodeURIComponent(personKey)}/detail`)
      .pipe(catchError(() => of<OrgAllEmployeeDetail>({ ...EMPTY_ORG_ALL_EMPLOYEE_DETAIL, personKey })));
  }
}
