// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import {
  Committee,
  CommitteeActivity,
  CommitteeBudgetSummary,
  CommitteeContributor,
  CommitteeDeliverable,
  CommitteeDiscussionThread,
  CommitteeEngagementMetrics,
  CommitteeEvent,
  CommitteeMember,
  CommitteeOutreachCampaign,
  CommitteeResolution,
  CommitteeVote,
  CreateCommitteeMemberRequest,
  Meeting,
  PaginatedResponse,
  QueryServiceCountResponse,
} from '@lfx-one/shared/interfaces';
import { Committee, CommitteeMember, CreateCommitteeMemberRequest, MyCommittee, QueryServiceCountResponse } from '@lfx-one/shared/interfaces';
import { catchError, map, Observable, of, take, tap, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CommitteeService {
  public committee: WritableSignal<Committee | null> = signal(null);

  private readonly http = inject(HttpClient);

  public getCommittees(params?: HttpParams): Observable<Committee[]> {
    return this.http.get<Committee[]>('/api/committees', { params }).pipe(
      catchError((error) => {
        console.error('Failed to load committees:', error);
        return of([]);
      })
    );
  }

  public getCommitteesByProject(uid: string): Observable<Committee[]> {
    const params = new HttpParams().set('tags', `project_uid:${uid}`);

    return this.getCommittees(params);
  }

  public getCommitteesCountByProject(uid: string): Observable<number> {
    const params = new HttpParams().set('tags', `project_uid:${uid}`);
    return this.http
      .get<QueryServiceCountResponse>('/api/committees/count', { params })
      .pipe(catchError(() => of({ count: 0 })))
      .pipe(map((response) => response.count));
  }

  public getCommittee(id: string): Observable<Committee> {
    return this.http.get<Committee>(`/api/committees/${id}`).pipe(
      catchError((error) => {
        return throwError(() => error);
      }),
      tap((committee) => this.committee.set(committee ?? null))
    );
  }

  public deleteCommittee(id: string): Observable<void> {
    return this.http.delete<void>(`/api/committees/${id}`).pipe(take(1));
  }

  public createCommittee(committee: Partial<Committee>): Observable<Committee> {
    return this.http.post<Committee>('/api/committees', committee).pipe(take(1));
  }

  public updateCommittee(id: string, committee: Partial<Committee>): Observable<Committee> {
    return this.http.put<Committee>(`/api/committees/${id}`, committee).pipe(take(1));
  }

  // Committee Members methods
  public getCommitteeMembers(committeeId: string, params?: HttpParams): Observable<CommitteeMember[]> {
    return this.http.get<CommitteeMember[]>(`/api/committees/${committeeId}/members`, { params });
  }

  public getCommitteeMember(committeeId: string, memberId: string): Observable<CommitteeMember | null> {
    return this.http.get<CommitteeMember>(`/api/committees/${committeeId}/members/${memberId}`);
  }

  public createCommitteeMember(committeeId: string, memberData: CreateCommitteeMemberRequest): Observable<CommitteeMember> {
    return this.http.post<CommitteeMember>(`/api/committees/${committeeId}/members`, memberData).pipe(take(1));
  }

  public updateCommitteeMember(committeeId: string, memberId: string, memberData: Partial<CreateCommitteeMemberRequest>): Observable<CommitteeMember> {
    return this.http.put<CommitteeMember>(`/api/committees/${committeeId}/members/${memberId}`, memberData).pipe(take(1));
  }

  public deleteCommitteeMember(committeeId: string, memberId: string): Observable<void> {
    return this.http.delete<void>(`/api/committees/${committeeId}/members/${memberId}`).pipe(take(1));
  }

  public getCommitteeMeetings(committeeId: string): Observable<Meeting[]> {
    return this.http.get<PaginatedResponse<Meeting>>(`/api/committees/${committeeId}/meetings`).pipe(
      map((response) => response.data),
      take(1)
    );
  }

  // Dashboard sub-resource methods — error handling is done at the component layer
  public getCommitteeVotes(committeeId: string): Observable<CommitteeVote[]> {
    return this.http.get<CommitteeVote[]>(`/api/committees/${committeeId}/votes`);
  }

  public getCommitteeResolutions(committeeId: string): Observable<CommitteeResolution[]> {
    return this.http.get<CommitteeResolution[]>(`/api/committees/${committeeId}/resolutions`);
  }

  public getCommitteeActivity(committeeId: string): Observable<CommitteeActivity[]> {
    return this.http.get<CommitteeActivity[]>(`/api/committees/${committeeId}/activity`);
  }

  public getCommitteeContributors(committeeId: string): Observable<CommitteeContributor[]> {
    return this.http.get<CommitteeContributor[]>(`/api/committees/${committeeId}/contributors`);
  }

  public getCommitteeDeliverables(committeeId: string): Observable<CommitteeDeliverable[]> {
    return this.http.get<CommitteeDeliverable[]>(`/api/committees/${committeeId}/deliverables`);
  }

  public getCommitteeDiscussions(committeeId: string): Observable<CommitteeDiscussionThread[]> {
    return this.http.get<CommitteeDiscussionThread[]>(`/api/committees/${committeeId}/discussions`);
  }

  public getCommitteeEvents(committeeId: string): Observable<CommitteeEvent[]> {
    return this.http.get<CommitteeEvent[]>(`/api/committees/${committeeId}/events`);
  }

  public getCommitteeCampaigns(committeeId: string): Observable<CommitteeOutreachCampaign[]> {
    return this.http.get<CommitteeOutreachCampaign[]>(`/api/committees/${committeeId}/campaigns`);
  }

  public getCommitteeEngagement(committeeId: string): Observable<CommitteeEngagementMetrics | null> {
    return this.http.get<CommitteeEngagementMetrics>(`/api/committees/${committeeId}/engagement`);
  }

  public getCommitteeBudget(committeeId: string): Observable<CommitteeBudgetSummary | null> {
    return this.http.get<CommitteeBudgetSummary>(`/api/committees/${committeeId}/budget`);
  // ── Join / Leave Methods ──────────────────────────────────────────────────

  /** Self-join an open group */
  public joinCommittee(committeeId: string): Observable<CommitteeMember> {
    return this.http.post<CommitteeMember>(`/api/committees/${committeeId}/join`, {}).pipe(take(1));
  }

  /** Leave a group */
  public leaveCommittee(committeeId: string): Observable<void> {
    return this.http.delete<void>(`/api/committees/${committeeId}/leave`).pipe(take(1));
  }

  // ── My Committees ─────────────────────────────────────────────────────────

  /** Get committees for the current user, optionally scoped to a project */
  public getMyCommittees(projectUid?: string): Observable<MyCommittee[]> {
    let params = new HttpParams();
    if (projectUid) {
      params = params.set('project_uid', projectUid);
    }
    return this.http.get<MyCommittee[]>('/api/committees/my-committees', { params }).pipe(
      catchError((error) => {
        console.error('Failed to load my committees:', error);
        return of([]);
      })
    );
  }
}
