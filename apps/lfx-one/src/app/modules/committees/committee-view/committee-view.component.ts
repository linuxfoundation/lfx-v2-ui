// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
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
  ChatPlatform,
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
import { CommitteeMemberVotingStatus } from '@lfx-one/shared/enums';
import { CommitteeService } from '@services/committee.service';
import { PersonaService } from '@services/persona.service';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from 'primeng/tabs';
import { BehaviorSubject, catchError, combineLatest, finalize, forkJoin, Observable, of, switchMap, take, tap } from 'rxjs';

import { AssignLeadershipDialogComponent } from '../components/assign-leadership-dialog/assign-leadership-dialog.component';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    NgClass,
    FormsModule,
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
  public refresh = new BehaviorSubject<void>(undefined);

  // Sub-resource writable signals
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

  // -- Tab visibility signals --
  public isMembersTabVisible: Signal<boolean> = computed(() => this.committee()?.member_visibility !== 'hidden' || this.canManageConfigurations());
  public isVotesTabVisible: Signal<boolean> = computed(() => !!this.committee()?.enable_voting);

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

  // -- Configuration label signals --
  public joinModeLabel: Signal<string> = computed(() => {
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

  // -- Collaboration editing signals --
  public editingCollaboration = signal(false);
  public collabSaving = signal(false);
  public collabEdit = signal<{
    mailingListName: string;
    mailingListUrl: string;
    chatChannelPlatform: string;
    chatChannelName: string;
    chatChannelUrl: string;
  }>({
    mailingListName: '',
    mailingListUrl: '',
    chatChannelPlatform: 'slack',
    chatChannelName: '',
    chatChannelUrl: '',
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
    this.refresh.next();
  }

  public getMembersCountByOrg(org: string): number {
    return this.members().filter((m) => m.organization?.name === org).length;
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
        ? { platform: edit.chatChannelPlatform as ChatPlatform, name: edit.chatChannelName, url: edit.chatChannelUrl || undefined }
        : undefined,
    };

    this.committeeService.updateCommittee(committeeId, payload).subscribe({
      next: () => {
        this.collabSaving.set(false);
        this.editingCollaboration.set(false);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Collaboration channels updated' });
        this.refresh.next();
      },
      error: () => {
        this.collabSaving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update collaboration channels' });
      },
    });
  }

  // -- Private initializer functions --
  private initializeCommittee(): void {
    combineLatest([this.route.paramMap, this.refresh])
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

              this.committeeSignal.set(committee);

              if (committee) {
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
}
