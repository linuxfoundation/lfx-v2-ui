// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { RSVP_SCOPE_OPTIONS } from '@lfx-one/shared/constants';
import { Meeting, MeetingOccurrence, RsvpScope, RsvpScopeOption } from '@lfx-one/shared/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-rsvp-scope-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './rsvp-scope-modal.component.html',
})
export class RsvpScopeModalComponent {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly dialogConfig = inject(DynamicDialogConfig);

  public selectedScope: WritableSignal<RsvpScope | null> = signal(null);

  // Meeting data from config
  public readonly meeting: Meeting | undefined = this.dialogConfig.data?.['meeting'];
  public readonly occurrence: MeetingOccurrence | undefined = this.dialogConfig.data?.['occurrence'];

  // Computed meeting title and time
  public readonly meetingTitle = computed(() => {
    return this.occurrence?.title || this.meeting?.title || 'Meeting';
  });

  public readonly meetingTime = computed(() => {
    const startTime = this.occurrence?.start_time || this.meeting?.start_time;
    if (!startTime) return '';

    try {
      const date = new Date(startTime);
      return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return startTime;
    }
  });

  public readonly scopeOptions: RsvpScopeOption[] = RSVP_SCOPE_OPTIONS;

  public selectScope(scope: RsvpScope): void {
    this.selectedScope.set(scope);
  }

  public onConfirm(): void {
    const scope = this.selectedScope();
    if (scope) {
      this.dialogRef.close(scope);
    }
  }

  public onCancel(): void {
    this.dialogRef.close(null);
  }
}
