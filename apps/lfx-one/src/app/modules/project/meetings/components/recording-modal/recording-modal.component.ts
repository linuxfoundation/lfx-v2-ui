// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Clipboard } from '@angular/cdk/clipboard';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-recording-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './recording-modal.component.html',
})
export class RecordingModalComponent {
  // Injected services
  private readonly clipboard = inject(Clipboard);
  private readonly messageService = inject(MessageService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);

  // Inputs from dialog config
  public readonly shareUrl = this.config.data.shareUrl as string;
  public readonly meetingTitle = this.config.data.meetingTitle as string;

  // Public methods
  public copyShareUrl(): void {
    const success = this.clipboard.copy(this.shareUrl);

    if (success) {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Recording URL copied to clipboard',
      });
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy recording URL',
      });
    }
  }

  public openRecording(): void {
    window.open(this.shareUrl, '_blank', 'noopener,noreferrer');
  }

  public onClose(): void {
    this.ref.close();
  }
}
