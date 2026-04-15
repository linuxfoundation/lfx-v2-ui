// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImpersonationService } from '@services/impersonation.service';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { take } from 'rxjs';

@Component({
  selector: 'lfx-impersonation-dialog',
  imports: [ReactiveFormsModule],
  templateUrl: './impersonation-dialog.component.html',
})
export class ImpersonationDialogComponent {
  private readonly impersonationService = inject(ImpersonationService);
  private readonly dialogRef = inject(DynamicDialogRef);

  public targetUserControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  public loading = signal(false);
  public error = signal('');

  public submit(): void {
    const target = this.targetUserControl.value.trim();
    if (!target) return;

    this.loading.set(true);
    this.error.set('');
    this.targetUserControl.disable();

    this.impersonationService
      .startImpersonation(target)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
          window.location.reload();
        },
        error: (err) => {
          this.loading.set(false);
          this.targetUserControl.enable();
          this.error.set(err.error?.error || 'Failed to start impersonation');
        },
      });
  }

  public cancel(): void {
    this.dialogRef.close(false);
  }
}
