// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, output, Signal, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { MeetingRegistrant, MeetingRegistrantWithState, RegistrantState } from '@lfx-pcc/shared/interfaces';
import { MeetingService } from '@services/meeting.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { catchError, finalize, of, take, tap } from 'rxjs';

import { RegistrantCardComponent } from './registrant-card/registrant-card.component';
import { RegistrantFormComponent } from './registrant-form/registrant-form.component';

@Component({
  selector: 'lfx-meeting-registrants',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    InputTextComponent,
    SelectComponent,
    ConfirmDialogModule,
    RegistrantCardComponent,
    RegistrantFormComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './meeting-registrants.component.html',
  styleUrl: './meeting-registrants.component.scss',
})
export class MeetingRegistrantsComponent implements OnInit {
  // Input signals
  public meetingUid = input.required<string>();

  // Output events
  public readonly onUpdate = output<MeetingRegistrantWithState[]>();

  // Injected services
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // State signals
  public registrantsWithState: WritableSignal<MeetingRegistrantWithState[]> = signal([]);
  public loading: WritableSignal<boolean> = signal(true);
  public searchForm: FormGroup;
  public addRegistrantForm: FormGroup;
  public registrants: Signal<MeetingRegistrant[]> = signal([]);

  // Original data from API

  // Component visibility states (following React pattern)
  public showAddForm = signal<boolean>(false);
  public showImport = signal<boolean>(false); // Combined bulk add and CSV import
  public editingRegistrantId = signal<string | null>(null);

  // Search and status filter signals (to avoid form reactivity issues)
  public searchTerm = signal<string>('');
  public statusFilter = signal<string | null>(null);

  // Computed signals for display
  public visibleRegistrants = computed(() => {
    // Only show registrants that are not deleted
    return this.registrantsWithState().filter((r) => r.state !== 'deleted');
  });

  public filteredRegistrants = computed(() => {
    let filtered = this.visibleRegistrants();
    const search = this.searchTerm().toLowerCase();
    const status = this.statusFilter();

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (registrant) =>
          registrant.first_name?.toLowerCase().includes(search) ||
          registrant.last_name?.toLowerCase().includes(search) ||
          registrant.email?.toLowerCase().includes(search) ||
          registrant.org_name?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (status) {
      switch (status) {
        case 'host':
          filtered = filtered.filter((r) => r.host);
          break;
        case 'member':
          filtered = filtered.filter((r) => r.org_is_member);
          break;
        case 'project_member':
          filtered = filtered.filter((r) => r.org_is_project_member);
          break;
      }
    }

    return filtered;
  });

  // Computed counts
  public registrantCount = computed(() => this.visibleRegistrants().length);
  public hostCount = computed(() => this.visibleRegistrants().filter((r) => r.host).length);
  public memberCount = computed(() => this.visibleRegistrants().filter((r) => r.org_is_member).length);

  // Form options
  public statusOptions = [
    { label: 'All Registrants', value: null },
    { label: 'Hosts Only', value: 'host' },
    { label: 'LF Members', value: 'member' },
    { label: 'Project Members', value: 'project_member' },
  ];

  public constructor() {
    this.searchForm = new FormGroup({
      search: new FormControl(''),
      status: new FormControl(null),
    });

    this.addRegistrantForm = this.buildAddRegistrantForm();

    // Subscribe to form changes and update signals
    this.searchForm.get('search')?.valueChanges.subscribe((value) => {
      this.searchTerm.set(value || '');
    });

    this.searchForm.get('status')?.valueChanges.subscribe((value) => {
      this.statusFilter.set(value);
    });
  }

  public ngOnInit(): void {
    this.initializeRegistrants();
  }

  public onToggleAddRegistrant(): void {
    this.showAddForm.set(false);
    this.showAddForm.set(true);
  }

  public onBulkAdd(): void {
    this.showAddForm.set(false);
    this.showImport.set(true);
  }

  public refreshRegistrants(): void {
    this.initializeRegistrants();
  }

  // Component handlers
  public onCloseAddForm(): void {
    this.showAddForm.set(false);
  }

  public onCloseImport(): void {
    this.showImport.set(false);
  }

  public onCancelEdit(): void {
    this.editingRegistrantId.set(null);
  }

  // Action handlers
  public onAddRegistrant(): void {
    if (this.addRegistrantForm.valid) {
      const formValue = this.addRegistrantForm.value;

      // Build complete MeetingRegistrant object
      const registrantData: MeetingRegistrant = {
        uid: '', // Will be assigned by API
        meeting_uid: this.meetingUid(),
        occurrence_id: null,
        email: formValue.email,
        first_name: formValue.first_name,
        last_name: formValue.last_name,
        job_title: formValue.job_title || null,
        org_name: formValue.org_name || null,
        host: formValue.host || false,
        org_is_member: false,
        org_is_project_member: false,
        avatar_url: null,
        username: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.handleAddRegistrant(registrantData);
    }
  }

  public handleAddRegistrant(registrantData: MeetingRegistrant): void {
    // Create new registrant with temporary ID for immediate UI updates
    const newRegistrant: MeetingRegistrantWithState = {
      ...registrantData,
      meeting_uid: this.meetingUid(),
      uid: '', // Will be assigned by API
      state: 'new' as RegistrantState,
      tempId: this.generateTempId(),
      originalData: undefined,
    };

    // Add to local state for immediate UI feedback
    this.registrantsWithState.update((registrants) => [...registrants, newRegistrant]);

    // Emit the updated registrants
    this.onUpdate.emit(this.registrantsWithState());

    // Reset and close form
    this.addRegistrantForm.reset();
    this.onCloseAddForm();
  }

  public handleBulkAdd(emailData: any): void {
    // TODO: Implement bulk add functionality
    console.info('Bulk add:', emailData);
    this.onCloseImport();
    this.refreshRegistrants();
  }

  public handleImportCSV(csvData: any): void {
    // TODO: Implement CSV import functionality
    console.info('Import CSV:', csvData);
    this.onCloseImport();
    this.refreshRegistrants();
  }

  public handleSaveEdit(registrantData: any): void {
    // TODO: Implement save edit functionality
    console.info('Save edit:', registrantData);
    this.onCancelEdit();
    this.refreshRegistrants();
  }

  public onStatusFilterChange(value: string | null): void {
    // Form control updates signal automatically via subscription
    console.info('Status filter changed:', value);
  }

  // Simplified registrant event handlers (only receive validated data)
  public handleRegistrantUpdate(updateData: { id: string; data: MeetingRegistrant }): void {
    this.registrantsWithState.update((registrants) =>
      registrants.map((r) => {
        if (r.uid === updateData.id || r.tempId === updateData.id) {
          return {
            ...updateData.data,
            state: r.state === 'existing' ? ('modified' as RegistrantState) : r.state,
            originalData: r.originalData,
            tempId: r.tempId,
          } as MeetingRegistrantWithState;
        }
        return r;
      })
    );

    // Emit the updated registrants
    this.onUpdate.emit(this.registrantsWithState());
  }

  public handleRegistrantDelete(id: string): void {
    this.confirmationService.confirm({
      message: 'Are you sure you want to remove this participant from the meeting?',
      header: 'Remove Participant',
      icon: 'fa-light fa-triangle-exclamation',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-sm',
      accept: () => {
        this.registrantsWithState.update(
          (registrants) =>
            registrants
              .map((r) => {
                if (r.uid === id || r.tempId === id) {
                  if (r.state === 'new') {
                    // For new registrants, remove completely
                    return null;
                  }
                  // For existing registrants, mark as deleted
                  return { ...r, state: 'deleted' as RegistrantState };
                }
                return r;
              })
              .filter(Boolean) as MeetingRegistrantWithState[]
        );

        // Emit the updated registrants
        this.onUpdate.emit(this.registrantsWithState());
      },
    });
  }

  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createRegistrantWithState(registrant: MeetingRegistrant, state: RegistrantState = 'existing'): MeetingRegistrantWithState {
    return {
      ...registrant,
      state: state,
      originalData: state === 'existing' ? { ...registrant } : undefined,
      tempId: state === 'new' ? this.generateTempId() : undefined,
    };
  }

  private initializeRegistrants(): void {
    const uid = this.meetingUid();
    if (!uid) return;

    this.meetingService
      .getMeetingRegistrants(uid)
      .pipe(
        take(1),
        catchError((error) => {
          console.error('Error', error);
          return of([]);
        }),
        finalize(() => {
          this.loading.set(false);
        }),
        tap((registrants) => {
          if (!registrants || registrants.length === 0) {
            this.registrantsWithState.set([]);
            return;
          }

          this.registrantsWithState.set(registrants.map((r) => this.createRegistrantWithState(r, 'existing')));
        })
      )
      .subscribe();
  }

  private buildAddRegistrantForm(): FormGroup {
    return new FormGroup({
      first_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      last_name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      email: new FormControl('', [Validators.required, Validators.email]),
      job_title: new FormControl(''),
      org_name: new FormControl(''),
      host: new FormControl(false),
    });
  }
}
