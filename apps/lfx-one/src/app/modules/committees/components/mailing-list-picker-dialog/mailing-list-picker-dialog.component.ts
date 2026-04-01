// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { RadioButtonComponent } from '@components/radio-button/radio-button.component';
import { TagComponent } from '@components/tag/tag.component';
import { GroupsIOMailingList } from '@lfx-one/shared/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

import { AudienceAccessPipe } from '../committee-settings-tab/pipes/audience-access.pipe';
import { MailingListEmailPipe } from '../committee-settings-tab/pipes/mailing-list-email.pipe';

export interface MailingListPickerDialogData {
  mailingLists: GroupsIOMailingList[];
  selectedUid: string | null;
  loading: boolean;
}

export interface MailingListPickerDialogResult {
  selectedUid: string | null;
}

@Component({
  selector: 'lfx-mailing-list-picker-dialog',
  imports: [ButtonComponent, InputTextComponent, RadioButtonComponent, ReactiveFormsModule, TagComponent, AudienceAccessPipe, MailingListEmailPipe],
  templateUrl: './mailing-list-picker-dialog.component.html',
})
export class MailingListPickerDialogComponent {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);

  public readonly mailingLists: GroupsIOMailingList[] = this.config.data.mailingLists;
  public readonly loading: boolean = this.config.data.loading;

  public selectedMailingListUid = signal<string | null>(this.config.data.selectedUid);
  public searchQuery = signal('');

  public searchForm = new FormGroup({
    query: new FormControl(''),
  });

  public filteredMailingLists = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const lists = this.mailingLists.filter((ml) => !!ml.service?.domain);
    if (!query) return lists;
    return lists.filter((ml) => ml.group_name.toLowerCase().includes(query) || ml.title?.toLowerCase().includes(query));
  });

  public constructor() {
    this.searchForm.get('query')!.valueChanges.subscribe((val) => {
      this.searchQuery.set(val ?? '');
    });
  }

  public selectMailingList(uid: string): void {
    this.selectedMailingListUid.set(uid);
  }

  public clearAssociation(): void {
    this.selectedMailingListUid.set(null);
  }

  public save(): void {
    this.dialogRef.close({ selectedUid: this.selectedMailingListUid() } as MailingListPickerDialogResult);
  }

  public cancel(): void {
    this.dialogRef.close(null);
  }
}
