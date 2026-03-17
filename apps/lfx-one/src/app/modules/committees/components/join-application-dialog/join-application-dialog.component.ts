// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { Committee, GroupJoinApplicationRequest } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-join-application-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, TextareaComponent],
  templateUrl: './join-application-dialog.component.html',
})
export class JoinApplicationDialogComponent {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  public readonly committee: Committee | undefined = this.config.data?.committee;
  public submitting = signal<boolean>(false);

  public form = new FormGroup({
    reason: new FormControl('', [
      JoinApplicationDialogComponent.trimmedRequired,
      JoinApplicationDialogComponent.trimmedMinLength(10),
      Validators.maxLength(500),
    ]),
  });

  public get reasonLength(): number {
    return this.form.value.reason?.length || 0;
  }

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

    const payload: GroupJoinApplicationRequest = {
      reason: this.form.value.reason?.trim() || undefined,
    };

    this.committeeService.applyToJoin(this.committee.uid, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Application Submitted',
          detail: `Your request to join "${this.committee?.name}" has been submitted for review.`,
        });
        this.dialogRef.close(true);
      },
      error: () => {
        this.submitting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to submit your application. Please try again.',
        });
      },
    });
  }

  private static trimmedRequired(control: AbstractControl): ValidationErrors | null {
    const value = (control.value ?? '').toString().trim();
    return value.length === 0 ? { required: true } : null;
  }

  private static trimmedMinLength(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const trimmed = (control.value as string)?.trim() ?? '';
      return trimmed.length >= min ? null : { minlength: { requiredLength: min, actualLength: trimmed.length } };
    };
  }
}
