// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { Committee } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

export interface EditChannelsDialogResult {
  mailing_list?: string | null;
  chat_channel?: string | null;
}

@Component({
  selector: 'lfx-edit-channels-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, InputTextComponent, SelectComponent],
  templateUrl: './edit-channels-dialog.component.html',
})
export class EditChannelsDialogComponent {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  public readonly committee: Committee;

  public form: FormGroup;
  public submitting = signal(false);

  public readonly platformOptions = [
    { label: 'Slack', value: 'slack' },
    { label: 'Discord', value: 'discord' },
  ];

  public constructor() {
    this.committee = this.config.data?.committee;

    this.form = new FormGroup({
      mailingListName: new FormControl(this.committee?.mailing_list ?? ''),
      mailingListUrl: new FormControl(''),
      chatChannelPlatform: new FormControl<string>('slack'),
      chatChannelName: new FormControl(this.committee?.chat_channel ?? ''),
      chatChannelUrl: new FormControl(''),
    });
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSubmit(): void {
    if (!this.committee?.uid) return;

    this.submitting.set(true);

    const val = this.form.value;

    const mailingList: string | undefined = val.mailingListName ? val.mailingListName : undefined;

    const chatChannel: string | undefined = val.chatChannelName ? val.chatChannelUrl || val.chatChannelName : undefined;

    const payload: Partial<Committee> = {
      mailing_list: mailingList,
      chat_channel: chatChannel,
    };

    this.committeeService.updateCommittee(this.committee.uid, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Channels updated successfully',
        });
        const result: EditChannelsDialogResult = {
          mailing_list: mailingList || null,
          chat_channel: chatChannel || null,
        };
        this.dialogRef.close(result);
      },
      error: () => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update channels',
        });
      },
    });
  }
}
