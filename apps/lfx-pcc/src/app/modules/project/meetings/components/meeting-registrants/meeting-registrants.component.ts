// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, WritableSignal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import {
  MeetingRegistrant,
  MeetingRegistrantWithState,
  RegistrantPendingChanges,
  RegistrantState,
  UpdateMeetingRegistrantRequest,
} from '@lfx-pcc/shared/interfaces';
import { MeetingService } from '@services/meeting.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { take } from 'rxjs';

import { RegistrantCardComponent } from './registrant-card/registrant-card.component';

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
  ],
  providers: [ConfirmationService],
  templateUrl: './meeting-registrants.component.html',
  styleUrl: './meeting-registrants.component.scss',
})
export class MeetingRegistrantsComponent {
  // Input signals
  public meetingUid = input.required<string>();

  // Output events
  public readonly onBack = output<void>();
  public readonly onComplete = output<void>();

  // Injected services
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // State signals
  public registrantsWithState: WritableSignal<MeetingRegistrantWithState[]> = signal([]);
  public loading: WritableSignal<boolean> = signal(true);
  public searchForm: FormGroup;

  // Original data from API
  private originalRegistrants: WritableSignal<MeetingRegistrant[]> = signal([]);

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

  // Change tracking computed signals
  public pendingChanges = computed((): RegistrantPendingChanges => {
    const all = this.registrantsWithState();
    return {
      toAdd: all.filter((r) => r.state === 'new').map((r) => this.stripMetadata(r)),
      toUpdate: all
        .filter((r) => r.state === 'modified')
        .map((r) => ({
          uid: r.uid,
          changes: this.getChangedFields(r),
        })),
      toDelete: all.filter((r) => r.state === 'deleted').map((r) => r.uid),
    };
  });

  public hasUnsavedChanges = computed(() => {
    const changes = this.pendingChanges();
    return changes.toAdd.length > 0 || changes.toUpdate.length > 0 || changes.toDelete.length > 0;
  });

  public unsavedChangesCount = computed(() => {
    const changes = this.pendingChanges();
    return changes.toAdd.length + changes.toUpdate.length + changes.toDelete.length;
  });

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

    // Subscribe to form changes and update signals
    this.searchForm.get('search')?.valueChanges.subscribe((value) => {
      this.searchTerm.set(value || '');
    });

    this.searchForm.get('status')?.valueChanges.subscribe((value) => {
      this.statusFilter.set(value);
    });

    this.initializeRegistrants();

    effect(() => {
      // Load registrants when meeting UID changes
      if (this.meetingUid()) {
        this.initializeRegistrants();
      }
    });
  }

  public onAddRegistrant(): void {
    this.showAddForm.set(true);
  }

  public onBulkAdd(): void {
    this.showImport.set(true); // Opens the combined import component
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

  // Action handlers (placeholders for now)
  public handleAddRegistrant(registrantData: any): void {
    // TODO: Implement add registrant functionality
    console.info('Add registrant:', registrantData);
    this.onCloseAddForm();
    this.refreshRegistrants();
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

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Participant updated successfully',
    });
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

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Participant will be removed when changes are saved',
        });
      },
    });
  }

  // Public method to sync all changes with API
  public async syncRegistrantsWithAPI(): Promise<void> {
    const changes = this.pendingChanges();

    if (!this.hasUnsavedChanges()) {
      return; // No changes to sync
    }

    try {
      this.loading.set(true);

      // Execute all API operations in parallel
      const operations = [
        // Create new registrants
        ...changes.toAdd.map((registrant) =>
          this.meetingService.addMeetingRegistrant({
            ...registrant,
            meeting_uid: this.meetingUid(),
          })
        ),
        // Update existing registrants
        ...changes.toUpdate.map((update) => this.meetingService.updateMeetingRegistrant(this.meetingUid(), update.uid, update.changes)),
        // Delete registrants
        ...changes.toDelete.map((uid) => this.meetingService.deleteMeetingRegistrant(this.meetingUid(), uid)),
      ];

      await Promise.all(operations);

      // Refresh data from API
      await this.loadRegistrantsFromAPI();

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Successfully saved ${this.unsavedChangesCount()} changes`,
      });
    } catch (error) {
      console.error('Failed to sync registrants:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save changes. Please try again.',
      });
    } finally {
      this.loading.set(false);
    }
  }

  // Helper methods for state management
  private stripMetadata(registrant: MeetingRegistrantWithState): MeetingRegistrant {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { state, originalData, tempId, ...cleanRegistrant } = registrant;
    return cleanRegistrant;
  }

  private getChangedFields(registrant: MeetingRegistrantWithState): UpdateMeetingRegistrantRequest {
    // For PUT requests, return the complete object with all required and optional fields
    return {
      meeting_uid: registrant.meeting_uid,
      email: registrant.email,
      first_name: registrant.first_name,
      last_name: registrant.last_name,
      host: registrant.host || false,
      job_title: registrant.job_title || null,
      org_name: registrant.org_name || null,
      occurrence_id: registrant.occurrence_id || null,
      avatar_url: registrant.avatar_url || null,
      username: registrant.username || null,
    };
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

  // Method to load fresh data from API and reset state
  private async loadRegistrantsFromAPI(): Promise<void> {
    const uid = this.meetingUid();
    if (!uid) return;

    try {
      const registrants = (await this.meetingService.getMeetingRegistrants(uid).pipe(take(1)).toPromise()) as MeetingRegistrant[];
      this.originalRegistrants.set(registrants || []);

      // Convert to state-tracked registrants
      const registrantsWithState = (registrants || []).map((r) => this.createRegistrantWithState(r, 'existing'));
      this.registrantsWithState.set(registrantsWithState);
    } catch (error) {
      console.error('Failed to load registrants:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load participants',
      });
    }
  }

  private initializeRegistrants(): void {
    // const uid = this.meetingUid();
    // if (!uid) return;

    // TODO: Remove mock data and use actual API call
    const mockData = this.createMockRegistrants('123');
    this.originalRegistrants.set(mockData);

    // Convert to state-tracked registrants
    const registrantsWithState = mockData.map((r) => this.createRegistrantWithState(r, 'existing'));
    this.registrantsWithState.set(registrantsWithState);

    this.loading.set(false);

    // Actual API call (commented out for now)
    // this.loading.set(true);
    // this.meetingService.getMeetingRegistrants(uid).pipe(
    //   take(1),
    //   finalize(() => this.loading.set(false))
    // ).subscribe(registrants => {
    //   this.registrants.set(registrants);
    //   // Populate FormArray with API data
    // });
  }

  private createMockRegistrants(meetingUid: string): MeetingRegistrant[] {
    return [
      {
        uid: '1',
        meeting_uid: meetingUid,
        occurrence_id: 'occurrence-1',
        email: 'john.doe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        username: 'johndoe',
        avatar_url: null,
        job_title: 'Senior Software Engineer',
        org_name: 'Tech Corp',
        host: true,
        org_is_member: true,
        org_is_project_member: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        uid: '2',
        meeting_uid: meetingUid,
        occurrence_id: 'occurrence-2',
        email: 'jane.smith@company.com',
        first_name: 'Jane',
        last_name: 'Smith',
        username: 'janesmith',
        avatar_url: null,
        job_title: 'Product Manager',
        org_name: 'Innovation Labs',
        host: false,
        org_is_member: false,
        org_is_project_member: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        uid: '3',
        meeting_uid: meetingUid,
        occurrence_id: 'occurrence-3',
        email: 'mike.wilson@startup.io',
        first_name: 'Mike',
        last_name: 'Wilson',
        username: 'mikewilson',
        avatar_url: null,
        job_title: 'CTO',
        org_name: 'StartupIO',
        host: false,
        org_is_member: true,
        org_is_project_member: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        uid: '4',
        meeting_uid: meetingUid,
        occurrence_id: 'occurrence-4',
        email: 'sarah.johnson@freelance.com',
        first_name: 'Sarah',
        last_name: 'Johnson',
        username: 'sarahj',
        avatar_url: null,
        job_title: 'UX Designer',
        org_name: null,
        host: false,
        org_is_member: false,
        org_is_project_member: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        uid: '5',
        meeting_uid: meetingUid,
        occurrence_id: 'occurrence-5',
        email: 'alex@consultant.com',
        first_name: 'Alex',
        last_name: 'Consultant',
        username: 'alex_consultant',
        avatar_url: null,
        job_title: null,
        org_name: null,
        host: false,
        org_is_member: false,
        org_is_project_member: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
  }
}
