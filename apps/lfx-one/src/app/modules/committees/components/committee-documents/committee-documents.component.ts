// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee, MyDocumentItem, MyDocumentSource } from '@lfx-one/shared/interfaces';
import { DocumentService } from '@services/document.service';
import { MyDocumentSourceTagPipe } from '@app/shared/pipes/my-document-source-tag.pipe';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-committee-documents',
  imports: [
    CardComponent,
    ButtonComponent,
    InputTextComponent,
    SelectComponent,
    TableComponent,
    TagComponent,
    ReactiveFormsModule,
    DatePipe,
    MyDocumentSourceTagPipe,
  ],
  templateUrl: './committee-documents.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommitteeDocumentsComponent {
  // === Services ===
  private readonly documentService = inject(DocumentService);

  // === Inputs ===
  public readonly committee = input.required<Committee>();

  // === Forms ===
  protected readonly filterForm = new FormGroup({
    search: new FormControl<string>(''),
    source: new FormControl<MyDocumentSource | null>(null),
  });

  // === Writable Signals ===
  protected readonly loading = signal<boolean>(true);

  // === Static Options ===
  protected readonly sourceOptions: { label: string; value: MyDocumentSource | null }[] = [
    { label: 'All Sources', value: null },
    { label: 'Link', value: 'link' as MyDocumentSource },
    { label: 'File', value: 'file' as MyDocumentSource },
    { label: 'Meeting', value: 'meeting' as MyDocumentSource },
    { label: 'Recording', value: 'recording' as MyDocumentSource },
    { label: 'Transcript', value: 'transcript' as MyDocumentSource },
    { label: 'Summary', value: 'summary' as MyDocumentSource },
    { label: 'Mailing List', value: 'mailing_list' as MyDocumentSource },
  ];

  // === Computed Signals ===
  protected readonly searchQuery: Signal<string> = this.initSearchQuery();
  protected readonly sourceFilter: Signal<MyDocumentSource | null> = this.initSourceFilter();
  protected readonly documents: Signal<MyDocumentItem[]> = this.initDocuments();
  protected readonly filteredDocuments: Signal<MyDocumentItem[]> = this.initFilteredDocuments();

  // === Protected Methods ===
  protected openDocument(doc: MyDocumentItem): void {
    if (!doc.url) return;
    try {
      const url = new URL(doc.url);
      if (['http:', 'https:'].includes(url.protocol)) {
        window.open(doc.url, '_blank', 'noopener,noreferrer');
      }
    } catch {
      // Invalid URL — silently ignore
    }
  }

  // === Private Initializers ===
  private initSearchQuery(): Signal<string> {
    return toSignal(
      this.filterForm.controls.search.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        map((v) => v ?? ''),
        startWith('')
      ),
      { initialValue: '' }
    );
  }

  private initSourceFilter(): Signal<MyDocumentSource | null> {
    return toSignal(this.filterForm.controls.source.valueChanges.pipe(startWith<MyDocumentSource | null>(null)), { initialValue: null });
  }

  private initDocuments(): Signal<MyDocumentItem[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        switchMap((committee) => {
          this.loading.set(true);
          return this.documentService.getMyDocuments(committee.project_uid, committee.uid).pipe(
            catchError(() => of([] as MyDocumentItem[])),
            finalize(() => this.loading.set(false))
          );
        })
      ),
      { initialValue: [] as MyDocumentItem[] }
    );
  }

  private initFilteredDocuments(): Signal<MyDocumentItem[]> {
    return computed(() => {
      const docs = this.documents();
      const query = this.searchQuery().toLowerCase().trim();
      const source = this.sourceFilter();
      const meetingGroupSources: MyDocumentSource[] = ['file', 'recording', 'transcript', 'summary'];

      return docs.filter((doc) => {
        if (query && !doc.name.toLowerCase().includes(query) && !doc.groupOrMeetingName.toLowerCase().includes(query)) {
          return false;
        }
        if (source && doc.source !== source && !(source === 'meeting' && meetingGroupSources.includes(doc.source))) {
          return false;
        }
        return true;
      });
    });
  }
}
