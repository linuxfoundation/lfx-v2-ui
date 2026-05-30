// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, signal, WritableSignal } from '@angular/core';
import { parseTranscriptVtt, TranscriptCue } from '@lfx-one/shared';
import { MeetingService } from '@services/meeting.service';
import { DynamicDialogConfig } from 'primeng/dynamicdialog';
import { catchError, of, take } from 'rxjs';

@Component({
  selector: 'lfx-transcript-modal',
  imports: [],
  templateUrl: './transcript-modal.component.html',
})
export class TranscriptModalComponent {
  // Injected services
  private readonly dialogConfig = inject(DynamicDialogConfig);
  private readonly meetingService = inject(MeetingService);

  // Inputs from dialog config
  private readonly pastMeetingUid = this.dialogConfig.data.pastMeetingUid as string;
  public readonly meetingTitle = this.dialogConfig.data.meetingTitle as string;

  // State — the transcript file (WebVTT) is fetched on open and parsed into cues
  public readonly loading: WritableSignal<boolean> = signal(true);
  public readonly cues: WritableSignal<TranscriptCue[]> = signal([]);

  public constructor() {
    this.meetingService
      .getPastMeetingTranscriptContent(this.pastMeetingUid)
      .pipe(
        take(1),
        catchError(() => of({ content: '' }))
      )
      .subscribe((result) => {
        this.cues.set(parseTranscriptVtt(result?.content));
        this.loading.set(false);
      });
  }
}
