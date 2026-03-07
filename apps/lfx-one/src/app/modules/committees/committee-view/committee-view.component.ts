// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal, Signal, viewChild, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import {
  Committee,
  CommitteeMember,
  CommitteeMemberVotingStatus,
  getCommitteeCategorySeverity,
  getGroupBehavioralClass,
  GroupBehavioralClass,
  isAmbassadorProgram,
  isCollaborationClass,
  isGovernanceClass,
  isGoverningBoard,
  isOtherClass,
  isOversightCommittee,
  isSpecialInterestGroup,
  isWorkingGroup,
  TagSeverity,
} from '@lfx-one/shared';
import { CommitteeService } from '@services/committee.service';
import { PersonaService } from '@services/persona.service';
import { FileSizePipe } from '@pipes/file-size.pipe';
import { FileTypeIconPipe } from '@pipes/file-type-icon.pipe';
import { MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { BehaviorSubject, catchError, combineLatest, of, switchMap, throwError } from 'rxjs';

import { DashboardMeetingCardComponent } from '../../dashboards/components/dashboard-meeting-card/dashboard-meeting-card.component';
import { ApplicationReviewComponent } from '../components/application-review/application-review.component';
import { CommitteeMeetingsComponent } from '../components/committee-meetings/committee-meetings.component';
import { CommitteeMembersComponent } from '../components/committee-members/committee-members.component';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    DatePipe,
    DecimalPipe,
    NgClass,
    FormsModule,
    BreadcrumbComponent,
    CardComponent,
    ButtonComponent,
    TagComponent,
    ApplicationReviewComponent,
    CommitteeMembersComponent,
    CommitteeMeetingsComponent,
    DashboardMeetingCardComponent,
    ConfirmDialogModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    TooltipModule,
    RouterLink,
    FileSizePipe,
    FileTypeIconPipe,
  ],
  templateUrl: './committee-view.component.html',
  styleUrl: './committee-view.component.scss',
})
export class CommitteeViewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);

  public committee: Signal<Committee | null>;
  public members: WritableSignal<CommitteeMember[]>;
  public membersLoading: WritableSignal<boolean>;
  public loading: WritableSignal<boolean>;
  public error: WritableSignal<boolean>;
  public formattedCreatedDate: Signal<string>;
  public formattedUpdatedDate: Signal<string>;
  public refresh: BehaviorSubject<void>;
  public categorySeverity: Signal<TagSeverity>;
  public breadcrumbItems: Signal<MenuItem[]>;
  public isBoardMember: Signal<boolean>;
  public isMaintainer: Signal<boolean>;
  public canManageConfigurations: Signal<boolean>;

  // Group-type behavioral classification signals
  public behavioralClass: Signal<GroupBehavioralClass>;
  public isGovernanceClass: Signal<boolean>;
  public isCollaborationClass: Signal<boolean>;
  public isGoverningBoard: Signal<boolean>;
  public isOversightCommittee: Signal<boolean>;
  public isWorkingGroup: Signal<boolean>;
  public isSpecialInterestGroup: Signal<boolean>;
  public isAmbassadorProgram: Signal<boolean>;
  public isOtherClass: Signal<boolean>;

  // Dashboard stats
  public totalMembers: Signal<number>;
  public activeVoters: Signal<number>;
  public uniqueOrganizations: Signal<string[]>;
  public orgCount: Signal<number>;
  public roleBreakdown: Signal<{ name: string; count: number }[]>;

  // Chair/Co-Chair leadership
  public chair: Signal<any>;
  public coChair: Signal<any>;
  public hasChair: Signal<boolean>;
  public hasCoChair: Signal<boolean>;
  public chairElectedDate: Signal<string>;
  public coChairElectedDate: Signal<string>;

  // Document signals
  public documents = signal<any[]>([]);
  public documentFiles: Signal<any[]>;
  public documentLinks: Signal<any[]>;

  // Meeting signals
  public committeeMeetings = signal<any[]>([]);
  public upcomingMeetings: Signal<any[]>;

  // Per-type mock data signals
  public openVotes = signal<any[]>([]);
  public recentResolutions = signal<any[]>([]);
  public budgetSummary = signal<any>(null);
  public recentActivity = signal<any[]>([]);
  public topContributors = signal<any[]>([]);
  public deliverables = signal<any[]>([]);
  public discussionThreads = signal<any[]>([]);
  public upcomingEvents = signal<any[]>([]);
  public outreachCampaigns = signal<any[]>([]);
  public engagementMetrics = signal<any>(null);

  // Collaboration editing signals
  public editingCollaboration = signal(false);
  public collabSaving = signal(false);
  public collabEdit = signal<{
    mailingListName: string;
    mailingListUrl: string;
    chatChannelPlatform: string;
    chatChannelName: string;
    chatChannelUrl: string;
  }>({ mailingListName: '', mailingListUrl: '', chatChannelPlatform: 'slack', chatChannelName: '', chatChannelUrl: '' });

  // ViewChild for CommitteeMembersComponent
  public committeeMembersComponent = viewChild(CommitteeMembersComponent);

  // Tab state
  public activeTab = signal<string | number | undefined>(0);

  public constructor() {
    this.error = signal<boolean>(false);
    this.refresh = new BehaviorSubject<void>(undefined);
    this.members = signal<CommitteeMember[]>([]);
    this.membersLoading = signal<boolean>(true);
    this.loading = signal<boolean>(true);
    this.committee = this.initializeCommittee();
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
        .filter((m: any) => m.start_time && new Date(m.start_time).getTime() > now && m.committees?.some((c: any) => c.uid === committeeId))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
        .slice(0, 3);
    });
  }

  public openAddMemberDialog(): void {
    this.committeeMembersComponent()?.openAddMemberDialog();
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

  public startEditCollaboration(): void {
    const committee = this.committee();
    this.collabEdit.set({
      mailingListName: committee?.mailing_list?.name || '',
      mailingListUrl: committee?.mailing_list?.url || '',
      chatChannelPlatform: committee?.chat_channel?.platform || 'slack',
      chatChannelName: committee?.chat_channel?.name || '',
      chatChannelUrl: committee?.chat_channel?.url || '',
    });
    this.editingCollaboration.set(true);
  }

  public cancelEditCollaboration(): void {
    this.editingCollaboration.set(false);
  }

  public saveCollaboration(): void {
    this.collabSaving.set(true);
    // TODO: Implement actual save via API
    setTimeout(() => {
      this.collabSaving.set(false);
      this.editingCollaboration.set(false);
    }, 500);
  }

  public updateCollabField(field: string, value: string): void {
    this.collabEdit.update((current) => ({ ...current, [field]: value }));
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
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load committee',
              });
              this.router.navigate(['/', 'groups']);
              return throwError(() => new Error('Failed to load committee'));
            })
          );

          const membersQuery = this.committeeService.getCommitteeMembers(committeeId).pipe(
            catchError(() => {
              console.error('Failed to load committee members');
              return of([]);
            })
          );

          return combineLatest([committeeQuery, membersQuery]).pipe(
            switchMap(([committee, members]) => {
              this.members.set(members);
              this.populateGroupTypeData(committee);
              this.loading.set(false);
              this.membersLoading.set(false);
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
