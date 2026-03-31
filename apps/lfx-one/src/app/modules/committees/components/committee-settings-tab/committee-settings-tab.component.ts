// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectorRef, Component, computed, effect, inject, input, output, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee, CommitteeReference, CreateMailingListRequest, GroupsIOMailingList, JoinMode } from '@lfx-one/shared/interfaces';
import { CommitteeMemberVisibility } from '@lfx-one/shared/enums';
import { CommitteeService } from '@services/committee.service';
import { MailingListService } from '@services/mailing-list.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { catchError, filter, finalize, forkJoin, map, merge, of, Subject, switchMap, tap } from 'rxjs';

import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';

import { CommitteeSettingsComponent } from '../committee-settings/committee-settings.component';

@Component({
  selector: 'lfx-committee-settings-tab',
  imports: [
    CommitteeSettingsComponent,
    ButtonComponent,
    InputTextComponent,
    CheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    TagComponent,
    ConfirmDialogModule,
    DialogModule,
  ],
  templateUrl: './committee-settings-tab.component.html',
  styleUrl: './committee-settings-tab.component.scss',
})
export class CommitteeSettingsTabComponent {
  private readonly committeeService = inject(CommitteeService);
  private readonly mailingListService = inject(MailingListService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  public readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  // Inputs
  public committee = input.required<Committee>();

  // Outputs
  public readonly committeeUpdated = output<void>();

  // State
  public saving = signal(false);
  public deleting = signal(false);

  // Mailing list picker state
  public mlPickerVisible = signal(false);
  public mlSearchQuery = signal('');
  public selectedMailingListUids = signal<Set<string>>(new Set());
  private originalSelectedUids = new Set<string>();
  public savingMl = signal(false);
  private mlLoadingInternal = signal(true);

  // Subject to trigger ML list refresh after association changes
  private refreshMl$ = new Subject<void>();

  // Search form for the mailing list picker — used by lfx-input-text
  public mlSearchForm = new FormGroup({
    query: new FormControl(''),
  });

  // Form
  public form = new FormGroup({
    member_visibility: new FormControl(''),
    join_mode: new FormControl(''),
    business_email_required: new FormControl(false),
    enable_voting: new FormControl(false),
    is_audit_enabled: new FormControl(false),
    public: new FormControl(false),
    sso_group_enabled: new FormControl(false),
    show_meeting_attendees: new FormControl(false),
    chat_channel: new FormControl<string | null>(null),
    website: new FormControl<string | null>(null),
  });

  // Project mailing lists (loaded when committee has a project_uid)
  public projectMailingLists: Signal<GroupsIOMailingList[]> = this.initProjectMailingLists();

  // Derived loading state: true until first emission from projectMailingLists
  public mlLoading = computed(() => this.mlLoadingInternal() && !!this.committee()?.project_uid);

  // Mailing lists associated with this committee (matched by committees[] array on ML side)
  public associatedMailingLists: Signal<GroupsIOMailingList[]> = computed(() => {
    const committeeUid = this.committee()?.uid;
    if (!committeeUid) return [];
    return this.projectMailingLists().filter((ml) => ml.committees?.some((c) => c.uid === committeeUid) ?? false);
  });

  // Filtered mailing lists for picker — only lists with a service domain can be associated
  // (the backend requires a valid email: group_name@service.domain)
  public filteredMailingLists: Signal<GroupsIOMailingList[]> = computed(() => {
    const query = this.mlSearchQuery().toLowerCase().trim();
    const lists = this.projectMailingLists().filter((ml) => !!ml.service?.domain);
    if (!query) return lists;
    return lists.filter((ml) => ml.group_name.toLowerCase().includes(query) || ml.title?.toLowerCase().includes(query));
  });

  // Count of currently selected MLs in the picker
  public selectedCount = computed(() => this.selectedMailingListUids().size);

  public constructor() {
    effect(() => {
      const c = this.committee();
      if (c) {
        this.form.patchValue({
          member_visibility: c.member_visibility || 'hidden',
          join_mode: c.join_mode || 'invite_only',
          business_email_required: c.business_email_required || false,
          enable_voting: c.enable_voting || false,
          is_audit_enabled: c.is_audit_enabled || false,
          public: c.public || false,
          sso_group_enabled: c.sso_group_enabled || false,
          show_meeting_attendees: c.show_meeting_attendees || false,
          chat_channel: c.chat_channel ?? null,
          website: c.website ?? null,
        });
      }
    });

    // Keep mlSearchQuery signal in sync with the form control value
    this.mlSearchForm.get('query')!.valueChanges.subscribe((val) => {
      this.mlSearchQuery.set(val ?? '');
    });
  }

  public openMailingListPicker(): void {
    const associatedUids = new Set(this.associatedMailingLists().map((ml) => ml.uid));
    this.selectedMailingListUids.set(new Set(associatedUids));
    this.originalSelectedUids = new Set(associatedUids);
    this.mlSearchQuery.set('');
    this.mlSearchForm.reset({ query: '' });
    this.mlPickerVisible.set(true);
  }

  public toggleMailingList(uid: string): void {
    const current = new Set(this.selectedMailingListUids());
    if (current.has(uid)) {
      current.delete(uid);
    } else {
      current.add(uid);
    }
    this.selectedMailingListUids.set(current);
  }

  public isMailingListSelected(uid: string): boolean {
    return this.selectedMailingListUids().has(uid);
  }

  public saveMailingListAssociation(): void {
    const committee = this.committee();
    if (!committee?.uid) return;

    const currentSelection = this.selectedMailingListUids();
    const added = [...currentSelection].filter((uid) => !this.originalSelectedUids.has(uid));
    const removed = [...this.originalSelectedUids].filter((uid) => !currentSelection.has(uid));

    if (added.length === 0 && removed.length === 0) {
      this.mlPickerVisible.set(false);
      return;
    }

    this.savingMl.set(true);
    const committeeRef: CommitteeReference = { uid: committee.uid, name: committee.name };
    const updates$ = [];

    // Add committee to newly selected MLs
    for (const uid of added) {
      const ml = this.projectMailingLists().find((m) => m.uid === uid);
      if (ml) {
        const existingCommittees = ml.committees || [];
        updates$.push(this.mailingListService.updateMailingList(uid, this.buildMlUpdatePayload(ml, [...existingCommittees, committeeRef])));
      }
    }

    // Remove committee from deselected MLs
    for (const uid of removed) {
      const ml = this.projectMailingLists().find((m) => m.uid === uid);
      if (ml) {
        const updatedCommittees = (ml.committees || []).filter((c) => c.uid !== committee.uid);
        updates$.push(this.mailingListService.updateMailingList(uid, this.buildMlUpdatePayload(ml, updatedCommittees)));
      }
    }

    forkJoin(updates$)
      .pipe(finalize(() => this.savingMl.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Mailing list associations updated' });
          this.mlPickerVisible.set(false);
          this.refreshMl$.next();
        },
        error: (err: any) => {
          const detail = this.getMlErrorDetail(err, 'Failed to update mailing list associations');
          this.messageService.add({ severity: 'error', summary: 'Error', detail });
        },
      });
  }

  public removeMailingList(ml: GroupsIOMailingList): void {
    const committee = this.committee();
    if (!committee?.uid) return;

    const updatedCommittees = (ml.committees || []).filter((c) => c.uid !== committee.uid);

    this.mailingListService.updateMailingList(ml.uid, this.buildMlUpdatePayload(ml, updatedCommittees)).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Removed', detail: `${ml.group_name} removed from this group` });
        this.refreshMl$.next();
      },
      error: (err: any) => {
        const detail = this.getMlErrorDetail(err, `Failed to remove ${ml.group_name}`);
        this.messageService.add({ severity: 'error', summary: 'Error', detail });
      },
    });
  }

  public confirmDelete(): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to permanently delete "${this.committee().name}"? This will remove all associated meetings, votes, surveys, and member records. This action cannot be undone.`,
      header: 'Delete Group',
      icon: 'fa-light fa-triangle-exclamation',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-outlined p-button-sm',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      accept: () => {
        this.deleting.set(true);
        this.committeeService
          .deleteCommittee(this.committee().uid)
          .pipe(finalize(() => this.deleting.set(false)))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${this.committee().name}" has been deleted` });
              this.router.navigate(['/groups']);
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete group' });
            },
          });
      },
    });
  }

  public saveSettings(): void {
    this.saving.set(true);
    const values = this.form.getRawValue();
    this.committeeService
      .updateCommittee(this.committee().uid, {
        member_visibility: (values.member_visibility as CommitteeMemberVisibility) || undefined,
        join_mode: (values.join_mode as JoinMode) || undefined,
        business_email_required: values.business_email_required ?? false,
        enable_voting: values.enable_voting ?? false,
        is_audit_enabled: values.is_audit_enabled ?? false,
        public: values.public ?? false,
        sso_group_enabled: values.sso_group_enabled ?? false,
        show_meeting_attendees: values.show_meeting_attendees ?? false,
        chat_channel: values.chat_channel || null,
        website: values.website || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Settings saved' });
          this.committeeUpdated.emit();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save settings' });
        },
      });
  }

  public getMailingListEmail(ml: GroupsIOMailingList): string {
    if (ml.service?.domain) {
      return `${ml.group_name}@${ml.service.domain}`;
    }
    return ml.group_name;
  }

  public formatMailingListType(type: string): string {
    switch (type) {
      case 'discussion_open':
        return 'Discussion Open';
      case 'announcement':
        return 'Announcement';
      case 'discussion_moderated':
        return 'Moderated';
      default:
        return type;
    }
  }

  // -- Helpers --

  private getMlErrorDetail(err: any, fallback: string): string {
    const body = err?.error;
    if (body?.error?.includes?.('subgroup not found') || body?.code === 'NOT_FOUND') {
      return 'Mailing list sync failed — the Groups.io subgroup may not exist for this list';
    }
    return fallback;
  }

  private buildMlUpdatePayload(ml: GroupsIOMailingList, committees: CommitteeReference[]): Partial<CreateMailingListRequest> {
    return {
      group_name: ml.group_name,
      public: ml.public,
      type: ml.type,
      audience_access: ml.audience_access,
      description: ml.description,
      title: ml.title,
      service_uid: ml.service_uid,
      committees,
      subject_tag: ml.subject_tag,
      writers: ml.writers,
      auditors: ml.auditors,
    };
  }

  private initProjectMailingLists(): Signal<GroupsIOMailingList[]> {
    const committee$ = toObservable(this.committee);
    const refresh$ = this.refreshMl$.pipe(map(() => this.committee()));

    return toSignal(
      merge(committee$, refresh$).pipe(
        filter((c) => !!c?.project_uid),
        switchMap((c) => {
          this.mlLoadingInternal.set(true);
          return this.mailingListService.getMailingListsByProject(c!.project_uid!).pipe(
            tap(() => {
              this.mlLoadingInternal.set(false);
              this.cdr.markForCheck();
            }),
            catchError(() => {
              this.mlLoadingInternal.set(false);
              this.cdr.markForCheck();
              return of([] as GroupsIOMailingList[]);
            })
          );
        })
      ),
      { initialValue: [] as GroupsIOMailingList[] }
    );
  }
}
