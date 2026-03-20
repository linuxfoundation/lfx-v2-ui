// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { JoinModeLabelPipe } from '@pipes/join-mode-label.pipe';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

@Component({
  selector: 'lfx-committee-about',
  imports: [CardComponent, TagComponent, DatePipe, JoinModeLabelPipe, FormsModule, ButtonComponent],
  templateUrl: './committee-about.component.html',
  styleUrl: './committee-about.component.scss',
})
export class CommitteeAboutComponent {
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  // Inputs
  public committee = input.required<Committee>();
  public canEdit = input<boolean>(false);

  // Outputs
  public readonly committeeUpdated = output<void>();

  // Description edit state
  public editingDescription = signal(false);
  public editDescription = signal('');
  public saving = signal(false);

  // Charter edit state (UI-ready, no backend field yet)
  public editingCharter = signal(false);
  public editCharter = signal('');

  public startEditDescription(): void {
    this.editDescription.set(this.committee().description || '');
    this.editingDescription.set(true);
  }

  public cancelEditDescription(): void {
    this.editingDescription.set(false);
  }

  public startEditCharter(): void {
    this.editCharter.set('');
    this.editingCharter.set(true);
  }

  public cancelEditCharter(): void {
    this.editingCharter.set(false);
  }

  public saveDescription(): void {
    this.saving.set(true);
    this.committeeService
      .updateCommittee(this.committee().uid, { description: this.editDescription() })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Description updated' });
          this.editingDescription.set(false);
          this.saving.set(false);
          this.committeeUpdated.emit();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update description' });
          this.saving.set(false);
        },
      });
  }
}
