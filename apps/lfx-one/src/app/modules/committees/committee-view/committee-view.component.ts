// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@components/breadcrumb/breadcrumb.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import {
  Committee,
  CommitteeLeadership,
  CommitteeMember,
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
import { BehaviorSubject, catchError, combineLatest, finalize, of, switchMap, take } from 'rxjs';

import { ApplicationReviewComponent } from '../components/application-review/application-review.component';
import { AssignLeadershipDialogComponent } from '../components/assign-leadership-dialog/assign-leadership-dialog.component';
import { CommitteeMembersComponent } from '../components/committee-members/committee-members.component';
import { CommitteeSettingsComponent } from '../components/committee-settings/committee-settings.component';

@Component({
  selector: 'lfx-committee-view',
  imports: [
    NgClass,
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
    ApplicationReviewComponent,
    CommitteeMembersComponent,
    CommitteeSettingsComponent,
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
  public membersLoading = signal<boolean>(true);
  public members: WritableSignal<CommitteeMember[]> = signal([]);

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

  public behavioralClass: Signal<GroupBehavioralClass> = computed(() => {
    const cat = this.committee()?.category?.toLowerCase() ?? '';
    if (cat.includes('board')) return 'governing-board';
    if (cat.includes('oversight') || cat.includes('tsc') || cat.includes('toc')) return 'oversight-committee';
    if (cat.includes('working')) return 'working-group';
    if (cat.includes('sig') || cat.includes('special')) return 'special-interest-group';
    if (cat.includes('ambassador')) return 'ambassador-program';
    return 'other';
  });

  // -- Tab visibility signals --
  public isMembersTabVisible: Signal<boolean> = computed(() => this.committee()?.member_visibility !== 'hidden' || this.canManageConfigurations());
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
    switch (this.committee()?.join_mode) {
      case 'open':
        return 'Open';
      case 'invite_only':
        return 'Invite Only';
      case 'application':
        return 'Apply to Join';
      case 'closed':
        return 'Closed';
      default:
        return 'Closed';
    }
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

  public refreshMembers(): void {
    this.refresh.next();
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
