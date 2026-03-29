// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';
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
import { DocumentSourceActionPipe } from '@pipes/document-source-action.pipe';
import { DocumentSourceIconPipe } from '@pipes/document-source-icon.pipe';
import { DocumentSourceTagPipe } from '@pipes/document-source-tag.pipe';
import {
  Committee,
  CommitteeDocument,
  DocumentDisplayItem,
  Meeting,
  MeetingAttachment,
  PastMeeting,
  PastMeetingAttachment,
  PastMeetingRecording,
  PastMeetingSummary,
} from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MeetingService } from '@services/meeting.service';
import { RecordingModalComponent } from '@components/recording-modal/recording-modal.component';
import { SummaryModalComponent } from '@components/summary-modal/summary-modal.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  finalize,
  forkJoin,
  from,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  take,
  toArray,
} from 'rxjs';
import { getHttpErrorDetail } from '@shared/utils/http-error.utils';
import {
  mapAttachmentToDoc,
  mapRecordingFileToDoc,
  mapSummaryToDoc,
  getLargestSessionShareUrl,
  isAllowedRecordingFileType,
} from '../../utils/committee-document.utils';

import { DocumentFormComponent } from '../document-form/document-form.component';

/** Max concurrent per-meeting fetches to avoid overwhelming the backend. */
const FETCH_CONCURRENCY = 4;

/**
 * Max meetings to fetch per type (upcoming/past).
 * Kept low to limit N+1 API fan-out (each past meeting triggers 3 calls).
 * TODO: Replace with a backend aggregate endpoint that returns documents for all meetings in one call.
 */
const MAX_MEETINGS_PER_TYPE = 25;

@Component({
  selector: 'lfx-committee-documents',
  imports: [
    CardComponent,
    ButtonComponent,
    InputTextComponent,
    SelectComponent,
    ReactiveFormsModule,
    TableComponent,
    TagComponent,
    FileSizePipe,
    DatePipe,
    DynamicDialogModule,
    ConfirmDialogModule,
    DocumentSourceActionPipe,
    DocumentSourceIconPipe,
    DocumentSourceTagPipe,
  ],
  providers: [DialogService, ConfirmationService],
  templateUrl: './committee-documents.component.html',
  styleUrl: './committee-documents.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommitteeDocumentsComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  public committee = input.required<Committee>();
  public canEdit = input<boolean>(false);

  // State
  public meetingLoading = signal<boolean>(true);
  public standaloneLoading = signal<boolean>(true);
  public loading = computed(() => this.meetingLoading() || this.standaloneLoading());
  public searchQuery = signal('');
  public sourceFilter = signal<string | null>(null);
  public standaloneDocsVersion = signal(0);
  public expandedFolders = signal<Set<string>>(new Set());

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
    { label: 'Folder', value: 'folder' },
  ];

  // Folder options for the Add Link dialog
  public folderOptions = computed(() =>
    this.standaloneDocs()
      .filter((doc) => doc.type === 'folder')
      .map((folder) => ({ label: folder.name, value: folder.uid }))
  );

  // Data — meeting documents (attachments, recordings, transcripts, summaries)
  public meetingDocuments: Signal<DocumentDisplayItem[]> = this.initMeetingDocuments();

  // Data — standalone committee documents
  public standaloneDocs: Signal<CommitteeDocument[]> = this.initStandaloneDocuments();

  // Maps folder UID → child document items for hierarchy display
  public folderChildMap: Signal<Map<string, DocumentDisplayItem[]>> = this.initFolderChildMap();

  // Merged display items (flat, unsorted — does NOT include folder children)
  public allDocuments: Signal<DocumentDisplayItem[]> = this.initAllDocuments();

  // Filtered by search and source, with folder hierarchy (children inserted after expanded folders)
  public filteredDocuments: Signal<DocumentDisplayItem[]> = this.initFilteredDocuments();

  public ngOnInit(): void {
    this.searchForm.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchQuery.set(value ?? ''));

    this.searchForm.controls.source.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.sourceFilter.set(value));
  }

  /** Opens document — links in new tab, files via download URL, recordings/summaries via modals. */
  public openDocument(item: DocumentDisplayItem): void {
    if (item.type === 'folder') {
      return; // Folders are not clickable
    }

    if (item.isStandalone && item.url) {
      this.openSafeUrl(item.url);
      return;
    }

    // Meeting-sourced documents
    switch (item.source) {
      case 'link':
        if (item.meetingAttachment?.attachment?.link) {
          this.openSafeUrl(item.meetingAttachment.attachment.link);
        } else if (item.linkUrl) {
          this.openSafeUrl(item.linkUrl);
        }
        break;
      case 'file':
        this.downloadMeetingFile(item);
        break;
      case 'recording':
        this.openRecording(item);
        break;
      case 'transcript':
        if (item.downloadUrl) {
          this.openSafeUrl(item.downloadUrl);
        }
        break;
      case 'summary':
        this.openSummary(item);
        break;
      default:
        // Legacy meeting attachment fallback
        if (item.meetingAttachment) {
          if (item.meetingAttachment.attachment.type === 'link' && item.meetingAttachment.attachment.link) {
            this.openSafeUrl(item.meetingAttachment.attachment.link);
          } else {
            this.meetingService.getMeetingAttachmentDownloadUrl(item.meetingAttachment.meetingId, item.meetingAttachment.attachment.uid).subscribe({
              next: (response) => {
                if (response?.download_url) {
                  this.openSafeUrl(response.download_url);
                }
              },
              error: (err: HttpErrorResponse) => {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: getHttpErrorDetail(err, 'Failed to get download link.') });
              },
            });
          }
        }
    }
  }

  /** Toggles a folder's expanded/collapsed state. */
  public toggleFolder(folderUid: string): void {
    this.expandedFolders.update((set) => {
      const next = new Set(set);
      if (next.has(folderUid)) {
        next.delete(folderUid);
      } else {
        next.add(folderUid);
      }
      return next;
    });
  }

  /** Whether a folder is currently expanded. */
  public isFolderExpanded(folderUid: string): boolean {
    return this.expandedFolders().has(folderUid);
  }

  // ── CRUD Dialog Methods ──────────────────────────────────────────────────

  public openAddLinkDialog(): void {
    // Wait for standalone docs to settle so folder list is current
    if (this.standaloneLoading()) return;

    const dialogRef = this.dialogService.open(DocumentFormComponent, {
      header: 'Add Link',
      width: '560px',
      modal: true,
      closable: true,
      data: {
        mode: 'link',
        committeeId: this.committee().uid,
        folders: this.folderOptions(),
      },
    });

    dialogRef?.onClose.pipe(take(1)).subscribe((result: boolean | undefined) => {
      if (result) {
        this.refreshStandaloneDocs();
      }
    });
  }

  public openNewFolderDialog(): void {
    const dialogRef = this.dialogService.open(DocumentFormComponent, {
      header: 'New Folder',
      width: '560px',
      modal: true,
      closable: true,
      data: {
        mode: 'folder',
        committeeId: this.committee().uid,
      },
    });

    dialogRef?.onClose.pipe(take(1)).subscribe((result: boolean | undefined) => {
      if (result) {
        this.refreshStandaloneDocs();
      }
    });
  }

  public confirmDeleteDocument(item: DocumentDisplayItem): void {
    if (!item.committeeDocument) return;

    if (item.type === 'folder') {
      const childCount = this.folderChildMap().get(item.uid)?.length ?? 0;
      const childDetail = childCount > 0 ? ` This folder contains ${childCount} link${childCount !== 1 ? 's' : ''} that will also be permanently deleted.` : '';

      this.confirmationService.confirm({
        message: `Are you sure you want to delete the folder "${item.name}"?${childDetail} This action cannot be undone.`,
        header: 'Delete Folder',
        icon: 'fa-light fa-triangle-exclamation',
        acceptButtonStyleClass: 'p-button-danger p-button-sm',
        rejectButtonStyleClass: 'p-button-secondary p-button-outlined p-button-sm',
        acceptLabel: childCount > 0 ? 'Delete Folder & Links' : 'Delete Folder',
        rejectLabel: 'Cancel',
        accept: () => this.performDelete(item),
      });
    } else {
      this.confirmationService.confirm({
        message: `Are you sure you want to permanently delete the link "${item.name}"? This action cannot be undone.`,
        header: 'Delete Link',
        icon: 'fa-light fa-triangle-exclamation',
        acceptButtonStyleClass: 'p-button-danger p-button-sm',
        rejectButtonStyleClass: 'p-button-secondary p-button-outlined p-button-sm',
        acceptLabel: 'Delete',
        rejectLabel: 'Cancel',
        accept: () => this.performDelete(item),
      });
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

  private downloadMeetingFile(item: DocumentDisplayItem): void {
    if (!item.attachmentUid) return;
    const download$ = item.pastMeetingId
      ? this.meetingService.getPastMeetingAttachmentDownloadUrl(item.pastMeetingId, item.attachmentUid)
      : this.meetingService.getMeetingAttachmentDownloadUrl(item.meetingId ?? '', item.attachmentUid);
    download$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response?.download_url) {
          this.openSafeUrl(response.download_url);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: getHttpErrorDetail(err, 'Failed to get download link.') });
      },
    });
  }

  private openRecording(item: DocumentDisplayItem): void {
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
  }

  private openSummary(item: DocumentDisplayItem): void {
    if (item.summaryData && item.pastMeetingId) {
      this.dialogService.open(SummaryModalComponent, {
        header: 'Meeting Summary',
        width: '800px',
        modal: true,
        closable: true,
        dismissableMask: true,
        data: {
          summaryContent: item.summaryData.content,
          summaryUid: item.summaryData.uid,
          pastMeetingUid: item.pastMeetingId,
          meetingTitle: item.meetingTitle,
          approved: item.summaryData.approved,
        },
      });
    }
  }

  private performDelete(item: DocumentDisplayItem): void {
    if (!item.committeeDocument) return;

    const committeeId = this.committee().uid;
    const typeLabel = item.type === 'folder' ? 'Folder' : 'Link';

    if (item.type === 'folder') {
      // Upstream requires folders to be empty — delete child links first, then the folder.
      // Use forkJoin to attempt all child deletes in parallel with per-child error handling.
      const children = this.folderChildMap().get(item.uid) ?? [];
      const childDeletes$ = children
        .filter((child) => child.committeeDocument)
        .map((child) =>
          this.committeeService.deleteCommitteeDocument(committeeId, child.committeeDocument!.uid, child.committeeDocument!.type).pipe(
            map(() => ({ uid: child.uid, success: true as const })),
            catchError(() => of({ uid: child.uid, success: false as const }))
          )
        );

      if (childDeletes$.length === 0) {
        // No children — delete folder directly
        this.committeeService.deleteCommitteeDocument(committeeId, item.committeeDocument.uid, 'folder').subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${item.name}" has been deleted` });
            this.refreshStandaloneDocs();
          },
          error: (err) => this.showDeleteError(err, typeLabel),
        });
        return;
      }

      forkJoin(childDeletes$)
        .pipe(
          switchMap((results) => {
            const failures = results.filter((r) => !r.success);
            if (failures.length > 0) {
              this.messageService.add({
                severity: 'warn',
                summary: 'Partial Failure',
                detail: `${failures.length} of ${results.length} link${results.length !== 1 ? 's' : ''} could not be deleted. The folder was not removed.`,
              });
              this.refreshStandaloneDocs();
              return EMPTY;
            }
            return this.committeeService.deleteCommitteeDocument(committeeId, item.committeeDocument!.uid, 'folder');
          })
        )
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${item.name}" and its contents have been deleted` });
            this.refreshStandaloneDocs();
          },
          error: (err) => this.showDeleteError(err, typeLabel),
        });
    } else {
      this.committeeService.deleteCommitteeDocument(committeeId, item.committeeDocument.uid, item.committeeDocument.type).subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `"${item.name}" has been deleted` });
          this.refreshStandaloneDocs();
        },
        error: (err) => this.showDeleteError(err, typeLabel),
      });
    }
  }

  private showDeleteError(err: { status?: number; error?: { message?: string } }, typeLabel: string): void {
    let errorMessage = `Failed to delete ${typeLabel.toLowerCase()}. Please try again.`;
    if (err?.status === 404) {
      errorMessage = `${typeLabel} not found. It may have already been deleted.`;
    } else if (err?.status === 403) {
      errorMessage = `You do not have permission to delete this ${typeLabel.toLowerCase()}.`;
    } else if (err?.error?.message) {
      errorMessage = err.error.message;
    }
    this.messageService.add({ severity: 'error', summary: 'Delete Failed', detail: errorMessage });
  }

  private refreshStandaloneDocs(): void {
    this.standaloneDocsVersion.update((v) => v + 1);
  }

  // ── Private Initializers ─────────────────────────────────────────────────

  private initFolderChildMap(): Signal<Map<string, DocumentDisplayItem[]>> {
    return computed(() => {
      const childMap = new Map<string, DocumentDisplayItem[]>();
      for (const doc of this.standaloneDocs()) {
        if (doc.parent_uid) {
          const children = childMap.get(doc.parent_uid) || [];
          children.push({
            uid: doc.uid,
            name: doc.name,
            type: doc.type,
            url: doc.url,
            description: doc.description,
            addedBy: doc.uploaded_by || doc.created_by,
            date: doc.created_at || doc.updated_at,
            fileSize: doc.file_size,
            source: doc.type,
            isStandalone: true,
            committeeDocument: doc,
            parentUid: doc.parent_uid,
            isChild: true,
          });
          childMap.set(doc.parent_uid, children);
        }
      }
      return childMap;
    });
  }

  private initAllDocuments(): Signal<DocumentDisplayItem[]> {
    return computed(() => {
      const childMap = this.folderChildMap();

      const standaloneItems: DocumentDisplayItem[] = this.standaloneDocs()
        .filter((doc) => !doc.parent_uid)
        .map((doc) => ({
          uid: doc.uid,
          name: doc.name,
          type: doc.type,
          url: doc.url,
          description: doc.description,
          addedBy: doc.uploaded_by || doc.created_by,
          date: doc.created_at || doc.updated_at,
          fileSize: doc.file_size,
          source: doc.type,
          isStandalone: true,
          committeeDocument: doc,
          childCount: doc.type === 'folder' ? (childMap.get(doc.uid)?.length ?? 0) : undefined,
        }));

      return [...this.meetingDocuments(), ...standaloneItems].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    });
  }

  private initFilteredDocuments(): Signal<DocumentDisplayItem[]> {
    return computed(() => {
      const query = this.searchQuery().toLowerCase().trim();
      const source = this.sourceFilter();
      const expanded = this.expandedFolders();
      const childMap = this.folderChildMap();

      let results = this.allDocuments();

      // When searching, flatten everything (show matching children as standalone rows with isChild reset)
      if (query) {
        const allChildren = [...childMap.values()].flat().map((child) => ({ ...child, isChild: false }));
        const allItems = [...results, ...allChildren];
        results = allItems.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            (item.meetingTitle ?? '').toLowerCase().includes(query) ||
            (item.meetingAttachment?.meetingTitle ?? '').toLowerCase().includes(query) ||
            (item.description ?? '').toLowerCase().includes(query)
        );
        if (source) {
          results = results.filter((item) => item.source === source);
        }
        return results;
      }

      if (source) {
        results = results.filter((item) => item.source === source || item.type === 'folder');
        // Hide folders that have no children matching the filter and aren't the filter themselves
        if (source !== 'folder') {
          results = results.filter((item) => item.type !== 'folder' || (childMap.get(item.uid)?.some((child) => child.source === source) ?? false));
        }
      }

      // Insert folder children after expanded folders
      const display: DocumentDisplayItem[] = [];
      for (const item of results) {
        display.push(item);
        if (item.type === 'folder' && expanded.has(item.uid)) {
          let children = childMap.get(item.uid) ?? [];
          if (source) {
            children = children.filter((child) => child.source === source);
          }
          display.push(...children);
        }
      }

      return display;
    });
  }

  private initMeetingDocuments(): Signal<DocumentDisplayItem[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => {
          this.meetingLoading.set(true);

          return forkJoin({
            upcoming: this.meetingService.getMeetingsByCommittee(c.uid, MAX_MEETINGS_PER_TYPE).pipe(catchError(() => of([] as Meeting[]))),
            past: this.meetingService.getPastMeetingsByCommittee(c.uid, MAX_MEETINGS_PER_TYPE).pipe(catchError(() => of([] as PastMeeting[]))),
          }).pipe(
            switchMap(({ upcoming, past }) => {
              const upcomingDocs$ = upcoming.length
                ? from(upcoming).pipe(
                    mergeMap((meeting) => this.fetchUpcomingMeetingDocs(meeting), FETCH_CONCURRENCY),
                    toArray(),
                    map((arrays) => arrays.flat())
                  )
                : of([] as DocumentDisplayItem[]);

              const pastDocs$ = past.length
                ? from(past).pipe(
                    mergeMap((meeting) => this.fetchPastMeetingDocs(meeting), FETCH_CONCURRENCY),
                    toArray(),
                    map((arrays) => arrays.flat())
                  )
                : of([] as DocumentDisplayItem[]);

              return forkJoin([upcomingDocs$, pastDocs$]).pipe(
                map(([u, p]) => [...u, ...p].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')))
              );
            }),
            catchError(() => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load meeting documents. Please try again.' });
              return of([] as DocumentDisplayItem[]);
            }),
            finalize(() => this.meetingLoading.set(false))
          );
        })
      ),
      { initialValue: [] }
    );
  }

  private initStandaloneDocuments(): Signal<CommitteeDocument[]> {
    // Both toObservable calls must be at the top level (injection context).
    // combineLatest re-emits when either the committee changes or the version bumps (refresh).
    return toSignal(
      combineLatest([toObservable(this.committee), toObservable(this.standaloneDocsVersion)]).pipe(
        filter(([c]) => !!c?.uid),
        switchMap(([c]) => {
          this.standaloneLoading.set(true);
          return this.committeeService.getCommitteeDocuments(c.uid).pipe(
            catchError(() => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load committee documents. Please try again.' });
              return of([] as CommitteeDocument[]);
            }),
            finalize(() => this.standaloneLoading.set(false))
          );
        })
      ),
      { initialValue: [] }
    );
  }

  // ---------------------------------------------------------------------------
  // Per-meeting fetchers
  // ---------------------------------------------------------------------------

  private fetchUpcomingMeetingDocs(meeting: Meeting): Observable<DocumentDisplayItem[]> {
    return this.meetingService.getMeetingAttachments(meeting.id).pipe(
      catchError(() => of([] as MeetingAttachment[])),
      map((attachments) =>
        attachments.map((att) => {
          const doc = mapAttachmentToDoc(att, meeting.title, meeting.start_time, meeting.id, null);
          return this.committeeDocumentItemToDisplayItem(doc);
        })
      )
    );
  }

  private fetchPastMeetingDocs(meeting: PastMeeting): Observable<DocumentDisplayItem[]> {
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
        const items: DocumentDisplayItem[] = [];

        if (attachments) {
          for (const att of attachments) {
            const doc = mapAttachmentToDoc(att, title, date, meetingId, pastMeetingId);
            items.push(this.committeeDocumentItemToDisplayItem(doc));
          }
        }

        if (recording?.recording_files) {
          const shareUrl = getLargestSessionShareUrl(recording);
          for (const file of recording.recording_files) {
            if (!isAllowedRecordingFileType(file.file_type)) continue;
            const doc = mapRecordingFileToDoc(file, shareUrl, title, date, meetingId, pastMeetingId);
            items.push(this.committeeDocumentItemToDisplayItem(doc));
          }
        }

        if (summary?.summary_data) {
          const content = summary.summary_data.edited_content || summary.summary_data.content;
          if (content) {
            const doc = mapSummaryToDoc(summary, title, date, meetingId, pastMeetingId);
            items.push(this.committeeDocumentItemToDisplayItem(doc));
          }
        }

        return items;
      })
    );
  }

  /** Maps a CommitteeDocumentItem (from meeting sources) to a DocumentDisplayItem for the shared table. */
  private committeeDocumentItemToDisplayItem(item: import('@lfx-one/shared/interfaces').CommitteeDocumentItem): DocumentDisplayItem {
    return {
      uid: item.id,
      name: item.name,
      type: item.source,
      addedBy: item.addedBy ?? undefined,
      date: item.date,
      fileSize: item.fileSize ?? undefined,
      source: item.source,
      isStandalone: false,
      meetingTitle: item.meetingTitle,
      meetingId: item.meetingId,
      pastMeetingId: item.pastMeetingId ?? undefined,
      linkUrl: item.linkUrl,
      attachmentUid: item.attachmentUid,
      playUrl: item.playUrl,
      downloadUrl: item.downloadUrl,
      shareUrl: item.shareUrl,
      summaryData: item.summaryData,
    };
  }
}
