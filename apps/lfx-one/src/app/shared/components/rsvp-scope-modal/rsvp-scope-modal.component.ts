// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, inject, signal, WritableSignal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { RsvpScope } from '@lfx-one/shared/interfaces';
import { DynamicDialogRef } from 'primeng/dynamicdialog';

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

  public selectedScope: WritableSignal<RsvpScope | null> = signal(null);

  public readonly scopeOptions: ScopeOption[] = [
    {
      value: 'this',
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
