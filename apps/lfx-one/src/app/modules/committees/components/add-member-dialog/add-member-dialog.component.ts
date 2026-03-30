// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Signal, signal } from '@angular/core';
import { UserAvatarColorPipe } from '@pipes/user-avatar-color.pipe';
import { UserInitialsPipe } from '@pipes/user-initials.pipe';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { OrganizationSearchComponent } from '@components/organization-search/organization-search.component';
import { SelectComponent } from '@components/select/select.component';
import { CheckboxComponent } from '@components/checkbox/checkbox.component';
import { MEMBER_ROLES, VOTING_STATUSES } from '@lfx-one/shared/constants';
import { CommitteeMemberRole, CommitteeMemberVotingStatus } from '@lfx-one/shared/enums';
import { Committee, CommitteeMember, CreateCommitteeMemberRequest, UserSearchResult } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MailingListService } from '@services/mailing-list.service';
import { SearchService } from '@services/search.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap, tap } from 'rxjs';
import { getHttpErrorDetail } from '@shared/utils/http-error.utils';

type DialogMode = 'search' | 'configure';

/**
 * Search-first "Add Member" dialog for the committee Members tab.
 *
 * Flow:
 *  Step 1 (search)    — type-ahead search for LF accounts; existing members greyed out.
 *  Step 2 (configure) — selected person card + role / voting / org / mailing-list toggle.
 *  Manual fallback    — closes this dialog with 'manual'; parent opens MemberFormComponent.
 *
 * Generated with [Claude Code](https://claude.ai/code)
 */
@Component({
  selector: 'lfx-add-member-dialog',
  imports: [
    ReactiveFormsModule,
    NgClass,
    UserInitialsPipe,
    UserAvatarColorPipe,
    ButtonComponent,
    InputTextComponent,
    OrganizationSearchComponent,
    SelectComponent,
    CheckboxComponent,
    SkeletonModule,
  ],
  templateUrl: './add-member-dialog.component.html',
  styleUrl: './add-member-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddMemberDialogComponent {
  // ── Injections ────────────────────────────────────────────────────────────
  private readonly committeeService = inject(CommitteeService);
  private readonly mailingListService = inject(MailingListService);
  private readonly searchService = inject(SearchService);
  private readonly messageService = inject(MessageService);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  // ── Dialog config data ────────────────────────────────────────────────────
  public readonly committee: Committee | null = this.config.data?.committee ?? null;
  /** Set of lowercase emails for members already in this committee */
  private readonly existingEmails = new Set<string>(
    ((this.config.data?.existingMembers as CommitteeMember[]) ?? []).map((m: CommitteeMember) => (m.email ?? '').toLowerCase())
  );

  // ── Forms ─────────────────────────────────────────────────────────────────
  /** Search input form — drives the live query */
  public readonly searchForm = new FormGroup({ query: new FormControl('') });

  /** Configure form (Step 2) — role, voting, org, mailing list */
  public readonly configForm = new FormGroup({
    role: new FormControl<string | null>(null, this.committee?.enable_voting ? [Validators.required] : []),
    voting_status: new FormControl<string | null>(null, this.committee?.enable_voting ? [Validators.required] : []),
    org_name: new FormControl<string>('', this.committee?.business_email_required || this.committee?.enable_voting ? [Validators.required] : []),
    org_domain: new FormControl<string>(''),
    subscribe_mailing_list: new FormControl<boolean>(true),
  });

  // ── Writable signals ──────────────────────────────────────────────────────
  public mode = signal<DialogMode>('search');
  public submitting = signal(false);
  public searchLoading = signal(false);
  public selectedUser = signal<UserSearchResult | null>(null);

  // ── Computed signals ──────────────────────────────────────────────────────
  /** Deduplicated search results with "already member" flag */
  public searchResults: Signal<(UserSearchResult & { alreadyMember: boolean })[]> = this.initSearchResults();

  /** Raw query value as a signal — safe to read in templates under zoneless CD */
  public readonly queryValue = toSignal(this.searchForm.get('query')!.valueChanges.pipe(startWith('')), { initialValue: '' });

  /** Tracks form validity as a signal for use in computed() */
  private readonly formValid = toSignal(
    this.configForm.statusChanges.pipe(
      startWith(this.configForm.status),
      map((s) => s === 'VALID')
    ),
    {
      initialValue: this.configForm.valid,
    }
  );

  /** True when the "Add to Group" submit button should be available */
  public readonly canSubmit = computed(() => this.mode() === 'configure' && !!this.selectedUser() && this.formValid());

  /** Whether this committee has an associated mailing list to subscribe to */
  public readonly hasMailingList = computed(() => !!this.committee?.mailing_list);

  /** Whether org fields are required (business email or voting enabled committees) */
  public readonly requiresOrg = computed(() => !!(this.committee?.business_email_required || this.committee?.enable_voting));

  // ── Options ───────────────────────────────────────────────────────────────
  public readonly roleOptions = MEMBER_ROLES;
  public readonly votingStatusOptions = VOTING_STATUSES;

  // ── Public methods ────────────────────────────────────────────────────────

  /** Select a user from the search results and advance to the configure step. */
  public selectUser(user: UserSearchResult & { alreadyMember: boolean }): void {
    if (user.alreadyMember) return;
    this.selectedUser.set(user);
    // Pre-populate org fields from the search result
    this.configForm.patchValue({
      org_name: user.organization?.name ?? '',
      org_domain: user.organization?.website ?? '',
    });
    this.mode.set('configure');
  }

  /** Clear the selected user and return to search mode. */
  public clearSelection(): void {
    this.selectedUser.set(null);
    this.configForm.patchValue({ org_name: '', org_domain: '' });
    this.mode.set('search');
  }

  /**
   * Close this dialog with the sentinel 'manual'.
   * CommitteeMembersComponent will catch this and open MemberFormComponent.
   */
  public showManualForm(): void {
    this.dialogRef.close('manual');
  }

  public onCancel(): void {
    this.dialogRef.close(false);
  }

  public onSubmit(): void {
    this.submitAddMember();
  }

  // ── Private methods ───────────────────────────────────────────────────────

  private submitAddMember(): void {
    const user = this.selectedUser();
    const committee = this.committee;
    if (!user || !committee || !committee.uid) return;

    this.submitting.set(true);

    const formValue = this.configForm.getRawValue();
    const memberData: CreateCommitteeMemberRequest = {
      email: user.email,
      username: user.username ?? null,
      first_name: user.first_name ?? null,
      last_name: user.last_name ?? null,
      job_title: user.job_title ?? null,
      organization: formValue.org_name || formValue.org_domain ? { name: formValue.org_name || null, website: formValue.org_domain || null } : null,
      role: formValue.role ? { name: formValue.role as CommitteeMemberRole, start_date: null, end_date: null } : null,
      voting: formValue.voting_status ? { status: formValue.voting_status as CommitteeMemberVotingStatus, start_date: null, end_date: null } : null,
    };

    this.committeeService.createCommitteeMember(committee.uid, memberData).subscribe({
      next: () => {
        // Best-effort mailing list subscription (non-blocking — failure is silently swallowed)
        const mailingListUid = committee.mailing_list;
        if (formValue.subscribe_mailing_list && mailingListUid) {
          this.mailingListService
            .createMember(mailingListUid, {
              email: user.email,
              username: user.username ?? null,
              first_name: user.first_name ?? null,
              last_name: user.last_name ?? null,
              organization: (formValue.org_name || user.organization?.name) ?? null,
              job_title: user.job_title ?? null,
            })
            .pipe(
              catchError(() => {
                this.messageService.add({
                  severity: 'warn',
                  summary: 'Mailing List',
                  detail: 'Member added, but mailing list subscription failed. They can subscribe manually.',
                  life: 5000,
                });
                return of(null);
              })
            )
            .subscribe();
        }

        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Member Added',
          detail: `${`${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() || user.email} has been added to the group.`,
        });
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        const detail =
          err.status === 409 ? 'This person is already a member of this group.' : getHttpErrorDetail(err, 'Failed to add member. Please try again.');
        this.messageService.add({ severity: 'error', summary: 'Unable to Add Member', detail });
      },
    });
  }

  // ── Private initializer functions ─────────────────────────────────────────

  private initSearchResults(): Signal<(UserSearchResult & { alreadyMember: boolean })[]> {
    const queryControl = this.searchForm.get('query')!;

    const rawResults = toSignal(
      queryControl.valueChanges.pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          // Clear results immediately when query drops below threshold
          if (typeof q !== 'string' || q.trim().length < 2) {
            this.searchLoading.set(false);
            return of([] as UserSearchResult[]);
          }
          this.searchLoading.set(true);
          return this.searchService.searchUsers(q.trim(), 'committee_member').pipe(
            tap(() => this.searchLoading.set(false)),
            catchError(() => {
              this.searchLoading.set(false);
              this.messageService.add({
                severity: 'warn',
                summary: 'Search Unavailable',
                detail: 'Could not reach the user search service. Please try again.',
                life: 4000,
              });
              return of([] as UserSearchResult[]);
            })
          );
        })
      ),
      { initialValue: [] as UserSearchResult[] }
    );

    return computed(() => {
      const seen = new Set<string>();
      return rawResults()
        .filter((r) => {
          const key = (r.email ?? '').toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((r) => ({ ...r, alreadyMember: this.existingEmails.has((r.email ?? '').toLowerCase()) }));
    });
  }
}
