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
  CommitteeDocument,
  CommitteeEngagementMetrics,
  CommitteeEvent,
  CommitteeMember,
  CommitteeOutreachCampaign,
  CommitteeResolution,
  CommitteeVote,
  CreateCommitteeMemberRequest,
  CreateGroupInviteRequest,
  GroupInvite,
  MyCommittee,
  QueryServiceCountResponse,
  Survey,
} from '@lfx-one/shared/interfaces';
import { CommitteeJoinApplication, CreateCommitteeJoinApplicationRequest } from '@lfx-one/shared/interfaces';
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
      .pipe(
        catchError((error) => {
          console.error('Failed to load committees count:', error);
          return of({ count: 0 });
        })
      )
      .pipe(map((response) => response.count));
  }

  public getRecentCommitteesByProject(uid: string): Observable<Committee[]> {
    return this.getCommitteesByProject(uid);
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

  // ── Invite & Join Methods ──────────────────────────────────────────────────

  /** Send invite(s) to one or more email addresses */
  public createInvites(committeeId: string, payload: CreateGroupInviteRequest): Observable<GroupInvite[]> {
    return this.http.post<GroupInvite[]>(`/api/committees/${committeeId}/invites`, payload).pipe(take(1));
  }

  /** Self-join an open group */
  public joinCommittee(committeeId: string): Observable<CommitteeMember> {
    return this.http.post<CommitteeMember>(`/api/committees/${committeeId}/join`, {}).pipe(take(1));
  }

  /** Leave a group */
  public leaveCommittee(committeeId: string): Observable<void> {
    return this.http.post<void>(`/api/committees/${committeeId}/leave`, {}).pipe(take(1));
  }

  /** Apply to join a group (join_mode = 'apply') */
  public applyToJoin(committeeId: string, payload: CreateCommitteeJoinApplicationRequest): Observable<CommitteeJoinApplication> {
    return this.http.post<CommitteeJoinApplication>(`/api/committees/${committeeId}/applications`, payload).pipe(take(1));
  }

  /** List pending applications (admin view) */
  public getApplications(committeeId: string): Observable<CommitteeJoinApplication[]> {
    return this.http.get<CommitteeJoinApplication[]>(`/api/committees/${committeeId}/applications`).pipe(
      catchError((error) => {
        console.error('Failed to load applications:', error);
        return of([]);
      })
    );
  }

  /** Approve a join application */
  public approveApplication(committeeId: string, applicationId: string): Observable<CommitteeJoinApplication> {
    return this.http.post<CommitteeJoinApplication>(`/api/committees/${committeeId}/applications/${applicationId}/approve`, {}).pipe(take(1));
  }

  /** Reject a join application */
  public rejectApplication(committeeId: string, applicationId: string): Observable<CommitteeJoinApplication> {
    return this.http.post<CommitteeJoinApplication>(`/api/committees/${committeeId}/applications/${applicationId}/reject`, {}).pipe(take(1));
  }

  // ── Public / My Committees ────────────────────────────────────────────────

  /** Get committees for the current user */
  public getMyCommittees(): Observable<MyCommittee[]> {
    return this.http.get<MyCommittee[]>('/api/committees/my').pipe(catchError(() => of([])));
  }

  /** Get public committees for a specific project */
  public getPublicCommitteesByProject(projectUid: string): Observable<Committee[]> {
    const params = new HttpParams().set('tags', `project_uid:${projectUid}`).set('public', 'true');
    return this.getCommittees(params);
  }

  /** Get all public committees */
  public getPublicCommittees(): Observable<Committee[]> {
    const params = new HttpParams().set('public', 'true');
    return this.getCommittees(params);
  }

  // ── Invite Methods ──────────────────────────────────────────────────────────

  /** Get invites for a committee */
  public getInvites(committeeId: string): Observable<GroupInvite[]> {
    return this.http.get<GroupInvite[]>(`/api/committees/${committeeId}/invites`).pipe(catchError(() => of([])));
  }

  /** Accept an invite */
  public acceptInvite(committeeId: string, inviteId: string): Observable<GroupInvite> {
    return this.http.post<GroupInvite>(`/api/committees/${committeeId}/invites/${inviteId}/accept`, {}).pipe(take(1));
  }

  /** Decline an invite */
  public declineInvite(committeeId: string, inviteId: string): Observable<GroupInvite> {
    return this.http.post<GroupInvite>(`/api/committees/${committeeId}/invites/${inviteId}/decline`, {}).pipe(take(1));
  }

  /** Revoke an invite */
  public revokeInvite(committeeId: string, inviteId: string): Observable<void> {
    return this.http.delete<void>(`/api/committees/${committeeId}/invites/${inviteId}`).pipe(take(1));
  }

  // ── Dashboard Sub-Resource Methods ─────────────────────────────────────────

  /** Get votes for a committee */
  public getCommitteeVotes(committeeId: string): Observable<CommitteeVote[]> {
    return this.http.get<CommitteeVote[]>(`/api/committees/${committeeId}/votes`).pipe(catchError(() => of([])));
  }

  /** Get resolutions for a committee */
  public getCommitteeResolutions(committeeId: string): Observable<CommitteeResolution[]> {
    return this.http.get<CommitteeResolution[]>(`/api/committees/${committeeId}/resolutions`).pipe(catchError(() => of([])));
  }

  /** Get activity for a committee */
  public getCommitteeActivity(committeeId: string): Observable<CommitteeActivity[]> {
    return this.http.get<CommitteeActivity[]>(`/api/committees/${committeeId}/activity`).pipe(catchError(() => of([])));
  }

  /** Get contributors for a committee */
  public getCommitteeContributors(committeeId: string): Observable<CommitteeContributor[]> {
    return this.http.get<CommitteeContributor[]>(`/api/committees/${committeeId}/contributors`).pipe(catchError(() => of([])));
  }

  /** Get deliverables for a committee */
  public getCommitteeDeliverables(committeeId: string): Observable<CommitteeDeliverable[]> {
    return this.http.get<CommitteeDeliverable[]>(`/api/committees/${committeeId}/deliverables`).pipe(catchError(() => of([])));
  }

  /** Get discussions for a committee */
  public getCommitteeDiscussions(committeeId: string): Observable<CommitteeDiscussionThread[]> {
    return this.http.get<CommitteeDiscussionThread[]>(`/api/committees/${committeeId}/discussions`).pipe(catchError(() => of([])));
  }

  /** Get events for a committee */
  public getCommitteeEvents(committeeId: string): Observable<CommitteeEvent[]> {
    return this.http.get<CommitteeEvent[]>(`/api/committees/${committeeId}/events`).pipe(catchError(() => of([])));
  }

  /** Get campaigns for a committee */
  public getCommitteeCampaigns(committeeId: string): Observable<CommitteeOutreachCampaign[]> {
    return this.http.get<CommitteeOutreachCampaign[]>(`/api/committees/${committeeId}/campaigns`).pipe(catchError(() => of([])));
  }

  /** Get engagement metrics for a committee */
  public getCommitteeEngagement(committeeId: string): Observable<CommitteeEngagementMetrics> {
    return this.http.get<CommitteeEngagementMetrics>(`/api/committees/${committeeId}/engagement`).pipe(catchError(() => of({} as CommitteeEngagementMetrics)));
  }

  /** Get budget summary for a committee */
  public getCommitteeBudget(committeeId: string): Observable<CommitteeBudgetSummary | null> {
    return this.http.get<CommitteeBudgetSummary>(`/api/committees/${committeeId}/budget`).pipe(catchError(() => of(null)));
  }

  /** Get documents for a committee */
  public getCommitteeDocuments(committeeId: string): Observable<CommitteeDocument[]> {
    return this.http.get<CommitteeDocument[]>(`/api/committees/${committeeId}/documents`).pipe(catchError(() => of([])));
  }

  /** Get surveys for a committee */
  public getCommitteeSurveys(committeeId: string): Observable<Survey[]> {
    return this.http.get<Survey[]>(`/api/committees/${committeeId}/surveys`).pipe(catchError(() => of([])));
  }
}
