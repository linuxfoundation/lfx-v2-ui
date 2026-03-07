// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal, Signal, ViewChild, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { HttpClient } from '@angular/common/http';
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
import { Meeting } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MeetingService } from '@services/meeting.service';
import { PersonaService } from '@services/persona.service';
import { ProjectService } from '@services/project.service';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import { MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { BehaviorSubject, catchError, combineLatest, of, switchMap } from 'rxjs';

import { FileSizePipe } from '@pipes/file-size.pipe';
import { FileTypeIconPipe } from '@pipes/file-type-icon.pipe';
import { ApplicationReviewComponent } from '../components/application-review/application-review.component';
import { CommitteeMembersComponent } from '../components/committee-members/committee-members.component';
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
    NgClass,
    FormsModule,
    ConfirmDialogModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    TooltipModule,
    DatePipe,
    DecimalPipe,
    FileSizePipe,
    FileTypeIconPipe,
    RouterLink,
  ],
  templateUrl: './committee-view.component.html',
  styleUrl: './committee-view.component.scss',
})
export class CommitteeViewComponent {
  /** @internal Force Vite transform invalidation — safe to remove later */
  private static readonly version = 5;

  // ── Injections ────────────────────────────────────────────────────────────
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);
  private readonly projectService = inject(ProjectService);

  @ViewChild(CommitteeMembersComponent)
  private committeeMembersComponent?: CommitteeMembersComponent;

  // ── Writable Signals ──────────────────────────────────────────────────────
  public members: WritableSignal<CommitteeMember[]>;
  public membersLoading: WritableSignal<boolean>;
  public loading: WritableSignal<boolean>;
  public error: WritableSignal<boolean>;
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

  // Meeting and document writables
  public committeeMeetings: WritableSignal<Meeting[]>;
  public documents: WritableSignal<CommitteeDocument[]>;

  // Tab state
  public activeTab = signal<number>(0);

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

  // ── Computed / Read-only Signals ──────────────────────────────────────────
  public committee: Signal<Committee | null>;
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

    // ── 2. Now safe to call initializeCommittee() which subscribes via toSignal() ──
    this.committee = this.initializeCommittee();

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

    // Document computed signals
    this.documentFiles = computed(() => this.documents().filter((d) => d.type === 'file'));
    this.documentLinks = computed(() => this.documents().filter((d) => d.type === 'link'));

    // Meeting computed signals
    this.upcomingMeetings = computed(() => {
      const committeeId = this.committee()?.uid;
      if (!committeeId) return [];
      const meetings = this.committeeMeetings();
      if (!Array.isArray(meetings)) return [];
      const now = new Date().getTime();
      return meetings
        .filter((m) => m.start_time && new Date(m.start_time).getTime() > now && m.committees?.some((c) => c.uid === committeeId))
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
      error: (err) => {
        this.collabSaving.set(false);
        console.error('Failed to update collaboration channels:', err);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update collaboration channels' });
      },
    });
  }

  private initializeCommittee(): Signal<Committee | null> {
    return toSignal(
      combineLatest([this.route.paramMap, this.refresh]).pipe(
        switchMap(([params]) => {
          const committeeId = params?.get('id');
          if (!committeeId) {
            this.error.set(true);
            return of(null);
          }

          const committeeQuery = this.committeeService.getCommittee(committeeId).pipe(
            catchError(() => {
              console.error('Failed to load committee');
              this.error.set(true);
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
          const documentsQuery = this.http.get<CommitteeDocument[]>(`/api/committees/${committeeId}/documents`).pipe(
            catchError(() => {
              console.error('Failed to load documents');
              return of([]);
            })
          );

          return combineLatest([committeeQuery, membersQuery, meetingsQuery, documentsQuery]).pipe(
            switchMap(([committee, members, meetings, documents]) => {
              this.members.set(Array.isArray(members) ? members : []);
              this.committeeMeetings.set(Array.isArray(meetings) ? meetings : []);
              this.documents.set(Array.isArray(documents) ? documents : []);
              this.loading.set(false);
              this.membersLoading.set(false);

              // Populate group-type-specific mock data
              if (committee) {
                this.populateGroupTypeData(committee);
              }

              return of(committee);
            })
          );
        })
      ),
      { initialValue: null }
    );
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

  private populateGroupTypeData(committee: Committee): void {
    const category = committee.category;
    const cls = getGroupBehavioralClass(category);

    // ── governing-board: votes, budget, resolutions ──
    if (cls === 'governing-board') {
      this.populateGovernanceData();
      this.populateBudgetData();
    }

    // ── oversight-committee: votes + resolutions (no budget), activity + contributors ──
    if (cls === 'oversight-committee') {
      this.populateGovernanceData();
      this.populateCollaborationData();
    }

    // ── working-group: activity, contributors, deliverables ──
    if (cls === 'working-group') {
      this.populateCollaborationData();
      this.populateDeliverablesData();
    }

    // ── special-interest-group: discussions, events ──
    if (cls === 'special-interest-group') {
      this.populateDiscussionData();
      this.populateEventsData();
    }

    // ── ambassador-program: campaigns, engagement ──
    if (cls === 'ambassador-program') {
      this.populateCampaignData();
      this.populateEngagementData();
    }

    // ── other: no type-specific cards (just meetings, docs, members) ──

    // ── Documents: populate mock data if API returned empty ──
    if (this.documents().length === 0) {
      this.populateDocumentsData(cls);
    }
  }

  // ── Mock data generators (per-type) ──────────────────────────────────────

  private populateGovernanceData(): void {
    this.openVotes.set([
      {
        uid: 'vote-001',
        title: 'Approve 2026 Annual Budget Allocation',
        status: 'open',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        votesFor: 12,
        votesAgainst: 2,
        votesAbstain: 1,
        totalEligible: 24,
        created_by: 'Sarah Chen',
      },
      {
        uid: 'vote-002',
        title: 'New Member Organization: CloudScale Inc.',
        status: 'open',
        deadline: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        votesFor: 8,
        votesAgainst: 0,
        votesAbstain: 0,
        totalEligible: 24,
        created_by: 'James Rodriguez',
      },
    ]);

    this.recentResolutions.set([
      { uid: 'res-001', title: 'Adopted Contributor License Agreement v2.0', date: '2026-02-15', result: 'Approved', votesFor: 20, votesAgainst: 1 },
      { uid: 'res-002', title: 'Q4 2025 Financial Report Accepted', date: '2026-01-28', result: 'Approved', votesFor: 22, votesAgainst: 0 },
      { uid: 'res-003', title: 'Charter Amendment: Extend term limits to 3 years', date: '2025-12-10', result: 'Approved', votesFor: 18, votesAgainst: 3 },
    ]);
  }

  private populateBudgetData(): void {
    this.budgetSummary.set({
      fiscal_year: '2026',
      total_budget: 2_400_000,
      spent: 845_000,
      committed: 320_000,
      remaining: 1_235_000,
      categories: [
        { name: 'Infrastructure', allocated: 800_000, spent: 312_000 },
        { name: 'Events & Outreach', allocated: 600_000, spent: 198_000 },
        { name: 'Engineering', allocated: 700_000, spent: 245_000 },
        { name: 'Operations', allocated: 300_000, spent: 90_000 },
      ],
    });
  }

  private populateCollaborationData(): void {
    this.recentActivity.set([
      {
        uid: 'act-001',
        type: 'pr_merged',
        title: 'feat: Add OIDC token exchange support',
        author: 'Anna Kowalski',
        repo: 'security-toolkit',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        icon: 'fa-light fa-code-pull-request',
        color: 'text-emerald-600',
      },
      {
        uid: 'act-002',
        type: 'issue_opened',
        title: 'CVE-2026-1234: Buffer overflow in parser module',
        author: 'Marcus Johnson',
        repo: 'security-toolkit',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        icon: 'fa-light fa-circle-exclamation',
        color: 'text-red-500',
      },
      {
        uid: 'act-003',
        type: 'release',
        title: 'v3.2.1 — Security patch release',
        author: 'Yuki Tanaka',
        repo: 'security-toolkit',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        icon: 'fa-light fa-tag',
        color: 'text-blue-600',
      },
      {
        uid: 'act-004',
        type: 'discussion',
        title: 'RFC: Adopt SLSA v1.0 build provenance',
        author: 'Omar Hassan',
        repo: 'security-specs',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
        icon: 'fa-light fa-comments',
        color: 'text-violet-600',
      },
    ]);

    this.topContributors.set([
      { name: 'Anna Kowalski', commits: 47, prs: 12, reviews: 23, org: 'SecurityFirst' },
      { name: 'Marcus Johnson', commits: 35, prs: 8, reviews: 31, org: 'CyberShield' },
      { name: 'Yuki Tanaka', commits: 28, prs: 15, reviews: 9, org: 'CloudNative Dev' },
      { name: 'Omar Hassan', commits: 19, prs: 6, reviews: 18, org: 'NetScale' },
    ]);
  }

  private populateDeliverablesData(): void {
    this.deliverables.set([
      {
        uid: 'del-001',
        title: 'SLSA v1.0 Build Provenance Spec',
        status: 'in-progress',
        progress: 72,
        owner: 'Anna Kowalski',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        uid: 'del-002',
        title: 'Vulnerability Disclosure Policy v3',
        status: 'in-progress',
        progress: 45,
        owner: 'Marcus Johnson',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        uid: 'del-003',
        title: 'Security Audit Playbook',
        status: 'completed',
        progress: 100,
        owner: 'Yuki Tanaka',
        dueDate: '2026-02-28',
      },
      {
        uid: 'del-004',
        title: 'SBOM Generation Tooling Integration',
        status: 'not-started',
        progress: 0,
        owner: 'Omar Hassan',
        dueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);
  }

  private populateDiscussionData(): void {
    this.discussionThreads.set([
      {
        uid: 'disc-001',
        title: 'Best practices for SBOM adoption in enterprise',
        author: 'Lena Schmidt',
        replies: 23,
        lastActivity: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        tags: ['sbom', 'enterprise'],
      },
      {
        uid: 'disc-002',
        title: 'Proposal: Monthly lightning talks from member orgs',
        author: 'Raj Patel',
        replies: 15,
        lastActivity: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        tags: ['community', 'events'],
      },
      {
        uid: 'disc-003',
        title: 'How are you handling AI-generated code in security audits?',
        author: 'Maria Garcia',
        replies: 41,
        lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['ai', 'audit'],
      },
    ]);
  }

  private populateEventsData(): void {
    this.upcomingEvents.set([
      {
        uid: 'evt-001',
        title: 'Supply Chain Security Deep Dive',
        type: 'Webinar',
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        speaker: 'Dr. Sarah Kim',
        attendees: 128,
      },
      {
        uid: 'evt-002',
        title: 'Open Source Security Summit — Bay Area',
        type: 'In-Person',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        speaker: 'Multiple speakers',
        attendees: 340,
      },
      {
        uid: 'evt-003',
        title: 'SIG Office Hours: Q&A with Maintainers',
        type: 'Virtual',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        speaker: 'SIG Leads',
        attendees: 45,
      },
    ]);
  }

  private populateCampaignData(): void {
    this.outreachCampaigns.set([
      {
        uid: 'camp-001',
        title: 'New Member Onboarding Q1 2026',
        status: 'active',
        reach: 1240,
        conversions: 89,
        conversionRate: 7.2,
        icon: 'fa-light fa-user-plus',
        color: 'text-blue-600',
      },
      {
        uid: 'camp-002',
        title: 'KubeCon Europe 2026 Booth',
        status: 'upcoming',
        reach: 0,
        conversions: 0,
        conversionRate: 0,
        icon: 'fa-light fa-booth-curtain',
        color: 'text-violet-600',
      },
      {
        uid: 'camp-003',
        title: 'Ambassador Referral Program',
        status: 'active',
        reach: 560,
        conversions: 34,
        conversionRate: 6.1,
        icon: 'fa-light fa-bullhorn',
        color: 'text-emerald-600',
      },
    ]);
  }

  private populateEngagementData(): void {
    this.engagementMetrics.set({
      totalReach: 4_820,
      newMembers30d: 12,
      eventAttendance: 340,
      newsletterOpenRate: 38.5,
      socialImpressions: 15_200,
      ambassadorCount: 24,
    });
  }

  private populateDocumentsData(cls: GroupBehavioralClass): void {
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

    const commonDocs: CommitteeDocument[] = [
      {
        uid: 'doc-001',
        type: 'file',
        name: 'Group Charter v2.1.pdf',
        mime_type: 'application/pdf',
        file_size: 245_760,
        updated_at: daysAgo(5),
        uploaded_by: 'Sarah Chen',
      },
      {
        uid: 'doc-002',
        type: 'file',
        name: 'Meeting Minutes — Feb 2026.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_size: 89_200,
        updated_at: daysAgo(12),
        uploaded_by: 'James Rodriguez',
      },
      {
        uid: 'doc-003',
        type: 'file',
        name: 'Member Onboarding Guide.pdf',
        mime_type: 'application/pdf',
        file_size: 1_420_000,
        updated_at: daysAgo(30),
        uploaded_by: 'Anna Kowalski',
      },
    ];

    const commonLinks: CommitteeDocument[] = [
      {
        uid: 'link-001',
        type: 'link',
        name: 'Shared Google Drive',
        url: 'https://drive.google.com/drive/folders/example',
        updated_at: daysAgo(2),
        uploaded_by: 'Sarah Chen',
      },
      {
        uid: 'link-002',
        type: 'link',
        name: 'GitHub Repository',
        url: 'https://github.com/example-org/project-repo',
        updated_at: daysAgo(1),
        uploaded_by: 'Marcus Johnson',
      },
    ];

    // Add type-specific documents
    const typeDocs: CommitteeDocument[] = [];

    if (cls === 'governing-board') {
      typeDocs.push(
        {
          uid: 'doc-gov-001',
          type: 'file',
          name: 'FY2026 Budget Proposal.xlsx',
          mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          file_size: 312_000,
          updated_at: daysAgo(3),
          uploaded_by: 'Finance Team',
        },
        {
          uid: 'doc-gov-002',
          type: 'file',
          name: 'Board Resolution — CLA v2.0.pdf',
          mime_type: 'application/pdf',
          file_size: 56_800,
          updated_at: daysAgo(18),
          uploaded_by: 'Sarah Chen',
        },
      );
    }

    if (cls === 'working-group' || cls === 'oversight-committee') {
      typeDocs.push(
        {
          uid: 'doc-wg-001',
          type: 'file',
          name: 'Technical Specification Draft.md',
          mime_type: 'text/markdown',
          file_size: 24_500,
          updated_at: daysAgo(1),
          uploaded_by: 'Yuki Tanaka',
        },
        {
          uid: 'doc-wg-002',
          type: 'file',
          name: 'Architecture Decision Record — ADR-042.pdf',
          mime_type: 'application/pdf',
          file_size: 178_000,
          updated_at: daysAgo(7),
          uploaded_by: 'Omar Hassan',
        },
      );
      commonLinks.push({
        uid: 'link-wg-001',
        type: 'link',
        name: 'Project Wiki',
        url: 'https://wiki.example.org/working-group',
        updated_at: daysAgo(3),
        uploaded_by: 'Anna Kowalski',
      });
    }

    if (cls === 'special-interest-group') {
      typeDocs.push({
        uid: 'doc-sig-001',
        type: 'file',
        name: 'SIG Best Practices Handbook.pdf',
        mime_type: 'application/pdf',
        file_size: 890_000,
        updated_at: daysAgo(14),
        uploaded_by: 'Lena Schmidt',
      });
      commonLinks.push({
        uid: 'link-sig-001',
        type: 'link',
        name: 'Discussion Forum',
        url: 'https://discuss.example.org/sig-security',
        updated_at: daysAgo(1),
        uploaded_by: 'Raj Patel',
      });
    }

    if (cls === 'ambassador-program') {
      typeDocs.push({
        uid: 'doc-amb-001',
        type: 'file',
        name: 'Ambassador Brand Kit.zip',
        mime_type: 'application/zip',
        file_size: 5_400_000,
        updated_at: daysAgo(10),
        uploaded_by: 'Marketing Team',
      });
      commonLinks.push({
        uid: 'link-amb-001',
        type: 'link',
        name: 'Ambassador Portal',
        url: 'https://ambassadors.example.org',
        updated_at: daysAgo(2),
        uploaded_by: 'Program Manager',
      });
    }

    this.documents.set([...commonDocs, ...typeDocs, ...commonLinks]);
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
