// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, effect, inject, signal, Signal, untracked, ViewChild, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
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
  getCommitteeCategorySeverity,
  LeadershipRole,
  TagSeverity,
} from '@lfx-one/shared';
import {
  getGroupBehavioralClass,
  GroupBehavioralClass,
  isGovernanceClass,
  isCollaborationClass,
  isGoverningBoard,
  isOversightCommittee,
  isWorkingGroup,
  isSpecialInterestGroup,
  isAmbassadorProgram,
  isOtherClass,
} from '@lfx-one/shared/constants';
import { CommitteeMemberVotingStatus } from '@lfx-one/shared/enums';
import { CommitteeLeadership, GroupsIOMailingList, Meeting, MyCommittee, Survey } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MailingListService } from '@services/mailing-list.service';
import { MeetingService } from '@services/meeting.service';
import { PersonaService } from '@services/persona.service';
import { ProjectService } from '@services/project.service';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { BehaviorSubject, catchError, combineLatest, finalize, forkJoin, map, of, switchMap, take, tap } from 'rxjs';

import { FileSizePipe } from '@pipes/file-size.pipe';
import { FileTypeIconPipe } from '@pipes/file-type-icon.pipe';
import { ApplicationReviewComponent } from '../components/application-review/application-review.component';
import { AssignLeadershipDialogComponent } from '../components/assign-leadership-dialog/assign-leadership-dialog.component';
import { CommitteeMembersComponent } from '../components/committee-members/committee-members.component';
import { JoinApplicationDialogComponent } from '../components/join-application-dialog/join-application-dialog.component';
import { DashboardMeetingCardComponent } from '@app/modules/dashboards/components/dashboard-meeting-card/dashboard-meeting-card.component';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    BreadcrumbComponent,
    CardComponent,
    ButtonComponent,
    TagComponent,
    ApplicationReviewComponent,
    CommitteeMembersComponent,
    DashboardMeetingCardComponent,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    NgClass,
    FormsModule,
    ConfirmDialogModule,
    DynamicDialogModule,
    TooltipModule,
    DatePipe,
    DecimalPipe,
    FileSizePipe,
    FileTypeIconPipe,
    RouterLink,
  ],
  providers: [ConfirmationService, DialogService],
  templateUrl: './committee-view.component.html',
  styleUrl: './committee-view.component.scss',
})
export class CommitteeViewComponent {
  @ViewChild(CommitteeMembersComponent)
  private committeeMembersComponent?: CommitteeMembersComponent;

  // ── Injections ────────────────────────────────────────────────────────────
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dialogService = inject(DialogService);
  private readonly mailingListService = inject(MailingListService);
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);
  private readonly projectService = inject(ProjectService);

  // ── Tab State ───────────────────────────────────────────────────────────
  public activeTab = signal<string>('overview');

  // ── Writable Signals ──────────────────────────────────────────────────────
  public members: WritableSignal<CommitteeMember[]>;
  public membersLoading: WritableSignal<boolean>;
  public loading: WritableSignal<boolean>;
  public error: WritableSignal<boolean>;
  public errorMessage: WritableSignal<string>;
  public refresh: BehaviorSubject<void>;

  // Governance-specific mock data
  public openVotes: WritableSignal<CommitteeVote[]>;
  public budgetSummary: WritableSignal<CommitteeBudgetSummary | null>;
  public recentResolutions: WritableSignal<CommitteeResolution[]>;

  // Collaboration-specific mock data
  public recentActivity: WritableSignal<CommitteeActivity[]>;
  public topContributors: WritableSignal<CommitteeContributor[]>;

  // Working-group specific: deliverables/milestones
  public deliverables: WritableSignal<CommitteeDeliverable[]>;

  // Special-interest-group specific: discussions, events
  public discussionThreads: WritableSignal<CommitteeDiscussionThread[]>;
  public upcomingEvents: WritableSignal<CommitteeEvent[]>;

  // Ambassador-program specific: campaigns, engagement
  public outreachCampaigns: WritableSignal<CommitteeOutreachCampaign[]>;
  public engagementMetrics: WritableSignal<CommitteeEngagementMetrics | null>;

  // Meeting, document, and survey writables
  public committeeMeetings: WritableSignal<Meeting[]>;
  public documents: WritableSignal<CommitteeDocument[]>;
  public committeeSurveys: WritableSignal<Survey[]>;

  // Delete state
  public isDeleting = signal<boolean>(false);

  // Collaboration inline-edit state
  public editingCollaboration = signal<boolean>(false);
  public collabSaving = signal<boolean>(false);
  public collabEdit = signal<{
    mailingListName: string;
    mailingListUrl: string;
    chatChannelName: string;
    chatChannelUrl: string;
    chatChannelPlatform: 'slack' | 'discord';
  }>({
    mailingListName: '',
    mailingListUrl: '',
    chatChannelName: '',
    chatChannelUrl: '',
    chatChannelPlatform: 'slack',
  });

  // ── Committee (writable so leadership updates apply instantly) ────────────
  public committee: WritableSignal<Committee | null>;
  public formattedCreatedDate: Signal<string>;
  public formattedUpdatedDate: Signal<string>;
  public categorySeverity: Signal<TagSeverity>;
  public breadcrumbItems: Signal<MenuItem[]>;
  public isBoardMember: Signal<boolean>;
  public isMaintainer: Signal<boolean>;
  public canManageConfigurations: Signal<boolean>;
  public committeeLabel = COMMITTEE_LABEL;

  // Group-type behavioral class signals (6-type taxonomy v2.0)
  public behavioralClass: Signal<GroupBehavioralClass>;
  public isGovernanceClass: Signal<boolean>;
  public isCollaborationClass: Signal<boolean>;
  // Per-type signals for granular dashboard rendering
  public isGoverningBoard: Signal<boolean>;
  public isOversightCommittee: Signal<boolean>;
  public isWorkingGroup: Signal<boolean>;
  public isSpecialInterestGroup: Signal<boolean>;
  public isAmbassadorProgram: Signal<boolean>;
  public isOtherClass: Signal<boolean>;

  // Dashboard stat signals
  public totalMembers: Signal<number>;
  public activeVoters: Signal<number>;
  public uniqueOrganizations: Signal<string[]>;
  public orgCount: Signal<number>;
  public roleBreakdown: Signal<{ name: string; count: number }[]>;

  // Chair/Co-Chair leadership signals
  public chair: Signal<Committee['chair']>;
  public coChair: Signal<Committee['co_chair']>;
  public hasChair: Signal<boolean>;
  public hasCoChair: Signal<boolean>;
  public chairElectedDate: Signal<string>;
  public coChairElectedDate: Signal<string>;

  // Meeting computed signals
  public upcomingMeetings: Signal<Meeting[]>;

  // Configuration label signals
  public joinModeLabel: Signal<string>;
  public memberVisibilityLabel: Signal<string>;

  // Join/Leave membership state signals
  public myCommittees: Signal<MyCommittee[]>;
  public myCommitteeUids: Signal<Set<string>>;
  public isCurrentMember: Signal<boolean>;
  public canJoin: Signal<boolean>;
  public canApply: Signal<boolean>;
  public canLeave: Signal<boolean>;
  public isClosed: Signal<boolean>;

  // Tab visibility signals
  public isMembersTabVisible: Signal<boolean>;
  public isVotesTabVisible: Signal<boolean>;

  // Linked mailing lists
  public linkedMailingLists: WritableSignal<GroupsIOMailingList[]>;
  public loadingMailingLists: WritableSignal<boolean>;

  // Document computed signals
  public documentFiles: Signal<CommitteeDocument[]>;
  public documentLinks: Signal<CommitteeDocument[]>;

  public constructor() {
    // ── 1. Initialize ALL writable signals FIRST ──────────────────────
    // This must happen before initializeCommittee() because the mock data
    // interceptor returns synchronous responses (via `of()`), which causes
    // the switchMap callback to fire immediately during toSignal() construction.
    // If signals like committeeMeetings or documents aren't initialized yet,
    // calling .set() on them throws: TypeError: Cannot read properties of undefined (reading 'set')
    this.error = signal<boolean>(false);
    this.errorMessage = signal<string>('');
    this.refresh = new BehaviorSubject<void>(undefined);
    this.members = signal<CommitteeMember[]>([]);
    this.membersLoading = signal<boolean>(true);
    this.loading = signal<boolean>(true);

    // Governance-specific data
    this.openVotes = signal<CommitteeVote[]>([]);
    this.budgetSummary = signal<CommitteeBudgetSummary | null>(null);
    this.recentResolutions = signal<CommitteeResolution[]>([]);

    // Collaboration-specific data
    this.recentActivity = signal<CommitteeActivity[]>([]);
    this.topContributors = signal<CommitteeContributor[]>([]);

    // Working-group specific
    this.deliverables = signal<CommitteeDeliverable[]>([]);

    // Special-interest-group specific
    this.discussionThreads = signal<CommitteeDiscussionThread[]>([]);
    this.upcomingEvents = signal<CommitteeEvent[]>([]);

    // Ambassador-program specific
    this.outreachCampaigns = signal<CommitteeOutreachCampaign[]>([]);
    this.engagementMetrics = signal<CommitteeEngagementMetrics | null>(null);

    // Document signals
    this.documents = signal<CommitteeDocument[]>([]);

    // Meeting signals
    this.committeeMeetings = signal<Meeting[]>([]);

    // Survey signals
    this.committeeSurveys = signal<Survey[]>([]);

    // Linked mailing lists
    this.linkedMailingLists = signal<GroupsIOMailingList[]>([]);
    this.loadingMailingLists = signal<boolean>(false);

    // ── 2. Now safe to call initializeCommittee() which subscribes and sets this.committee ──
    this.committee = signal<Committee | null>(null);
    this.initializeCommittee();

    // ── 3. Computed signals (depend on committee/members signals above) ──
    this.formattedCreatedDate = this.initializeFormattedCreatedDate();
    this.formattedUpdatedDate = this.initializeFormattedUpdatedDate();
    this.categorySeverity = computed(() => {
      const category = this.committee()?.category;
      return getCommitteeCategorySeverity(category || '');
    });
    this.breadcrumbItems = computed(() => [{ label: 'Groups', routerLink: ['/groups'] }, { label: this.committee()?.name || '' }]);
    this.isBoardMember = computed(() => this.personaService.currentPersona() === 'board-member');
    this.isMaintainer = computed(() => this.personaService.currentPersona() === 'maintainer');
    // Configurations visible only to admins: maintainer persona OR writer access (not board-member view-only)
    this.canManageConfigurations = computed(() => this.isMaintainer() || (!!this.committee()?.writer && !this.isBoardMember()));

    // Group-type behavioral classification (6-type taxonomy v2.0)
    this.behavioralClass = computed(() => getGroupBehavioralClass(this.committee()?.category));
    this.isGovernanceClass = computed(() => isGovernanceClass(this.committee()?.category));
    this.isCollaborationClass = computed(() => isCollaborationClass(this.committee()?.category));
    // Per-type signals for granular dashboard rendering
    this.isGoverningBoard = computed(() => isGoverningBoard(this.committee()?.category));
    this.isOversightCommittee = computed(() => isOversightCommittee(this.committee()?.category));
    this.isWorkingGroup = computed(() => isWorkingGroup(this.committee()?.category));
    this.isSpecialInterestGroup = computed(() => isSpecialInterestGroup(this.committee()?.category));
    this.isAmbassadorProgram = computed(() => isAmbassadorProgram(this.committee()?.category));
    this.isOtherClass = computed(() => isOtherClass(this.committee()?.category));

    // Dashboard stats
    this.totalMembers = computed(() => this.members().length);
    this.activeVoters = computed(
      () =>
        this.members().filter(
          (m) => m.voting?.status === CommitteeMemberVotingStatus.VOTING_REP || m.voting?.status === CommitteeMemberVotingStatus.ALTERNATE_VOTING_REP
        ).length
    );
    this.uniqueOrganizations = computed(() => {
      const orgs = this.members()
        .map((m) => m.organization?.name)
        .filter((name): name is string => !!name);
      return [...new Set(orgs)];
    });
    this.orgCount = computed(() => this.uniqueOrganizations().length);
    this.roleBreakdown = computed(() => {
      const roleCounts: Record<string, number> = {};
      this.members().forEach((m) => {
        const role = m.role?.name || 'Member';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });
      return Object.entries(roleCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    });

    // Chair/Co-Chair leadership
    this.chair = computed(() => this.committee()?.chair || null);
    this.coChair = computed(() => this.committee()?.co_chair || null);
    this.hasChair = computed(() => !!this.chair());
    this.hasCoChair = computed(() => !!this.coChair());
    this.chairElectedDate = computed(() => {
      const c = this.chair();
      if (!c?.elected_date) return '';
      return new Date(c.elected_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    });
    this.coChairElectedDate = computed(() => {
      const c = this.coChair();
      if (!c?.elected_date) return '';
      return new Date(c.elected_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    });

    // Configuration label signals
    this.joinModeLabel = computed(() => {
      switch (this.committee()?.join_mode) {
        case 'open':
          return 'Open';
        case 'invite-only':
          return 'Invite Only';
        case 'apply':
          return 'Apply to Join';
        case 'closed':
          return 'Closed';
        default:
          return 'Closed';
      }
    });
    this.memberVisibilityLabel = computed(() => {
      switch (this.committee()?.member_visibility) {
        case 'basic_profile':
          return 'Basic Profile';
        case 'hidden':
          return 'Hidden';
        default:
          return 'Hidden';
      }
    });

    // Join/Leave membership state
    this.myCommittees = this.initializeMyCommittees();
    this.myCommitteeUids = computed(() => new Set(this.myCommittees().map((c) => c.uid)));
    this.isCurrentMember = computed(() => {
      const uid = this.committee()?.uid;
      return !!uid && this.myCommitteeUids().has(uid);
    });
    this.canJoin = computed(() => this.committee()?.join_mode === 'open' && !this.isCurrentMember());
    this.canApply = computed(() => this.committee()?.join_mode === 'apply' && !this.isCurrentMember());
    this.canLeave = computed(() => this.isCurrentMember());
    this.isClosed = computed(() => {
      const joinMode = this.committee()?.join_mode || 'closed';
      return (joinMode === 'closed' || joinMode === 'invite-only') && !this.isCurrentMember() && !this.canManageConfigurations();
    });

    // Tab visibility signals
    this.isMembersTabVisible = computed(() => this.committee()?.member_visibility !== 'hidden' || this.isCurrentMember() || this.canManageConfigurations());
    this.isVotesTabVisible = computed(() => !!this.committee()?.enable_voting);

    // Redirect active tab to overview when hidden tabs are active
    effect(
      () => {
        const membersVisible = this.isMembersTabVisible();
        const votesVisible = this.isVotesTabVisible();
        const currentTab = this.activeTab();

        untracked(() => {
          if (!membersVisible && currentTab === 'members') {
            this.activeTab.set('overview');
          }
          if (!votesVisible && currentTab === 'votes') {
            this.activeTab.set('overview');
          }
        });
      },
      { allowSignalWrites: true }
    );

    // Document computed signals
    this.documentFiles = computed(() => this.documents().filter((d) => d.type === 'file'));
    this.documentLinks = computed(() => this.documents().filter((d) => d.type === 'link'));

    // Meeting computed signals — show upcoming meetings and those from the past 7 days
    // (7-day look-back handles recently-ended recurring meetings that are still relevant)
    this.upcomingMeetings = computed(() => {
      const committeeId = this.committee()?.uid;
      if (!committeeId) return [];
      const meetings = this.committeeMeetings();
      if (!Array.isArray(meetings)) return [];
      const now = new Date().getTime();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      return meetings
        .filter((m) => m.start_time && new Date(m.start_time).getTime() > sevenDaysAgo && m.committees?.some((c) => c.uid === committeeId))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 3);
    });
  }

  public openAddMemberDialog(): void {
    this.committeeMembersComponent?.openAddMemberDialog();
  }

  public getMembersCountByOrg(org: string): number {
    return this.members().filter((m: CommitteeMember) => m.organization?.name === org).length;
  }

  public getMeetingTypeSeverity(type: string | null): TagSeverity {
    switch (type) {
      case 'Board':
        return 'info';
      case 'Technical':
        return 'success';
      case 'Maintainers':
        return 'warn';
      default:
        return 'secondary';
    }
  }

  public goBack(): void {
    this.router.navigate(['/', 'groups']);
  }

  public refreshMembers(): void {
    this.refresh.next();
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
        // Immediately merge leadership data into the committee signal so UI updates instantly.
        // Do NOT call refresh.next() — it triggers a full re-fetch with loading skeleton,
        // which overwrites the optimistic update if the upstream GET doesn't return chair/co_chair.
        const current = this.committee();
        if (current) {
          const updated = { ...current };
          if (result.role === 'chair') {
            updated.chair = result.leadership;
          } else {
            updated.co_chair = result.leadership;
          }
          this.committee.set(updated);
        }
      }
    });
  }

  public createVote(): void {
    const committee = this.committee();
    if (!committee) return;
    this.router.navigate(['/votes/create'], {
      queryParams: { committee_uid: committee.uid, committee_name: committee.name, project_uid: committee.project_uid },
    });
  }

  public createMeeting(): void {
    const committee = this.committee();
    if (!committee) return;
    this.router.navigate(['/meetings/create'], {
      queryParams: { committee_uid: committee.uid, committee_name: committee.name, project_uid: committee.project_uid },
    });
  }

  public createSurvey(): void {
    const committee = this.committee();
    if (!committee) return;
    this.router.navigate(['/surveys/create'], {
      queryParams: { committee_uid: committee.uid, committee_name: committee.name, project_uid: committee.project_uid },
    });
  }

  public joinGroup(): void {
    const committee = this.committee();
    if (!committee) return;

    this.committeeService.joinCommittee(committee.uid).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Joined', detail: `You have joined "${committee.name}"` });
        this.refresh.next();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to join "${committee.name}"` });
      },
    });
  }

  public applyToJoin(): void {
    const committee = this.committee();
    if (!committee) return;

    const dialogRef = this.dialogService.open(JoinApplicationDialogComponent, {
      header: 'Request to Join',
      width: '500px',
      modal: true,
      closable: true,
      duplicate: true,
      data: { committee },
    });

    dialogRef?.onClose.pipe(take(1)).subscribe((submitted: boolean | undefined) => {
      if (submitted) {
        this.refresh.next();
      }
    });
  }

  public leaveGroup(): void {
    const committee = this.committee();
    if (!committee) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to leave "${committee.name}"?`,
      header: 'Leave Group',
      acceptLabel: 'Leave',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => {
        this.committeeService.leaveCommittee(committee.uid).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Left Group', detail: `You have left "${committee.name}"` });
            this.refresh.next();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: `Failed to leave "${committee.name}"` });
          },
        });
      },
    });
  }

  public deleteGroup(): void {
    const committee = this.committee();
    if (!committee) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete the ${this.committeeLabel.singular.toLowerCase()} "${committee.name}"? This action cannot be undone.`,
      header: `Delete ${this.committeeLabel.singular}`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => {
        this.isDeleting.set(true);
        this.committeeService.deleteCommittee(committee.uid).subscribe({
          next: () => {
            this.isDeleting.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: `${this.committeeLabel.singular} "${committee.name}" deleted successfully`,
            });
            this.router.navigate(['/groups']);
          },
          error: () => {
            this.isDeleting.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to delete ${this.committeeLabel.singular.toLowerCase()}`,
            });
          },
        });
      },
    });
  }

  // ── Collaboration inline-edit methods ──────────────────────────────
  public startEditCollaboration(): void {
    const c = this.committee();
    this.collabEdit.set({
      mailingListName: c?.mailing_list?.name || '',
      mailingListUrl: c?.mailing_list?.url || '',
      chatChannelName: c?.chat_channel?.name || '',
      chatChannelUrl: c?.chat_channel?.url || '',
      chatChannelPlatform: c?.chat_channel?.platform || 'slack',
    });
    this.editingCollaboration.set(true);
  }

  public cancelEditCollaboration(): void {
    this.editingCollaboration.set(false);
  }

  /** Update a single field in the collabEdit signal (Angular templates don't support spread) */
  public updateCollabField(field: string, value: string): void {
    this.collabEdit.update((current) => ({ ...current, [field]: value }));
  }

  public saveCollaboration(): void {
    const committeeId = this.committee()?.uid;
    if (!committeeId) return;

    this.collabSaving.set(true);
    const edit = this.collabEdit();

    const payload: Partial<Committee> = {
      mailing_list: edit.mailingListName
        ? { name: edit.mailingListName, url: edit.mailingListUrl || undefined, subscriber_count: this.committee()?.mailing_list?.subscriber_count }
        : undefined,
      chat_channel: edit.chatChannelName
        ? { platform: edit.chatChannelPlatform, name: edit.chatChannelName, url: edit.chatChannelUrl || undefined }
        : undefined,
    };

    this.committeeService.updateCommittee(committeeId, payload).subscribe({
      next: () => {
        this.collabSaving.set(false);
        this.editingCollaboration.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Collaboration channels updated' });
        this.refresh.next(); // re-fetch committee to reflect changes
      },
      error: () => {
        this.collabSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update collaboration channels' });
      },
    });
  }

  private initializeCommittee(): void {
    combineLatest([this.route.paramMap, this.refresh])
      .pipe(
        switchMap(([params]) => {
          const committeeId = params?.get('id');
          if (!committeeId) {
            this.error.set(true);
            this.errorMessage.set('No committee ID provided');
            return of(null);
          }

          // Reset state on each fetch attempt (e.g., after refresh or route change)
          this.error.set(false);
          this.errorMessage.set('');
          this.loading.set(true);

          const committeeQuery = this.committeeService.getCommittee(committeeId).pipe(
            catchError((err) => {
              const status = err?.status || err?.error?.status || '';
              const msg = err?.error?.message || err?.message || 'Unknown error';
              this.error.set(true);
              this.errorMessage.set(status ? `${status}: ${msg}` : msg);
              this.loading.set(false);
              return of(null);
            })
          );

          const membersQuery = this.committeeService.getCommitteeMembers(committeeId).pipe(
            catchError(() => {
              console.error('Failed to load committee members');
              return of([]);
            })
          );

          // Fetch meetings for this project (filter by committee happens in computed signal)
          const projectUid = this.projectService.project()?.uid || 'a09410d0-3455-11ea-978f-2e728ce88125';
          const meetingsQuery = this.meetingService.getMeetingsByProject(projectUid).pipe(
            catchError(() => {
              console.error('Failed to load meetings');
              return of([]);
            })
          );

          // Fetch documents for this committee
          const documentsQuery = this.committeeService.getCommitteeDocuments(committeeId).pipe(
            catchError(() => {
              console.error('Failed to load documents');
              return of([]);
            })
          );

          // Fetch surveys for this committee
          const surveysQuery = this.committeeService.getCommitteeSurveys(committeeId).pipe(catchError(() => of([] as Survey[])));

          return combineLatest([committeeQuery, membersQuery, meetingsQuery, documentsQuery, surveysQuery]).pipe(
            tap(([committee, members, meetings, documents, surveys]) => {
              this.members.set(Array.isArray(members) ? members : []);
              this.committeeMeetings.set(Array.isArray(meetings) ? meetings : []);
              this.documents.set(Array.isArray(documents) ? documents : []);
              this.committeeSurveys.set(Array.isArray(surveys) ? surveys : []);
              this.membersLoading.set(false);

              // Load group-type-specific data from APIs
              if (committee) {
                this.loadGroupTypeData(committeeId, committee);
                this.loadLinkedMailingLists(committeeId);
              }
            }),
            map(([committee]) => committee),
            finalize(() => this.loading.set(false))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((committee) => {
        this.committee.set(committee);
      });
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
        hour: '2-digit',
        minute: '2-digit',
      });
    });
  }

  /**
   * Loads group-type-specific data from real API endpoints.
   * Uses forkJoin to fetch data in parallel per behavioral class.
   */
  private loadGroupTypeData(committeeId: string, committee: Committee): void {
    const cls = getGroupBehavioralClass(committee.category);

    // ── governing-board: votes, budget, resolutions ──
    if (cls === 'governing-board') {
      forkJoin([
        this.committeeService.getCommitteeVotes(committeeId),
        this.committeeService.getCommitteeResolutions(committeeId),
        this.committeeService.getCommitteeBudget(committeeId),
      ]).subscribe(([votes, resolutions, budget]) => {
        this.openVotes.set(votes);
        this.recentResolutions.set(resolutions);
        this.budgetSummary.set(budget);
      });
    }

    // ── oversight-committee: votes + resolutions (no budget), activity + contributors ──
    if (cls === 'oversight-committee') {
      forkJoin([
        this.committeeService.getCommitteeVotes(committeeId),
        this.committeeService.getCommitteeResolutions(committeeId),
        this.committeeService.getCommitteeActivity(committeeId),
        this.committeeService.getCommitteeContributors(committeeId),
      ]).subscribe(([votes, resolutions, activity, contributors]) => {
        this.openVotes.set(votes);
        this.recentResolutions.set(resolutions);
        this.recentActivity.set(activity);
        this.topContributors.set(contributors);
      });
    }

    // ── working-group: votes, activity, contributors, deliverables ──
    if (cls === 'working-group') {
      forkJoin([
        this.committeeService.getCommitteeVotes(committeeId),
        this.committeeService.getCommitteeActivity(committeeId),
        this.committeeService.getCommitteeContributors(committeeId),
        this.committeeService.getCommitteeDeliverables(committeeId),
      ]).subscribe(([votes, activity, contributors, deliverables]) => {
        this.openVotes.set(votes);
        this.recentActivity.set(activity);
        this.topContributors.set(contributors);
        this.deliverables.set(deliverables);
      });
    }

    // ── special-interest-group: discussions, events ──
    if (cls === 'special-interest-group') {
      forkJoin([this.committeeService.getCommitteeDiscussions(committeeId), this.committeeService.getCommitteeEvents(committeeId)]).subscribe(
        ([discussions, events]) => {
          this.discussionThreads.set(discussions);
          this.upcomingEvents.set(events);
        }
      );
    }

    // ── ambassador-program: campaigns, engagement ──
    if (cls === 'ambassador-program') {
      forkJoin([this.committeeService.getCommitteeCampaigns(committeeId), this.committeeService.getCommitteeEngagement(committeeId)]).subscribe(
        ([campaigns, engagement]) => {
          this.outreachCampaigns.set(campaigns);
          this.engagementMetrics.set(engagement);
        }
      );
    }

    // ── other: no type-specific cards (just meetings, docs, members) ──
  }

  private loadLinkedMailingLists(committeeId: string): void {
    const projectUid = this.projectService.project()?.uid;
    if (!projectUid) return;

    this.loadingMailingLists.set(true);
    this.mailingListService
      .getMailingListsByProject(projectUid)
      .pipe(
        take(1),
        map((lists) => lists.filter((list) => list.committees?.some((c) => c.uid === committeeId))),
        catchError(() => of([])),
        finalize(() => this.loadingMailingLists.set(false))
      )
      .subscribe((lists) => {
        this.linkedMailingLists.set(lists);
      });
  }

  private initializeMyCommittees(): Signal<MyCommittee[]> {
    return toSignal(this.refresh.pipe(switchMap(() => this.committeeService.getMyCommittees().pipe(catchError(() => of([]))))), { initialValue: [] });
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
        hour: '2-digit',
        minute: '2-digit',
      });
    });
  }
}
