// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { Committee } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { JoinModeLabelPipe } from '@pipes/join-mode-label.pipe';
import { MessageService } from 'primeng/api';
import { take } from 'rxjs';

@Component({
  selector: 'lfx-committee-about',
  imports: [CardComponent, TagComponent, DatePipe, JoinModeLabelPipe, ReactiveFormsModule, ButtonComponent, TextareaComponent],
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
  public saving = signal(false);
  public descriptionForm = new FormGroup({
    description: new FormControl(''),
  });

  public startEditDescription(): void {
    this.descriptionForm.patchValue({ description: this.committee().description || '' });
    this.editingDescription.set(true);
  }

  public cancelEditDescription(): void {
    this.editingDescription.set(false);
  }

  public saveDescription(): void {
    this.saving.set(true);
    const description = this.descriptionForm.get('description')?.value || '';
    this.committeeService
      .updateCommittee(this.committee().uid, { description })
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
