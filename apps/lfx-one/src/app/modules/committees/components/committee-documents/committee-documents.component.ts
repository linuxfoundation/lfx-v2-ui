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
import { Committee, CommitteeDocument, MeetingAttachment, TagSeverity } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MeetingService } from '@services/meeting.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, filter, finalize, from, map, mergeMap, of, switchMap, take, toArray } from 'rxjs';

import { DocumentFormComponent } from '../document-form/document-form.component';

/** Attachment enriched with meeting context for display. */
interface MeetingAttachmentWithContext {
  attachment: MeetingAttachment;
  meetingTitle: string;
  meetingDate: string;
  meetingId: string;
}

/** Unified display item that covers both meeting attachments and standalone documents. */
interface DocumentDisplayItem {
  uid: string;
  name: string;
  type: string;
  url?: string;
  description?: string;
  addedBy?: string;
  date?: string;
  fileSize?: number;
  /** Source for filtering: 'meeting', 'link', or 'folder' */
  source: string;
  /** Whether this is a standalone document (supports edit/delete) */
  isStandalone: boolean;
  /** Original meeting attachment data (for download) */
  meetingAttachment?: MeetingAttachmentWithContext;
  /** Original committee document data (for edit/delete) */
  committeeDocument?: CommitteeDocument;
  /** Parent folder UID (for hierarchy display) */
  parentUid?: string;
  /** Number of child links inside this folder */
  childCount?: number;
  /** Whether this item is a child inside a folder (indent in table) */
  isChild?: boolean;
}

/** Max concurrent attachment fetches to avoid overwhelming the backend. */
const ATTACHMENT_FETCH_CONCURRENCY = 4;

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
  public loading = signal<boolean>(true);
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
    { label: 'Meeting', value: 'meeting' },
    { label: 'Folder', value: 'folder' },
  ];

  // Folder options for the Add Link dialog
  public folderOptions = computed(() =>
    this.standaloneDocs()
      .filter((doc) => doc.type === 'folder')
      .map((folder) => ({ label: folder.name, value: folder.uid }))
  );

  // Data — meeting attachments
  public meetingAttachments: Signal<MeetingAttachmentWithContext[]> = this.initMeetingAttachments();

  // Data — standalone committee documents
  public standaloneDocs: Signal<CommitteeDocument[]> = this.initStandaloneDocuments();

  // Maps folder UID → child document items for hierarchy display
  public folderChildMap: Signal<Map<string, DocumentDisplayItem[]>> = computed(() => {
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

  // Merged display items (flat, unsorted — does NOT include folder children)
  public allDocuments: Signal<DocumentDisplayItem[]> = computed(() => {
    const childMap = this.folderChildMap();

    const meetingItems: DocumentDisplayItem[] = this.meetingAttachments().map((item) => ({
      uid: item.attachment.uid,
      name: item.attachment.name,
      type: item.attachment.type,
      url: item.attachment.link,
      addedBy: item.attachment.created_by?.name,
      date: item.attachment.created_at,
      fileSize: item.attachment.file_size,
      source: 'meeting',
      isStandalone: false,
      meetingAttachment: item,
    }));

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

    return [...meetingItems, ...standaloneItems].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  });

  // Filtered by search and source, with folder hierarchy (children inserted after expanded folders)
  public filteredDocuments: Signal<DocumentDisplayItem[]> = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const source = this.sourceFilter();
    const expanded = this.expandedFolders();
    const childMap = this.folderChildMap();

    let results = this.allDocuments();

    // When searching, flatten everything (show matching children as standalone rows)
    if (query) {
      const allChildren = [...childMap.values()].flat();
      const allItems = [...results, ...allChildren];
      results = allItems.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
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

  public ngOnInit(): void {
    this.searchForm.controls.search.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchQuery.set(value ?? ''));

    this.searchForm.controls.source.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => this.sourceFilter.set(value));
  }

  /** Opens document — links in new tab, meeting files via download URL. */
  public openDocument(item: DocumentDisplayItem): void {
    if (item.type === 'folder') {
      return; // Folders are not clickable
    }

    if (item.isStandalone && item.url) {
      this.openSafeUrl(item.url);
    } else if (item.meetingAttachment) {
      if (item.meetingAttachment.attachment.type === 'link' && item.meetingAttachment.attachment.link) {
        this.openSafeUrl(item.meetingAttachment.attachment.link);
      } else {
        this.meetingService.getMeetingAttachmentDownloadUrl(item.meetingAttachment.meetingId, item.meetingAttachment.attachment.uid).subscribe({
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

    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
      header: 'Delete Document',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => this.performDelete(item),
    });
  }

  /** Returns the icon class for a document type */
  public getDocumentIcon(item: DocumentDisplayItem): string {
    if (item.type === 'folder') return 'fa-light fa-folder text-amber-500';
    if (item.type === 'link') return 'fa-light fa-link text-blue-500';
    return 'fa-light fa-file text-red-400';
  }

  /** Returns the tag label for the source filter */
  public getSourceLabel(item: DocumentDisplayItem): string {
    if (item.source === 'folder') return 'Folder';
    if (item.source === 'meeting') return 'Meeting';
    return 'Link';
  }

  /** Returns the tag severity for the source */
  public getSourceSeverity(item: DocumentDisplayItem): TagSeverity {
    if (item.source === 'folder') return 'info';
    if (item.source === 'meeting') return 'warn';
    return 'success';
  }

  /** Returns the tag icon based on document type */
  public getSourceIcon(item: DocumentDisplayItem): string {
    if (item.type === 'folder') return 'fa-light fa-folder';
    if (item.type === 'link') return 'fa-light fa-link';
    return 'fa-light fa-file';
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

  private performDelete(item: DocumentDisplayItem): void {
    if (!item.committeeDocument) return;

    this.committeeService.deleteCommitteeDocument(this.committee().uid, item.committeeDocument.uid, item.committeeDocument.type).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document deleted successfully' });
        this.refreshStandaloneDocs();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete document' });
      },
    });
  }

  private refreshStandaloneDocs(): void {
    this.standaloneDocsVersion.update((v) => v + 1);
  }

  // ── Private Initializers ─────────────────────────────────────────────────

  private initMeetingAttachments(): Signal<MeetingAttachmentWithContext[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => {
          this.loading.set(true);
          return this.meetingService.getMeetingsByCommittee(c.uid, 100).pipe(
            switchMap((meetings) => {
              if (meetings.length === 0) return of([]);

              return from(meetings).pipe(
                mergeMap(
                  (meeting) =>
                    this.meetingService.getMeetingAttachments(meeting.id).pipe(
                      catchError(() => of([] as MeetingAttachment[])),
                      map((attachments) =>
                        attachments.map((att) => ({
                          attachment: att,
                          meetingTitle: meeting.title,
                          meetingDate: meeting.start_time,
                          meetingId: meeting.id,
                        }))
                      )
                    ),
                  ATTACHMENT_FETCH_CONCURRENCY
                ),
                toArray(),
                map((results) => results.flat().sort((a, b) => (b.attachment.created_at ?? '').localeCompare(a.attachment.created_at ?? '')))
              );
            }),
            catchError(() => {
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load meeting documents. Please try again.' });
              return of([]);
            }),
            finalize(() => this.loading.set(false))
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
        switchMap(([c]) =>
          this.committeeService.getCommitteeDocuments(c.uid).pipe(
            catchError((error) => {
              console.error('Failed to load standalone documents:', error);
              return of([]);
            })
          )
        )
      ),
      { initialValue: [] }
    );
  }
}
