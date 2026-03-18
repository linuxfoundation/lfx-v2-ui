// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { COMMITTEE_LABEL, JOIN_MODE_LABELS } from '@lfx-one/shared/constants';
import {
  getGroupBehavioralClass,
  isGovernanceClass,
  isCollaborationClass,
  isGoverningBoard,
  isOversightCommittee,
  isWorkingGroup,
  isSpecialInterestGroup,
  isAmbassadorProgram,
  isOtherClass,
} from '@lfx-one/shared/constants';
import {
  Committee,
  CommitteeActivity,
  CommitteeBudgetSummary,
  CommitteeContributor,
  CommitteeDeliverable,
  CommitteeDiscussionThread,
  CommitteeEngagementMetrics,
  CommitteeEvent,
  CommitteeLeadership,
  CommitteeMember,
  CommitteeOutreachCampaign,
  CommitteeResolution,
  CommitteeVote,
  getCommitteeCategorySeverity,
  GroupBehavioralClass,
  LeadershipRole,
  TagSeverity,
} from '@lfx-one/shared';
import { Meeting, PastMeeting, PastMeetingSummary } from '@lfx-one/shared/interfaces';
import { MeetingCardComponent } from '@app/modules/meetings/components/meeting-card/meeting-card.component';
import { CommitteeMemberVotingStatus } from '@lfx-one/shared/enums';
import { CommitteeService } from '@services/committee.service';
import { MeetingService } from '@services/meeting.service';
import { PersonaService } from '@services/persona.service';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { catchError, combineLatest, finalize, forkJoin, Observable, of, switchMap, take, tap } from 'rxjs';

import { AssignLeadershipDialogComponent } from '../components/assign-leadership-dialog/assign-leadership-dialog.component';
import { CommitteeSettingsComponent } from '../components/committee-settings/committee-settings.component';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    BreadcrumbComponent,
    CardComponent,
    ButtonComponent,
    TagComponent,
    RouterLink,
    ConfirmDialogModule,
    DynamicDialogModule,
    TooltipModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    DatePipe,
    DecimalPipe,
    CommitteeSettingsComponent,
    MeetingCardComponent,
    ReactiveFormsModule,
    NgClass,
  ],
  providers: [ConfirmationService, DialogService],
  templateUrl: './committee-view.component.html',
  styleUrl: './committee-view.component.scss',
})
export class CommitteeViewComponent {
  // -- Injections --
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly meetingService = inject(MeetingService);
  private readonly dialogService = inject(DialogService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);

  // -- Label constants --
  protected readonly committeeLabel = COMMITTEE_LABEL;

  // -- Tab state --
  public activeTab = signal<string>('overview');

  // -- Writable signals --
  public loading = signal<boolean>(true);
  public error = signal<boolean>(false);
  public refresh = signal(0);

  // Sub-resource writable signals
  public membersLoading = signal<boolean>(true);
  public members: WritableSignal<CommitteeMember[]> = signal([]);
  public openVotes: WritableSignal<CommitteeVote[]> = signal([]);
  public budgetSummary: WritableSignal<CommitteeBudgetSummary | null> = signal(null);
  public recentResolutions: WritableSignal<CommitteeResolution[]> = signal([]);
  public recentActivity: WritableSignal<CommitteeActivity[]> = signal([]);
  public topContributors: WritableSignal<CommitteeContributor[]> = signal([]);
  public deliverables: WritableSignal<CommitteeDeliverable[]> = signal([]);
  public discussionThreads: WritableSignal<CommitteeDiscussionThread[]> = signal([]);
  public upcomingEvents: WritableSignal<CommitteeEvent[]> = signal([]);
  public outreachCampaigns: WritableSignal<CommitteeOutreachCampaign[]> = signal([]);
  public engagementMetrics: WritableSignal<CommitteeEngagementMetrics | null> = signal(null);
  public committeeMeetings: WritableSignal<Meeting[]> = signal([]);
  public meetingsLoading = signal<boolean>(false);

  // -- Meeting computed signals --
  // TODO: upcoming/past split uses new Date() at compute-time and won't recompute as time passes.
  // Add a 60s interval tick signal to force recomputation when a meeting crosses the now boundary.
  public meetingViewFilter = signal<'upcoming' | 'past'>('upcoming');
  public upcomingMeetings: Signal<Meeting[]> = this.initializeUpcomingMeetings();
  public pastCommitteeMeetings: Signal<Meeting[]> = this.initializePastMeetings();

  // -- Last meeting summary --
  public lastPastMeeting = signal<PastMeeting | null>(null);
  public lastMeetingSummary = signal<PastMeetingSummary | null>(null);
  public summaryExpanded = signal<boolean>(false);

  // -- Committee (writable so leadership updates apply instantly) --
  public committeeSignal: WritableSignal<Committee | null> = signal(null);
  public committee: Signal<Committee | null> = this.committeeSignal.asReadonly();

  // -- Computed / toSignal --
  public formattedCreatedDate: Signal<string> = this.initializeFormattedCreatedDate();
  public formattedUpdatedDate: Signal<string> = this.initializeFormattedUpdatedDate();

  public categorySeverity: Signal<TagSeverity> = computed(() => {
    const category = this.committee()?.category;
    return getCommitteeCategorySeverity(category || '');
  });

  public breadcrumbItems: Signal<MenuItem[]> = computed(() => [{ label: 'Groups', routerLink: ['/groups'] }, { label: this.committee()?.name || '' }]);

  public isBoardMember: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'board-member');
  public isMaintainer: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'maintainer');
  public canManageConfigurations: Signal<boolean> = computed(() => this.isMaintainer() || (!!this.committee()?.writer && !this.isBoardMember()));

  // -- Behavioral class signals --
  public behavioralClass: Signal<GroupBehavioralClass> = computed(() => getGroupBehavioralClass(this.committee()?.category));
  public isGovernanceClass: Signal<boolean> = computed(() => isGovernanceClass(this.committee()?.category));
  public isCollaborationClass: Signal<boolean> = computed(() => isCollaborationClass(this.committee()?.category));
  public isGoverningBoard: Signal<boolean> = computed(() => isGoverningBoard(this.committee()?.category));
  public isOversightCommittee: Signal<boolean> = computed(() => isOversightCommittee(this.committee()?.category));
  public isWorkingGroup: Signal<boolean> = computed(() => isWorkingGroup(this.committee()?.category));
  public isSpecialInterestGroup: Signal<boolean> = computed(() => isSpecialInterestGroup(this.committee()?.category));
  public isAmbassadorProgram: Signal<boolean> = computed(() => isAmbassadorProgram(this.committee()?.category));
  public isOtherClass: Signal<boolean> = computed(() => isOtherClass(this.committee()?.category));

  // -- Dashboard stat signals --
  public totalMembers: Signal<number> = computed(() => this.members().length);
  public activeVoters: Signal<number> = computed(
    () =>
      this.members().filter(
        (m) => m.voting?.status === CommitteeMemberVotingStatus.VOTING_REP || m.voting?.status === CommitteeMemberVotingStatus.ALTERNATE_VOTING_REP
      ).length
  );
  public uniqueOrganizations: Signal<string[]> = computed(() => {
    const orgs = this.members()
      .map((m) => m.organization?.name)
      .filter((name): name is string => !!name);
    return [...new Set(orgs)];
  });
  public orgCount: Signal<number> = computed(() => this.uniqueOrganizations().length);
  public observerCount: Signal<number> = computed(() => this.members().filter((m) => m.voting?.status === CommitteeMemberVotingStatus.OBSERVER).length);
  public roleBreakdown: Signal<{ name: string; count: number }[]> = computed(() => {
    const roleCounts: Record<string, number> = {};
    this.members().forEach((m) => {
      const role = m.role?.name || 'Member';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    return Object.entries(roleCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  // -- Leadership signals --
  public chair: Signal<Committee['chair']> = computed(() => this.committee()?.chair || null);
  public coChair: Signal<Committee['co_chair']> = computed(() => this.committee()?.co_chair || null);
  public hasChair: Signal<boolean> = computed(() => !!this.chair());
  public hasCoChair: Signal<boolean> = computed(() => !!this.coChair());
  public chairElectedDate: Signal<string> = this.initializeChairElectedDate();
  public coChairElectedDate: Signal<string> = this.initializeCoChairElectedDate();

  // -- Settings form --
  public settingsForm: FormGroup = this.createSettingsForm();
  public settingsSaving = signal<boolean>(false);

  // -- Configuration label signals --
  public joinModeLabel: Signal<string> = computed(() => {
    const mode = this.committee()?.join_mode;
    return mode ? JOIN_MODE_LABELS[mode] : 'Closed';
  });

  public constructor() {
    this.initializeCommittee();
  }

  // -- Public methods --
  public goBack(): void {
    this.router.navigate(['/', 'groups']);
  }

  public refreshCommittee(): void {
    this.loading.set(true);
    this.refresh.update((v) => v + 1);
  }

  public getMembersCountByOrg(org: string): number {
    return this.members().filter((m) => m.organization?.name === org).length;
  }

  public saveSettings(): void {
    const committee = this.committee();
    if (!committee) return;

    this.settingsSaving.set(true);
    const payload = this.settingsForm.value;

    this.committeeService
      .updateCommittee(committee.uid, payload)
      .pipe(
        take(1),
        finalize(() => this.settingsSaving.set(false))
      )
      .subscribe({
        next: (updated) => {
          this.committeeSignal.set(updated);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Settings saved successfully',
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save settings. Please try again.',
          });
        },
      });
  }

  public createMeeting(): void {
    const committee = this.committee();
    if (!committee) return;
    this.router.navigate(['/meetings/create'], {
      queryParams: { committee_uid: committee.uid, committee_name: committee.name, project_uid: committee.project_uid },
    });
  }

  public openAssignLeadership(role: LeadershipRole): void {
    const committee = this.committee();
    if (!committee) return;

    const currentLeader = role === 'chair' ? this.chair() : this.coChair();
    const roleLabel = role === 'chair' ? 'Assign Chair' : 'Assign Co-Chair';

    const dialogRef = this.dialogService.open(AssignLeadershipDialogComponent, {
      header: roleLabel,
      width: '500px',
      modal: true,
      closable: true,
      data: {
        role,
        committee,
        members: this.members(),
        currentLeader: currentLeader ?? null,
      },
    }) as DynamicDialogRef;

    dialogRef.onClose.pipe(take(1)).subscribe((result: { role: LeadershipRole; leadership: CommitteeLeadership | null } | undefined) => {
      if (result) {
        const current = this.committee();
        if (current) {
          const updated = { ...current };
          if (result.role === 'chair') {
            updated.chair = result.leadership;
          } else {
            updated.co_chair = result.leadership;
          }
          this.committeeSignal.set(updated);
        }
      }
    });
  }

  // -- Private initializer functions --
  private initializeCommittee(): void {
    combineLatest([this.route.paramMap, toObservable(this.refresh)])
      .pipe(
        switchMap(([params]) => {
          const committeeId = params?.get('id');
          if (!committeeId) {
            this.error.set(true);
            this.loading.set(false);
            return of(null);
          }

          this.error.set(false);
          this.loading.set(true);
          this.membersLoading.set(true);

          const committeeQuery = this.committeeService.getCommittee(committeeId).pipe(
            catchError(() => {
              this.error.set(true);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load group details',
              });
              return of(null);
            })
          );

          const membersQuery = this.committeeService.getCommitteeMembers(committeeId).pipe(catchError(() => of([])));

          return combineLatest([committeeQuery, membersQuery]).pipe(
            switchMap(([committee, members]) => {
              this.members.set(Array.isArray(members) ? members : []);
              this.membersLoading.set(false);

              this.committeeSignal.set(committee);

              if (committee) {
                this.populateSettingsForm(committee);
                this.loadMeetings(committeeId);
                this.loadPastMeetingSummary(committee.project_uid);
                return this.loadGroupTypeData$(committeeId, committee);
              }

              return of(null);
            }),
            finalize(() => this.loading.set(false))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe();
  }

  private loadMeetings(committeeId: string): void {
    this.meetingsLoading.set(true);
    this.committeeService
      .getCommitteeMeetings(committeeId)
      .pipe(
        take(1),
        catchError(() => of([]))
      )
      .subscribe((meetings) => {
        this.committeeMeetings.set(Array.isArray(meetings) ? meetings : []);
        this.meetingsLoading.set(false);
      });
  }

  private loadPastMeetingSummary(projectUid: string | undefined): void {
    if (!projectUid) return;
    this.meetingService
      .getPastMeetingsByProject(projectUid, 1)
      .pipe(
        take(1),
        catchError(() => of([])),
        switchMap((pastMeetings) => this.loadLastMeetingSummary$(pastMeetings))
      )
      .subscribe();
  }

  private loadGroupTypeData$(committeeId: string, committee: Committee): Observable<unknown> {
    const cls = getGroupBehavioralClass(committee.category);

    if (cls === 'governing-board') {
      return forkJoin([
        this.committeeService.getCommitteeVotes(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeResolutions(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeBudget(committeeId).pipe(catchError(() => of(null))),
      ]).pipe(
        tap(([votes, resolutions, budget]) => {
          this.openVotes.set(votes);
          this.recentResolutions.set(resolutions);
          this.budgetSummary.set(budget);
        })
      );
    }

    if (cls === 'oversight-committee') {
      return forkJoin([
        this.committeeService.getCommitteeVotes(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeResolutions(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeActivity(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeContributors(committeeId).pipe(catchError(() => of([]))),
      ]).pipe(
        tap(([votes, resolutions, activity, contributors]) => {
          this.openVotes.set(votes);
          this.recentResolutions.set(resolutions);
          this.recentActivity.set(activity);
          this.topContributors.set(contributors);
        })
      );
    }

    if (cls === 'working-group') {
      return forkJoin([
        this.committeeService.getCommitteeVotes(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeActivity(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeContributors(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeDeliverables(committeeId).pipe(catchError(() => of([]))),
      ]).pipe(
        tap(([votes, activity, contributors, dels]) => {
          this.openVotes.set(votes);
          this.recentActivity.set(activity);
          this.topContributors.set(contributors);
          this.deliverables.set(dels);
        })
      );
    }

    if (cls === 'special-interest-group') {
      return forkJoin([
        this.committeeService.getCommitteeDiscussions(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeEvents(committeeId).pipe(catchError(() => of([]))),
      ]).pipe(
        tap(([discussions, events]) => {
          this.discussionThreads.set(discussions);
          this.upcomingEvents.set(events);
        })
      );
    }

    if (cls === 'ambassador-program') {
      return forkJoin([
        this.committeeService.getCommitteeCampaigns(committeeId).pipe(catchError(() => of([]))),
        this.committeeService.getCommitteeEngagement(committeeId).pipe(catchError(() => of(null))),
      ]).pipe(
        tap(([campaigns, engagement]) => {
          this.outreachCampaigns.set(campaigns);
          this.engagementMetrics.set(engagement);
        })
      );
    }

    return of(null);
  }

  private initializeFormattedCreatedDate(): Signal<string> {
    return computed(() => {
      const committee = this.committee();
      if (!committee?.created_at) return '-';
      const date = new Date(committee.created_at);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });
  }

  private initializeFormattedUpdatedDate(): Signal<string> {
    return computed(() => {
      const committee = this.committee();
      if (!committee?.updated_at) return '-';
      const date = new Date(committee.updated_at);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });
  }

  private initializeChairElectedDate(): Signal<string> {
    return computed(() => {
      const c = this.chair();
      if (!c?.elected_date) return '';
      return new Date(c.elected_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    });
  }

  private initializeCoChairElectedDate(): Signal<string> {
    return computed(() => {
      const c = this.coChair();
      if (!c?.elected_date) return '';
      return new Date(c.elected_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    });
  }

  private initializeUpcomingMeetings(): Signal<Meeting[]> {
    return computed(() => {
      const committeeId = this.committee()?.uid;
      if (!committeeId) return [];
      const meetings = this.committeeMeetings();
      if (!Array.isArray(meetings)) return [];
      const now = new Date().getTime();
      return meetings
        .filter((m) => m.start_time && new Date(m.start_time).getTime() >= now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });
  }

  private initializePastMeetings(): Signal<Meeting[]> {
    return computed(() => {
      const committeeId = this.committee()?.uid;
      if (!committeeId) return [];
      const meetings = this.committeeMeetings();
      if (!Array.isArray(meetings)) return [];
      const now = new Date().getTime();
      return meetings
        .filter((m) => m.start_time && new Date(m.start_time).getTime() < now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    });
  }

  private loadLastMeetingSummary$(pastMeetings: PastMeeting[]): Observable<PastMeetingSummary | null> {
    const sorted = [...(pastMeetings ?? [])].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    const lastMeeting = sorted[0] ?? null;
    this.lastPastMeeting.set(lastMeeting);
    this.lastMeetingSummary.set(null);

    if (!lastMeeting) {
      return of(null);
    }

    return this.meetingService.getPastMeetingSummary(lastMeeting.id).pipe(
      catchError(() => of(null)),
      tap((summary) => this.lastMeetingSummary.set(summary))
    );
  }

  private createSettingsForm(): FormGroup {
    return new FormGroup({
      business_email_required: new FormControl(false),
      enable_voting: new FormControl(false),
      is_audit_enabled: new FormControl(false),
      public: new FormControl(false),
      sso_group_enabled: new FormControl(false),
      // TODO(LFXV2-1255): Remove joinable once join_mode is fully wired backend-side.
      joinable: new FormControl(false),
      join_mode: new FormControl('closed'),
      member_visibility: new FormControl('hidden'),
      show_meeting_attendees: new FormControl(false),
    });
  }

  private populateSettingsForm(committee: Committee): void {
    this.settingsForm.patchValue({
      business_email_required: committee.business_email_required || false,
      enable_voting: committee.enable_voting || false,
      is_audit_enabled: committee.is_audit_enabled || false,
      public: committee.public || false,
      sso_group_enabled: committee.sso_group_enabled || false,
      joinable: committee.join_mode === 'open' || committee.join_mode === 'application',
      join_mode: committee.join_mode || 'closed',
      member_visibility: committee.member_visibility || 'hidden',
      show_meeting_attendees: committee.show_meeting_attendees || false,
    });
  }
}
