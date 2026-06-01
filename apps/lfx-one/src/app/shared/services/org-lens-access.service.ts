// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { OrgAccessInviteRequest, OrgAccessListResponse, OrgAccessRole, OrgAccessRoleChangeRequest } from '@lfx-one/shared/interfaces';
import { Observable } from 'rxjs';

/** Angular client for the three Org Lens Access SSR endpoints; thin HttpClient wrapper, both mutations return the authoritative refreshed list (spec 025, FR-015a). */
@Injectable({
  providedIn: 'root',
})
export class OrgLensAccessService {
  private readonly http = inject(HttpClient);

  public getAccessUsers(orgUid: string): Observable<OrgAccessListResponse> {
    return this.http.get<OrgAccessListResponse>(`/api/orgs/${encodeURIComponent(orgUid)}/lens/access/users`);
  }

  public inviteUser(orgUid: string, email: string, role: OrgAccessRole, name?: string | null): Observable<OrgAccessListResponse> {
    const body: OrgAccessInviteRequest = { email, role, name: name ?? null };
    return this.http.post<OrgAccessListResponse>(`/api/orgs/${encodeURIComponent(orgUid)}/lens/access/users`, body);
  }

  public changeRole(orgUid: string, email: string, role: OrgAccessRole): Observable<OrgAccessListResponse> {
    const body: OrgAccessRoleChangeRequest = { role };
    return this.http.put<OrgAccessListResponse>(`/api/orgs/${encodeURIComponent(orgUid)}/lens/access/users/${encodeURIComponent(email)}`, body);
  }

  public removeUser(orgUid: string, email: string): Observable<OrgAccessListResponse> {
    return this.http.delete<OrgAccessListResponse>(`/api/orgs/${encodeURIComponent(orgUid)}/lens/access/users/${encodeURIComponent(email)}`);
  }
}
