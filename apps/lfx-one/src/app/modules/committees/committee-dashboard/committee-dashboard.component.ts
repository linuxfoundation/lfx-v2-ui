// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import { Committee, CreateCommitteeMemberRequest, MyCommittee, ProjectContext } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { FeatureFlagService } from '@services/feature-flag.service';
import { PersonaService } from '@services/persona.service';
import { ProjectContextService } from '@services/project-context.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { BehaviorSubject, catchError, combineLatest, debounceTime, distinctUntilChanged, finalize, of, startWith, switchMap, take } from 'rxjs';

import { InviteMemberDialogComponent } from '../components/invite-member-dialog/invite-member-dialog.component';
import { JoinApplicationDialogComponent } from '../components/join-application-dialog/join-application-dialog.component';
import { CommitteeTableComponent } from '../components/committee-table/committee-table.component';

@Component({
  selector: 'lfx-committee-dashboard',
  imports: [DecimalPipe, ButtonComponent, CardComponent, CommitteeTableComponent, ConfirmDialogModule, DynamicDialogModule, RouterLink, TooltipModule],
  providers: [ConfirmationService, DialogService],
  templateUrl: './committee-dashboard.component.html',
  styleUrl: './committee-dashboard.component.scss',
})
export class CommitteeDashboardComponent {
  // Inject services
  private readonly projectContextService = inject(ProjectContextService);
  private readonly committeeService = inject(CommitteeService);
  private readonly personaService = inject(PersonaService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly dialogService = inject(DialogService);

  // Use the configurable label constants
  protected readonly committeeLabel = COMMITTEE_LABEL.singular;
  protected readonly committeeLabelPlural = COMMITTEE_LABEL.plural;

  // ── Writable Signals ──────────────────────────────────────────────────────
  public committeesLoading: WritableSignal<boolean>;
  public myCommitteesLoading: WritableSignal<boolean>;
  public categoryFilter: WritableSignal<string | null>;
  public votingStatusFilter: WritableSignal<string | null>;
  public refresh: BehaviorSubject<void>;

  // ── Forms ─────────────────────────────────────────────────────────────────
  public searchForm: FormGroup;

  // ── Computed / Read-only Signals ──────────────────────────────────────────
  public project: Signal<ProjectContext | null>;
  public committees: Signal<Committee[]>;
  public myCommittees: Signal<MyCommittee[]>;
  public myCommitteeUids: Signal<Set<string>>;
  public categories: Signal<{ label: string; value: string | null }[]>;
  public votingStatusOptions: Signal<{ label: string; value: string | null }[]>;
  public filteredCommittees: Signal<Committee[]>;

  // Permission signals
  public isMaintainer: Signal<boolean>;
  public isBoardMember: Signal<boolean>;
  public isFoundationContext: Signal<boolean>;
  public foundationCreateCommitteeFlag: Signal<boolean>;
  public canCreateGroup: Signal<boolean>;

  // Persona display
  public personaLabel: Signal<string>;

  // Statistics
  public totalCommittees: Signal<number>;
  public publicCommittees: Signal<number>;
  public activeVoting: Signal<number>;
  public totalMembers: Signal<number>;

  private searchTerm: Signal<string>;

  public constructor() {
    // Initialize project context
    this.project = computed(() => this.projectContextService.selectedProject() || this.projectContextService.selectedFoundation());

    // Initialize permission checks
    this.isMaintainer = computed(() => this.personaService.currentPersona() === 'maintainer');
    this.isBoardMember = computed(() => this.personaService.currentPersona() === 'board-member');
    this.isFoundationContext = computed(() => !this.projectContextService.selectedProject() && !!this.projectContextService.selectedFoundation());
    this.foundationCreateCommitteeFlag = this.featureFlagService.getBooleanFlag('foundation-create-committee', false);
    this.canCreateGroup = computed(() => {
      // Board members cannot manage committees
      if (this.isBoardMember()) {
        return false;
      }
      const isMaintainerAndNotFoundation = this.isMaintainer() && !this.isFoundationContext();
      const hasFeatureFlag = this.foundationCreateCommitteeFlag();
      // TODO: TEMPORARY - Allow create in local dev even at foundation level
      const isLocalDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      return isMaintainerAndNotFoundation || hasFeatureFlag || (isLocalDev && this.isMaintainer());
    });

    // Initialize state
    this.committeesLoading = signal<boolean>(true);
    this.myCommitteesLoading = signal<boolean>(true);
    this.refresh = new BehaviorSubject<void>(undefined);

    // Persona label
    this.personaLabel = computed(() => {
      const persona = this.personaService.currentPersona();
      switch (persona) {
        case 'board-member':
          return 'Board Member';
        case 'maintainer':
          return 'Maintainer';
        case 'core-developer':
          return 'Contributor';
        case 'projects':
          return 'Executive Director';
        default:
          return 'Member';
      }
    });

    // Initialize data
    this.committees = this.initializeCommittees();
    this.myCommittees = this.initializeMyCommittees();
    this.myCommitteeUids = computed(() => new Set(this.myCommittees().map((c) => c.uid)));

    // Initialize search form
    this.searchForm = this.initializeSearchForm();
    this.categoryFilter = signal<string | null>(null);
    this.votingStatusFilter = signal<string | null>(null);
    this.searchTerm = this.initializeSearchTerm();

    // Initialize filters
    this.categories = this.initializeCategories();
    this.votingStatusOptions = this.initializeVotingStatusOptions();
    this.filteredCommittees = this.initializeFilteredCommittees();

    // Initialize statistics
    this.totalCommittees = computed(() => this.committees().length);
    this.publicCommittees = computed(() => this.committees().filter((c) => c.public).length);
    this.activeVoting = computed(() => this.committees().filter((c) => c.enable_voting).length);
    this.totalMembers = computed(() => this.committees().reduce((sum, c) => sum + (c.total_members || 0), 0));
  }

  public onCategoryChange(value: string | null): void {
    this.categoryFilter.set(value);
  }

  public onVotingStatusChange(value: string | null): void {
    this.votingStatusFilter.set(value);
  }

  public onSearch(): void {
    // Trigger search through form control value changes
  }

  public openCreateDialog(): void {
    const uid = this.project()?.uid;
    if (!uid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please select a project first',
      });
      return;
    }

    this.router.navigate(['/groups/create']);
  }

  public refreshCommittees(): void {
    this.committeesLoading.set(true);
    this.refresh.next();
  }

  public onCommitteeClick(committee: Committee): void {
    this.router.navigate(['/groups', committee.uid]);
  }

  public joinGroup(committee: Committee): void {
    const joinMode = committee.join_mode || 'closed';

    switch (joinMode) {
      case 'open':
        // Direct join — backend resolves current user from auth context
        this.committeeService.createCommitteeMember(committee.uid, { email: '' } as CreateCommitteeMemberRequest).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Joined',
              detail: `You have joined "${committee.name}"`,
            });
            this.refreshCommittees();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to join "${committee.name}"`,
            });
          },
        });
        break;

      case 'apply':
        // Open application dialog
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
            this.refreshCommittees();
          }
        });
        break;

      case 'invite-only':
        this.messageService.add({
          severity: 'info',
          summary: 'Invite Only',
          detail: `"${committee.name}" is invite-only. Ask an existing member to invite you.`,
        });
        break;

      case 'closed':
      default:
        this.messageService.add({
          severity: 'warn',
          summary: 'Closed',
          detail: `"${committee.name}" is not currently accepting new members.`,
        });
        break;
    }
  }

  public inviteToGroup(committee: Committee): void {
    this.dialogService.open(InviteMemberDialogComponent, {
      header: 'Invite Members',
      width: '550px',
      modal: true,
      closable: true,
      duplicate: true,
      data: { committee },
    });
  }

  public leaveGroup(committee: MyCommittee): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to leave "${committee.name}"?`,
      header: 'Leave Group',
      acceptLabel: 'Leave',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => {
        if (!committee.myMemberUid) {
          return;
        }
        this.committeeService.deleteCommitteeMember(committee.uid, committee.myMemberUid).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Left Group',
              detail: `You have left "${committee.name}"`,
            });
            this.refreshCommittees();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to leave "${committee.name}"`,
            });
          },
        });
      },
    });
  }

  private initializeMyCommittees(): Signal<MyCommittee[]> {
    return toSignal(
      this.refresh.pipe(
        switchMap(() => {
          this.myCommitteesLoading.set(true);
          return this.committeeService.getMyCommittees().pipe(
            catchError((error) => {
              console.error('Failed to load my committees:', error);
              return of([]);
            }),
            finalize(() => this.myCommitteesLoading.set(false))
          );
        })
      ),
      { initialValue: [] }
    );
  }

  private initializeSearchForm(): FormGroup {
    return new FormGroup({
      search: new FormControl<string>(''),
      category: new FormControl<string | null>(null),
      votingStatus: new FormControl<string | null>(null),
    });
  }

  private initializeSearchTerm(): Signal<string> {
    return toSignal(this.searchForm.get('search')!.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()), { initialValue: '' });
  }

  private initializeCommittees(): Signal<Committee[]> {
    // Convert project signal to observable to react to project changes
    const project$ = toObservable(this.project);

    return toSignal(
      combineLatest([project$, this.refresh]).pipe(
        switchMap(([project]) => {
          if (!project?.uid) {
            this.committeesLoading.set(false);
            return of([]);
          }

          this.committeesLoading.set(true);
          return this.committeeService.getCommitteesByProject(project.uid).pipe(
            catchError((error) => {
              console.error('Failed to load committees:', error);
              return of([]);
            }),
            finalize(() => this.committeesLoading.set(false))
          );
        })
      ),
      { initialValue: [] }
    );
  }

  private initializeCategories(): Signal<{ label: string; value: string | null }[]> {
    return computed(() => {
      const committeesData = this.committees();

      // Count committees by category
      const categoryCounts = new Map<string, number>();
      committeesData.forEach((committee) => {
        if (committee.category) {
          categoryCounts.set(committee.category, (categoryCounts.get(committee.category) || 0) + 1);
        }
      });

      // Get unique categories and sort them
      const uniqueCategories = Array.from(categoryCounts.keys()).sort((a, b) => a.localeCompare(b));

      // Create options with counts
      const categoryOptions = uniqueCategories.map((cat) => ({
        label: `${cat} (${categoryCounts.get(cat)})`,
        value: cat,
      }));

      return [{ label: `All Types`, value: null }, ...categoryOptions];
    });
  }

  private initializeVotingStatusOptions(): Signal<{ label: string; value: string | null }[]> {
    return computed(() => {
      const committeesData = this.committees();

      // Count committees by voting status
      const votingEnabledCount = committeesData.filter((c) => c.enable_voting === true).length;
      const votingDisabledCount = committeesData.filter((c) => c.enable_voting === false).length;

      return [
        { label: 'All Voting Status', value: null },
        { label: `Voting Enabled (${votingEnabledCount})`, value: 'enabled' },
        { label: `Voting Disabled (${votingDisabledCount})`, value: 'disabled' },
      ];
    });
  }

  private initializeFilteredCommittees(): Signal<Committee[]> {
    return computed(() => {
      let filtered = this.committees();

      // Apply search filter
      const searchTerm = this.searchTerm()?.toLowerCase() || '';
      if (searchTerm) {
        filtered = filtered.filter(
          (committee) =>
            committee.name.toLowerCase().includes(searchTerm) ||
            committee.description?.toLowerCase().includes(searchTerm) ||
            committee.category?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply category filter
      const category = this.categoryFilter();
      if (category) {
        filtered = filtered.filter((committee) => committee.category === category);
      }

      // Apply voting status filter
      const votingStatus = this.votingStatusFilter();
      if (votingStatus) {
        if (votingStatus === 'enabled') {
          filtered = filtered.filter((committee) => committee.enable_voting === true);
        } else if (votingStatus === 'disabled') {
          filtered = filtered.filter((committee) => committee.enable_voting === false);
        }
      }

      return filtered;
    });
  }
}
