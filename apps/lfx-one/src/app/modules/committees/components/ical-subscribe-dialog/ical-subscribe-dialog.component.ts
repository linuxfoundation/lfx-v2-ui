// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-ical-subscribe-dialog',
  imports: [ButtonComponent],
  templateUrl: './ical-subscribe-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IcalSubscribeDialogComponent {
  private readonly clipboard = inject(Clipboard);
  private readonly messageService = inject(MessageService);
  private readonly dialogConfig = inject(DynamicDialogConfig);

  public readonly feedUrl = this.dialogConfig.data.feedUrl as string;
  public readonly committeeName = this.dialogConfig.data.committeeName as string;
  public copied = signal(false);

  public get googleCalendarUrl(): string {
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(this.feedUrl.replace('https://', 'webcal://'))}`;
  }

  public get outlookUrl(): string {
    return `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(this.feedUrl)}&name=${encodeURIComponent(this.committeeName)}`;
  }

  public get webcalUrl(): string {
    return this.feedUrl.replace('https://', 'webcal://');
  }

  public copyFeedUrl(): void {
    const success = this.clipboard.copy(this.feedUrl);
    if (success) {
      this.copied.set(true);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Calendar feed URL copied to clipboard',
      });
      setTimeout(() => this.copied.set(false), 2000);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy URL to clipboard',
      });
    }
  }
}
