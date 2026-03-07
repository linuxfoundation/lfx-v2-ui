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
  CommitteeActivity,
  CommitteeBudgetSummary,
  CommitteeContributor,
  CommitteeDeliverable,
  CommitteeDiscussionThread,
  CommitteeDocument,
  CommitteeEngagementMetrics,
  CommitteeEvent,
  CommitteeMember,
  CommitteeMemberVotingStatus,
  CommitteeOutreachCampaign,
  CommitteeResolution,
  CommitteeVote,
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
import { BehaviorSubject, catchError, combineLatest, forkJoin, of, switchMap, throwError } from 'rxjs';

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
  public documents = signal<CommitteeDocument[]>([]);
  public documentFiles: Signal<CommitteeDocument[]>;
  public documentLinks: Signal<CommitteeDocument[]>;

  // Meeting signals
  public committeeMeetings = signal<any[]>([]);
  public upcomingMeetings: Signal<any[]>;

  // Per-type data signals (loaded from API)
  public openVotes = signal<CommitteeVote[]>([]);
  public recentResolutions = signal<CommitteeResolution[]>([]);
  public budgetSummary = signal<CommitteeBudgetSummary | null>(null);
  public recentActivity = signal<CommitteeActivity[]>([]);
  public topContributors = signal<CommitteeContributor[]>([]);
  public deliverables = signal<CommitteeDeliverable[]>([]);
  public discussionThreads = signal<CommitteeDiscussionThread[]>([]);
  public upcomingEvents = signal<CommitteeEvent[]>([]);
  public outreachCampaigns = signal<CommitteeOutreachCampaign[]>([]);
  public engagementMetrics = signal<CommitteeEngagementMetrics | null>(null);

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

          const membersQuery = this.committeeService.getCommitteeMembers(committeeId).pipe(catchError(() => of([])));

          const documentsQuery = this.committeeService.getCommitteeDocuments(committeeId).pipe(catchError(() => of([])));

          return combineLatest([committeeQuery, membersQuery, documentsQuery]).pipe(
            switchMap(([committee, members, documents]) => {
              this.members.set(members);
              this.documents.set(documents);
              this.loading.set(false);
              this.membersLoading.set(false);

              // Load type-specific data from APIs
              if (committee) {
                this.loadGroupTypeData(committeeId, committee);
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

  private loadGroupTypeData(committeeId: string, committee: Committee): void {
    const cls = getGroupBehavioralClass(committee.category);

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

    if (cls === 'working-group') {
      forkJoin([
        this.committeeService.getCommitteeActivity(committeeId),
        this.committeeService.getCommitteeContributors(committeeId),
        this.committeeService.getCommitteeDeliverables(committeeId),
      ]).subscribe(([activity, contributors, deliverables]) => {
        this.recentActivity.set(activity);
        this.topContributors.set(contributors);
        this.deliverables.set(deliverables);
      });
    }

    if (cls === 'special-interest-group') {
      forkJoin([this.committeeService.getCommitteeDiscussions(committeeId), this.committeeService.getCommitteeEvents(committeeId)]).subscribe(
        ([discussions, events]) => {
          this.discussionThreads.set(discussions);
          this.upcomingEvents.set(events);
        }
      );
    }

    if (cls === 'ambassador-program') {
      forkJoin([this.committeeService.getCommitteeCampaigns(committeeId), this.committeeService.getCommitteeEngagement(committeeId)]).subscribe(
        ([campaigns, engagement]) => {
          this.outreachCampaigns.set(campaigns);
          this.engagementMetrics.set(engagement);
        }
      );
    }
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
