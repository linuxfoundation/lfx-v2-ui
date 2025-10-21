// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, Signal, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ButtonComponent } from '@components/button/button.component';
import { MeetingService } from '@services/meeting.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { take } from 'rxjs';

@Component({
  selector: 'lfx-summary-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent, FormsModule],
  templateUrl: './summary-modal.component.html',
})
export class SummaryModalComponent {
  // Injected services
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);

  // Inputs from dialog config
  private readonly summaryUid = this.config.data.summaryUid as string;
  private readonly pastMeetingUid = this.config.data.pastMeetingUid as string;
  public readonly meetingTitle = this.config.data.meetingTitle as string;

  // Edit mode state
  public readonly isEditMode: WritableSignal<boolean> = signal(false);
  public readonly originalContent: WritableSignal<string> = signal(this.config.data.summaryContent as string);
  public readonly editedContent: WritableSignal<string> = signal(this.config.data.summaryContent as string);
  public readonly isSaving: WritableSignal<boolean> = signal(false);
  public readonly isApproving: WritableSignal<boolean> = signal(false);
  public readonly isApproved: WritableSignal<boolean> = signal(this.config.data.approved as boolean);
  private readonly wasUpdated: WritableSignal<boolean> = signal(false);

  // Sanitized HTML content for display
  public readonly summaryContent: Signal<SafeHtml> = computed(() => {
    const content = this.isEditMode() ? this.editedContent() : this.originalContent();
    return this.sanitizer.bypassSecurityTrustHtml(content || '');
  });

  // Public methods
  public enterEditMode(): void {
    this.editedContent.set(this.originalContent() || '');
    this.isEditMode.set(true);
  }

  public cancelEdit(): void {
    this.editedContent.set(this.originalContent() || '');
    this.isEditMode.set(false);
  }

  public saveEdit(): void {
    this.isSaving.set(true);

    this.meetingService
      .updatePastMeetingSummary(this.pastMeetingUid, this.summaryUid, { edited_content: this.editedContent() })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Summary updated successfully',
          });
          // Update the original content with the saved changes
          this.originalContent.set(this.editedContent());
          this.wasUpdated.set(true);
          this.isSaving.set(false);
          this.isEditMode.set(false);
          // Keep modal open to show updated content
        },
        error: (error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update summary',
          });
          this.isSaving.set(false);
          console.error('Failed to update summary:', error);
        },
      });
  }

  public approve(): void {
    this.isApproving.set(true);

    this.meetingService
      .approvePastMeetingSummary(this.pastMeetingUid, this.summaryUid)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Summary approved successfully',
          });
          this.isApproved.set(true);
          this.wasUpdated.set(true);
          this.isApproving.set(false);
        },
        error: (error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to approve summary',
          });
          this.isApproving.set(false);
          console.error('Failed to approve summary:', error);
        },
      });
  }

  public onClose(): void {
    // Return updated content if changes were saved
    if (this.wasUpdated()) {
      this.ref.close({ updated: true, content: this.originalContent(), approved: this.isApproved() });
    } else {
      this.ref.close();
    }
  }
}
