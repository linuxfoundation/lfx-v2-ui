// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '@components/card/card.component';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { FileSizePipe } from '@pipes/file-size.pipe';
import {
  Committee,
  CommitteeDocumentItem,
  Meeting,
  MeetingAttachment,
  PastMeeting,
  PastMeetingAttachment,
  PastMeetingRecording,
  PastMeetingSummary,
  RecordingFile,
} from '@lfx-one/shared/interfaces';
import { MeetingService } from '@services/meeting.service';
import { RecordingModalComponent } from '@modules/meetings/components/recording-modal/recording-modal.component';
import { SummaryModalComponent } from '@modules/meetings/components/summary-modal/summary-modal.component';
import { MessageService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { Observable, catchError, debounceTime, distinctUntilChanged, filter, finalize, forkJoin, from, map, mergeMap, of, switchMap, toArray } from 'rxjs';

/** Max concurrent per-meeting fetches to avoid overwhelming the backend. */
const FETCH_CONCURRENCY = 4;

/** Recording type labels for human-readable display. */
const RECORDING_TYPE_LABELS: Record<string, string> = {
  shared_screen_with_speaker_view: 'Shared Screen with Speaker View',
  shared_screen_with_gallery_view: 'Shared Screen with Gallery View',
  speaker_view: 'Speaker View',
  gallery_view: 'Gallery View',
  shared_screen: 'Shared Screen',
  audio_only: 'Audio Only',
  audio_transcript: 'Audio Transcript',
  active_speaker: 'Active Speaker',
};

@Component({
  selector: 'lfx-committee-documents',
  imports: [CardComponent, ButtonComponent, InputTextComponent, SelectComponent, ReactiveFormsModule, TableComponent, TagComponent, FileSizePipe, DatePipe],
  providers: [DialogService],
  templateUrl: './committee-documents.component.html',
  styleUrl: './committee-documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommitteeDocumentsComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  public committee = input.required<Committee>();

  // State
  public loading = signal<boolean>(true);
  public searchQuery = signal('');
  public sourceFilter = signal<string | null>(null);

  // Form
  public searchForm = new FormGroup({
    search: new FormControl(''),
    source: new FormControl<string | null>(null),
  });

  public sourceOptions = [
    { label: 'Link', value: 'link' },
    { label: 'File', value: 'file' },
    { label: 'Recording', value: 'recording' },
    { label: 'Transcript', value: 'transcript' },
    { label: 'AI Summary', value: 'summary' },
  ];

  // Data — fetches documents from all committee meetings (upcoming + past) with bounded concurrency
  public allDocuments: Signal<CommitteeDocumentItem[]> = this.initDocuments();

  // Filtered by search and source
  public filteredDocuments: Signal<CommitteeDocumentItem[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const source = this.sourceFilter();
    let results = this.allDocuments();
    if (query) {
      results = results.filter((item) => item.name.toLowerCase().includes(query) || item.meetingTitle.toLowerCase().includes(query));
    }
    if (source) {
      results = results.filter((item) => item.source === source);
    }
    return results;
  });

  public ngOnInit(): void {
    this.searchForm.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchQuery.set(value ?? ''));

    this.searchForm.controls.source.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.sourceFilter.set(value));
  }

  /** Opens or downloads a document based on its source type. */
  public openDocument(item: CommitteeDocumentItem): void {
    switch (item.source) {
      case 'link':
        if (item.linkUrl) {
          this.openSafeUrl(item.linkUrl);
        }
        break;

      case 'file':
        if (item.attachmentUid) {
          const download$ = item.pastMeetingId
            ? this.meetingService.getPastMeetingAttachmentDownloadUrl(item.pastMeetingId, item.attachmentUid)
            : this.meetingService.getMeetingAttachmentDownloadUrl(item.meetingId, item.attachmentUid);
          download$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (response) => {
              if (response?.download_url) {
                this.openSafeUrl(response.download_url);
              }
            },
            error: () => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to get download link.' });
            },
          });
        }
        break;

      case 'recording':
        if (item.shareUrl) {
          this.dialogService.open(RecordingModalComponent, {
            header: 'Meeting Recording',
            width: '650px',
            modal: true,
            closable: true,
            dismissableMask: true,
            data: { shareUrl: item.shareUrl, meetingTitle: item.meetingTitle },
          });
        } else if (item.playUrl) {
          this.openSafeUrl(item.playUrl);
        }
        break;

      case 'transcript':
        if (item.downloadUrl) {
          this.openSafeUrl(item.downloadUrl);
        }
        break;

      case 'summary':
        if (item.summaryData && item.pastMeetingId) {
          this.dialogService.open(SummaryModalComponent, {
            header: 'Meeting Summary',
            width: '800px',
            modal: false,
            closable: false,
            dismissableMask: false,
            data: {
              summaryContent: item.summaryData.content,
              summaryUid: item.summaryData.uid,
              pastMeetingUid: item.pastMeetingId,
              meetingTitle: item.meetingTitle,
              approved: item.summaryData.approved,
            },
          });
        }
        break;
    }
  }

  /** Opens a URL only if it uses http: or https: protocol. */
  private openSafeUrl(rawUrl: string): void {
    try {
      const url = new URL(rawUrl);
      if (['http:', 'https:'].includes(url.protocol)) {
        window.open(rawUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Invalid URL — silently ignore
    }
  }

  // ---------------------------------------------------------------------------
  // Private initializers
  // ---------------------------------------------------------------------------

  // Fetches documents from both upcoming and past meetings in parallel.
  // Upcoming meetings contribute attachments only; past meetings also contribute recordings,
  // transcripts, and AI summaries.
  // Note: getMeetingsByCommittee/getPastMeetingsByCommittee return up to 100 meetings.
  // Committee meetings are typically < 20; full pagination deferred to Phase 2.
  private initDocuments(): Signal<CommitteeDocumentItem[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => {
          this.loading.set(true);

          return forkJoin({
            upcoming: this.meetingService.getMeetingsByCommittee(c.uid, 100).pipe(catchError(() => of([] as Meeting[]))),
            past: this.meetingService.getPastMeetingsByCommittee(c.uid, 100).pipe(catchError(() => of([] as PastMeeting[]))),
          }).pipe(
            switchMap(({ upcoming, past }) => {
              const upcomingDocs$ = upcoming.length
                ? from(upcoming).pipe(
                    mergeMap((meeting) => this.fetchUpcomingMeetingDocs(meeting), FETCH_CONCURRENCY),
                    toArray(),
                    map((arrays) => arrays.flat())
                  )
                : of([] as CommitteeDocumentItem[]);

              const pastDocs$ = past.length
                ? from(past).pipe(
                    mergeMap((meeting) => this.fetchPastMeetingDocs(meeting), FETCH_CONCURRENCY),
                    toArray(),
                    map((arrays) => arrays.flat())
                  )
                : of([] as CommitteeDocumentItem[]);

              return forkJoin([upcomingDocs$, pastDocs$]).pipe(map(([u, p]) => [...u, ...p].sort((a, b) => b.date.localeCompare(a.date))));
            }),
            catchError(() => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load documents. Please try again.' });
              return of([] as CommitteeDocumentItem[]);
            }),
            finalize(() => this.loading.set(false))
          );
        })
      ),
      { initialValue: [] }
    );
  }

  // ---------------------------------------------------------------------------
  // Per-meeting fetchers
  // ---------------------------------------------------------------------------

  private fetchUpcomingMeetingDocs(meeting: Meeting): Observable<CommitteeDocumentItem[]> {
    return this.meetingService.getMeetingAttachments(meeting.id).pipe(
      catchError(() => of([] as MeetingAttachment[])),
      map((attachments) => attachments.map((att) => this.mapAttachmentToDoc(att, meeting.title, meeting.start_time, meeting.id, null)))
    );
  }

  private fetchPastMeetingDocs(meeting: PastMeeting): Observable<CommitteeDocumentItem[]> {
    const title = meeting.title;
    const date = meeting.scheduled_start_time || meeting.start_time;
    const meetingId = meeting.meeting_id || meeting.id;
    const pastMeetingId = meeting.id;

    return forkJoin({
      attachments: this.meetingService.getPastMeetingAttachments(pastMeetingId).pipe(catchError(() => of(null as PastMeetingAttachment[] | null))),
      recording: this.meetingService.getPastMeetingRecording(pastMeetingId).pipe(catchError(() => of(null as PastMeetingRecording | null))),
      summary: this.meetingService.getPastMeetingSummary(pastMeetingId).pipe(catchError(() => of(null as PastMeetingSummary | null))),
    }).pipe(
      map(({ attachments, recording, summary }) => {
        const docs: CommitteeDocumentItem[] = [];

        // Attachments
        if (attachments) {
          for (const att of attachments) {
            docs.push(this.mapAttachmentToDoc(att, title, date, meetingId, pastMeetingId));
          }
        }

        // Recording files (MP4, M4A → recording; TRANSCRIPT → transcript; skip CHAT)
        if (recording?.recording_files) {
          const shareUrl = this.getLargestSessionShareUrl(recording);
          for (const file of recording.recording_files) {
            if (file.file_type === 'CHAT') continue;
            docs.push(this.mapRecordingFileToDoc(file, shareUrl, title, date, meetingId, pastMeetingId));
          }
        }

        // AI Summary
        if (summary?.summary_data) {
          const content = summary.summary_data.edited_content || summary.summary_data.content;
          if (content) {
            docs.push(this.mapSummaryToDoc(summary, title, date, meetingId, pastMeetingId));
          }
        }

        return docs;
      })
    );
  }

  // ---------------------------------------------------------------------------
  // Mapping helpers
  // ---------------------------------------------------------------------------

  private mapAttachmentToDoc(
    att: MeetingAttachment | PastMeetingAttachment,
    meetingTitle: string,
    meetingDate: string,
    meetingId: string,
    pastMeetingId: string | null
  ): CommitteeDocumentItem {
    const isLink = att.type === 'link';
    return {
      id: `att-${att.uid}`,
      name: att.name,
      source: isLink ? 'link' : 'file',
      addedBy: att.created_by?.name || null,
      date: att.created_at,
      fileSize: att.file_size ?? null,
      meetingTitle,
      meetingDate,
      meetingId,
      pastMeetingId,
      linkUrl: isLink ? att.link : undefined,
      attachmentUid: !isLink ? att.uid : undefined,
    };
  }

  private mapRecordingFileToDoc(
    file: RecordingFile,
    shareUrl: string | null,
    meetingTitle: string,
    meetingDate: string,
    meetingId: string,
    pastMeetingId: string
  ): CommitteeDocumentItem {
    const isTranscript = file.file_type === 'TRANSCRIPT';
    return {
      id: `${isTranscript ? 'trs' : 'rec'}-${file.id}`,
      name: isTranscript ? 'Meeting Transcript' : this.getRecordingDisplayName(file),
      source: isTranscript ? 'transcript' : 'recording',
      addedBy: null,
      date: file.recording_start,
      fileSize: file.file_size ?? null,
      meetingTitle,
      meetingDate,
      meetingId,
      pastMeetingId,
      playUrl: isTranscript ? undefined : file.play_url,
      downloadUrl: file.download_url,
      shareUrl: isTranscript ? undefined : (shareUrl ?? undefined),
    };
  }

  private mapSummaryToDoc(
    summary: PastMeetingSummary,
    meetingTitle: string,
    meetingDate: string,
    meetingId: string,
    pastMeetingId: string
  ): CommitteeDocumentItem {
    return {
      id: `sum-${summary.uid}`,
      name: summary.summary_data.title || 'AI Meeting Summary',
      source: 'summary',
      addedBy: null,
      date: summary.created_at,
      fileSize: null,
      meetingTitle,
      meetingDate,
      meetingId,
      pastMeetingId,
      summaryData: {
        uid: summary.uid,
        content: summary.summary_data.edited_content || summary.summary_data.content,
        approved: summary.approved,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private getRecordingDisplayName(file: RecordingFile): string {
    const typeName = RECORDING_TYPE_LABELS[file.recording_type] || file.recording_type;
    return `${typeName} (${file.file_type})`;
  }

  private getLargestSessionShareUrl(recording: PastMeetingRecording): string | null {
    if (!recording.sessions || recording.sessions.length === 0) {
      return null;
    }
    const largestSession = recording.sessions.reduce((largest, current) => (current.total_size > largest.total_size ? current : largest));
    return largestSession.share_url || null;
  }
}
