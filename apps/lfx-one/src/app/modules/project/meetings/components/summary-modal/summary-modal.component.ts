// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ButtonComponent } from '@components/button/button.component';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-summary-modal',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './summary-modal.component.html',
})
export class SummaryModalComponent {
  // Injected services
  private readonly ref = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly sanitizer = inject(DomSanitizer);

  // Inputs from dialog config
  private readonly rawContent = this.config.data.summaryContent as string;
  public readonly meetingTitle = this.config.data.meetingTitle as string;

  // Sanitized HTML content
  public readonly summaryContent: Signal<SafeHtml> = computed(() => {
    return this.sanitizer.bypassSecurityTrustHtml(this.rawContent || '');
  });

  // Public methods
  public onClose(): void {
    this.ref.close();
  }
}
