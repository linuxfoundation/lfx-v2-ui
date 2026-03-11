// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { MessageComponent } from '@components/message/message.component';
import { SelectComponent } from '@components/select/select.component';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import { CreateCommitteeMemberRequest, GroupsIOMailingList, MailingListMember } from '@lfx-one/shared/interfaces';
import { MailingListService } from '@services/mailing-list.service';
import { catchError, finalize, of, take } from 'rxjs';

const MAX_IMPORT_LIMIT = 200;

@Component({
  selector: 'lfx-mailing-list-import',
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, MessageComponent, SelectComponent],
  templateUrl: './mailing-list-import.component.html',
})
export class MailingListImportComponent {
  private readonly mailingListService = inject(MailingListService);

  // Inputs
  public readonly committeeId = input.required<string | null>();
  public readonly projectUid = input<string | null>(null);

  // Output — emits mapped members ready for import
  public readonly membersToImport = output<CreateCommitteeMemberRequest[]>();

  // UI labels
  public readonly committeeLabel = COMMITTEE_LABEL.singular;

  // State signals
  public readonly mailingLists = signal<GroupsIOMailingList[]>([]);
  public readonly mailingListMembers = signal<MailingListMember[]>([]);
  public readonly loadingLists = signal(false);
  public readonly loadingMembers = signal(false);
  public readonly selectedListUid = signal<string | null>(null);

  // Computed signals
  public readonly mailingListOptions = this.initMailingListOptions();
  public readonly isOverLimit = computed(() => this.mailingListMembers().length > MAX_IMPORT_LIMIT);
  public readonly memberCount = computed(() => this.mailingListMembers().length);
  public readonly maxImportLimit = MAX_IMPORT_LIMIT;

  // Form
  public readonly listForm = new FormGroup({
    mailingList: new FormControl<string | null>(null),
  });

  public constructor() {
    effect(() => {
      const uid = this.projectUid();
      if (uid) {
        this.loadMailingLists();
      }
    });
  }

  public onListSelected(): void {
    const uid = this.listForm.get('mailingList')?.value;
    if (!uid) {
      this.mailingListMembers.set([]);
      this.selectedListUid.set(null);
      return;
    }

    this.selectedListUid.set(uid);
    this.loadMembers(uid);
  }

  public onImport(): void {
    const members = this.mailingListMembers();
    if (members.length === 0 || this.isOverLimit()) return;

    const mapped: CreateCommitteeMemberRequest[] = members.map((m) => ({
      email: m.email,
      first_name: m.first_name || null,
      last_name: m.last_name || null,
      job_title: m.job_title || null,
      organization: m.organization ? { name: m.organization, website: null } : null,
      role: null,
      voting: null,
      appointed_by: null,
    }));

    this.membersToImport.emit(mapped);
  }

  private loadMailingLists(): void {
    const projectUid = this.projectUid();
    if (!projectUid) return;

    this.loadingLists.set(true);
    this.mailingListService
      .getMailingListsByProject(projectUid)
      .pipe(
        take(1),
        catchError(() => of([])),
        finalize(() => this.loadingLists.set(false))
      )
      .subscribe((lists) => {
        this.mailingLists.set(lists);
      });
  }

  private loadMembers(mailingListUid: string): void {
    this.loadingMembers.set(true);
    this.mailingListMembers.set([]);

    this.mailingListService
      .getMembers(mailingListUid)
      .pipe(
        take(1),
        catchError(() => of([])),
        finalize(() => this.loadingMembers.set(false))
      )
      .subscribe((members) => {
        this.mailingListMembers.set(members);
      });
  }

  private initMailingListOptions() {
    return computed(() =>
      this.mailingLists().map((list) => ({
        label: `${list.title || list.group_name} (${list.subscriber_count} subscribers)`,
        value: list.uid,
      }))
    );
  }
}
