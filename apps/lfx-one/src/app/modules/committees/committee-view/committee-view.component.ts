// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, NgClass } from '@angular/common';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import { Committee, CommitteeLeadership, CommitteeMember, GroupBehavioralClass, LeadershipRole } from '@lfx-one/shared/interfaces';
import { TagSeverity } from '@lfx-one/shared/interfaces';
import { getCommitteeCategorySeverity } from '@lfx-one/shared/constants';
import { CommitteeMemberVotingStatus } from '@lfx-one/shared/enums';
import { CommitteeService } from '@services/committee.service';
import { PersonaService } from '@services/persona.service';
import { ConfirmationService, MenuItem, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';

import { catchError, combineLatest, finalize, of, switchMap, take, tap } from 'rxjs';

import { AssignLeadershipDialogComponent } from '../components/assign-leadership-dialog/assign-leadership-dialog.component';
import { CommitteeChannelsComponent } from '../components/committee-channels/committee-channels.component';
import { CommitteeLeadershipCardComponent } from '../components/committee-leadership-card/committee-leadership-card.component';
import { CommitteeMembersComponent } from '../components/committee-members/committee-members.component';

type CommitteeTab = 'overview' | 'members' | 'votes' | 'meetings' | 'surveys' | 'documents';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    DatePipe,
    NgClass,
    BreadcrumbComponent,
    CardComponent,
    ButtonComponent,
    TagComponent,
    RouterLink,
    ConfirmDialogModule,
    DynamicDialogModule,
    TooltipModule,
    CommitteeChannelsComponent,
    CommitteeLeadershipCardComponent,
    CommitteeMembersComponent,
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
  public activeTab = signal<CommitteeTab>('overview');

  // -- Writable signals --
  public loading = signal<boolean>(true);
  public error = signal<boolean>(false);
  public errorType = signal<'not-found' | 'server-error' | null>(null);
  public refresh = signal(0);

  // -- Sub-resource signals --
  public membersLoading = signal<boolean>(true);

  // -- Reactive data (toSignal) --
  public committee: Signal<Committee | null> = this.initializeCommittee();
  public members: Signal<CommitteeMember[]> = this.initializeMembers();

  // -- Leadership override for instant UI updates after dialog --
  private leadershipOverride = signal<{ chair?: CommitteeLeadership | null; co_chair?: CommitteeLeadership | null } | null>(null);

  // -- Computed / toSignal --
  public categorySeverity: Signal<TagSeverity> = computed(() => {
    const category = this.committee()?.category;
    return getCommitteeCategorySeverity(category || '');
  });

  public breadcrumbItems: Signal<MenuItem[]> = computed(() => [{ label: 'Groups', routerLink: ['/groups'] }, { label: this.committee()?.name || '' }]);

  public isBoardMember: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'board-member');
  public isMaintainer: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'maintainer');
  public canManageConfigurations: Signal<boolean> = computed(() => this.isMaintainer() || (!!this.committee()?.writer && !this.isBoardMember()));

  // Exact category-to-behavioral-class map to avoid false matches from substring matching
  private static readonly CATEGORY_BEHAVIORAL_MAP: Record<string, GroupBehavioralClass> = {
    'board of directors': 'governing-board',
    'governing board': 'governing-board',
    'technical oversight committee': 'oversight-committee',
    tsc: 'oversight-committee',
    toc: 'oversight-committee',
    'technical steering committee': 'oversight-committee',
    'technical advisory council': 'oversight-committee',
    'working group': 'working-group',
    'special interest group': 'special-interest-group',
    sig: 'special-interest-group',
    'ambassador program': 'ambassador-program',
    ambassadors: 'ambassador-program',
  };

  public behavioralClass: Signal<GroupBehavioralClass> = computed(() => {
    const cat = this.committee()?.category?.toLowerCase().trim() ?? '';
    return CommitteeViewComponent.CATEGORY_BEHAVIORAL_MAP[cat] ?? 'other';
  });

  // -- Tab visibility signals --
  public isMembersTabVisible: Signal<boolean> = computed(() => {
    const committee = this.committee();
    if (!committee) return false;
    return committee.member_visibility !== 'hidden' || this.canManageConfigurations();
  });
  public isVotesTabVisible: Signal<boolean> = computed(() => !!this.committee()?.enable_voting);

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
  public orgMemberCounts: Signal<Map<string, number>> = computed(() => {
    const counts = new Map<string, number>();
    this.members().forEach((m) => {
      const org = m.organization?.name;
      if (org) counts.set(org, (counts.get(org) || 0) + 1);
    });
    return counts;
  });
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

  // -- Leadership signals (with override support) --
  public chair: Signal<CommitteeLeadership | null | undefined> = computed(() => {
    const override = this.leadershipOverride();
    if (override && 'chair' in override) return override.chair;
    return this.committee()?.chair;
  });
  public coChair: Signal<CommitteeLeadership | null | undefined> = computed(() => {
    const override = this.leadershipOverride();
    if (override && 'co_chair' in override) return override.co_chair;
    return this.committee()?.co_chair;
  });

  // -- Configuration label signals --
  // TODO: Replace with JoinModeLabelPipe or JOIN_MODE_LABELS constant after PR #294 merges
  private static readonly joinModeMap: Record<string, string> = {
    open: 'Open',
    invite_only: 'Invite Only',
    application: 'Apply to Join',
    closed: 'Closed',
  };
  public joinModeLabel: Signal<string> = computed(() => CommitteeViewComponent.joinModeMap[this.committee()?.join_mode ?? 'closed'] ?? 'Closed');

  // -- Public methods --
  public goBack(): void {
    this.router.navigate(['/', 'groups']);
  }

  public refreshCommittee(): void {
    this.loading.set(true);
    this.leadershipOverride.set(null);
    this.refresh.update((v) => v + 1);
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
        if (result.role === 'chair') {
          this.leadershipOverride.set({ ...this.leadershipOverride(), chair: result.leadership });
        } else {
          this.leadershipOverride.set({ ...this.leadershipOverride(), co_chair: result.leadership });
        }
      }
    });
  }

  // -- Private initializer functions --
  private initializeCommittee(): Signal<Committee | null> {
    const refresh$ = toObservable(this.refresh);

    return toSignal(
      combineLatest([this.route.paramMap, refresh$]).pipe(
        switchMap(([params]) => {
          const committeeId = params?.get('id');
          if (!committeeId) {
            this.errorType.set('not-found');
            this.error.set(true);
            this.loading.set(false);
            return of(null);
          }

          this.error.set(false);
          this.errorType.set(null);
          this.activeTab.set('overview');
          this.leadershipOverride.set(null);
          this.loading.set(true);

          return this.committeeService.getCommittee(committeeId).pipe(
            catchError((err) => {
              const status = err?.status;
              if (status === 404 || status === 403) {
                this.errorType.set('not-found');
              } else {
                this.errorType.set('server-error');
              }
              this.error.set(true);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: status === 404 ? 'Group not found' : 'Failed to load group details',
              });
              return of(null);
            }),
            finalize(() => this.loading.set(false))
          );
        })
      ),
      { initialValue: null }
    );
  }

  private initializeMembers(): Signal<CommitteeMember[]> {
    const refresh$ = toObservable(this.refresh);

    return toSignal(
      combineLatest([this.route.paramMap, refresh$]).pipe(
        switchMap(([params]) => {
          const committeeId = params?.get('id');
          if (!committeeId) {
            this.membersLoading.set(false);
            return of([]);
          }
          this.membersLoading.set(true);
          return this.committeeService.getCommitteeMembers(committeeId).pipe(
            tap(() => this.membersLoading.set(false)),
            catchError(() => {
              this.membersLoading.set(false);
              return of([]);
            })
          );
        })
      ),
      { initialValue: [] }
    );
  }
}
