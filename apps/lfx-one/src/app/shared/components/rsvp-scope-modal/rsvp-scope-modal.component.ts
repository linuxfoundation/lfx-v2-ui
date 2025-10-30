// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { Meeting, MeetingOccurrence, RsvpScope } from '@lfx-one/shared/interfaces';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

interface ScopeOption {
  value: RsvpScope;
  label: string;
  description: string;
}

@Component({
  selector: 'lfx-rsvp-scope-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './rsvp-scope-modal.component.html',
})
export class RsvpScopeModalComponent {
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  public selectedScope: WritableSignal<RsvpScope | null> = signal(null);

  // Meeting data from config
  public readonly meeting: Meeting | undefined = this.config.data?.['meeting'];
  public readonly occurrence: MeetingOccurrence | undefined = this.config.data?.['occurrence'];

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

  public readonly scopeOptions: ScopeOption[] = [
    {
      value: 'single',
      label: 'This occurrence only',
      description: 'Apply this RSVP to only this specific meeting',
    },
    {
      value: 'all',
      label: 'All occurrences',
      description: 'Apply this RSVP to all occurrences in the series',
    },
    {
      value: 'following',
      label: 'This and following occurrences',
      description: 'Apply this RSVP to this meeting and all future occurrences',
    },
  ];

  public selectScope(scope: RsvpScope): void {
    this.selectedScope.set(scope);
  }

  public onConfirm(): void {
    const scope = this.selectedScope();
    if (scope) {
      this.ref.close(scope);
    }
  }

  public onCancel(): void {
    this.ref.close(null);
  }
}
