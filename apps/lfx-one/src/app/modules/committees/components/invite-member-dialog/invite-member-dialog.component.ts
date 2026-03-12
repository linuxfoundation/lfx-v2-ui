// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { Committee, CreateGroupInviteRequest } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-invite-member-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, TextareaComponent],
  templateUrl: './invite-member-dialog.component.html',
})
export class InviteMemberDialogComponent {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  public readonly committee: Committee | undefined = this.config.data?.committee;
  public submitting = signal<boolean>(false);

  public form = new FormGroup({
    emails: new FormControl('', [Validators.required]),
    message: new FormControl(''),
  });

  public onCancel(): void {
    this.dialogRef.close();
  }

  public onSubmit(): void {
    if (!this.form.valid || !this.committee) {
      Object.keys(this.form.controls).forEach((key) => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting.set(true);

    const rawEmails = this.form.value.emails || '';
    // Split by comma, semicolon, newline, or space — then trim and de-dup
    const emails = [
      ...new Set(
        rawEmails
          .split(/[,;\n\s]+/)
          .map((e: string) => e.trim().toLowerCase())
          .filter((e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];

    if (emails.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No valid emails',
        detail: 'Please enter at least one valid email address.',
      });
      this.submitting.set(false);
      return;
    }

    const payload: CreateGroupInviteRequest = {
      emails,
      message: this.form.value.message || undefined,
    };

    this.committeeService.createInvites(this.committee.uid, payload).subscribe({
      next: (invites) => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Invites Sent',
          detail: `${invites.length} invite(s) sent successfully`,
        });
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to send invites. Please try again.',
        });
      },
    });
  }
}
