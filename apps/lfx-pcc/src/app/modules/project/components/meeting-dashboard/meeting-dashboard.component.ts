// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@app/shared/components/button/button.component';
import { CardComponent } from '@app/shared/components/card/card.component';
import { DropdownComponent } from '@app/shared/components/dropdown/dropdown.component';
import { InputTextComponent } from '@app/shared/components/input-text/input-text.component';
import { MeetingCardComponent } from '@app/shared/components/meeting-card/meeting-card.component';
import { MenuComponent } from '@app/shared/components/menu/menu.component';
import { MeetingService } from '@app/shared/services/meeting.service';
import { ProjectService } from '@app/shared/services/project.service';
import { Meeting } from '@lfx-pcc/shared/interfaces';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';
import { ConfirmationService, MenuItem } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, tap } from 'rxjs/operators';

@Component({
  selector: 'lfx-meeting-dashboard',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    MenuComponent,
    MeetingCardComponent,
    InputTextComponent,
    DropdownComponent,
    ButtonComponent,
    ConfirmDialogModule,
    AnimateOnScrollModule,
  ],
  templateUrl: './meeting-dashboard.component.html',
  styleUrl: './meeting-dashboard.component.scss',
})
export class MeetingDashboardComponent {
  // Injected services
  private readonly projectService = inject(ProjectService);
  private readonly meetingService = inject(MeetingService);
  private readonly confirmationService = inject(ConfirmationService);

  // Class variables with types
  public project: typeof this.projectService.project;
  public selectedMeeting: WritableSignal<Meeting | null>;
  public isDeleting: WritableSignal<boolean>;
  public searchForm: FormGroup;
  public visibilityFilter: WritableSignal<string | null>;
  private searchTerm: Signal<string>;
  public meetingsLoading: WritableSignal<boolean>;
  public meetings: Signal<Meeting[]>;
  public visibilityOptions: Signal<{ label: string; value: string | null }[]>;
  public filteredMeetings: Signal<Meeting[]>;
  public publicMeetingsCount: Signal<number>;
  public privateMeetingsCount: Signal<number>;
  public restrictedMeetingsCount: Signal<number>;
  public menuItems: MenuItem[];
  public actionMenuItems: MenuItem[];

  public constructor() {
    // Initialize all class variables
    this.project = this.projectService.project;
    this.selectedMeeting = signal<Meeting | null>(null);
    this.isDeleting = signal<boolean>(false);
    this.meetingsLoading = signal<boolean>(true);
    this.meetings = this.initializeMeetings();
    this.searchForm = this.initializeSearchForm();
    this.visibilityFilter = signal<string | null>(null);
    this.searchTerm = this.initializeSearchTerm();
    this.visibilityOptions = this.initializeVisibilityOptions();
    this.filteredMeetings = this.initializeFilteredMeetings();
    this.publicMeetingsCount = this.initializePublicMeetingsCount();
    this.privateMeetingsCount = this.initializePrivateMeetingsCount();
    this.restrictedMeetingsCount = this.initializeRestrictedMeetingsCount();
    this.menuItems = this.initializeMenuItems();
    this.actionMenuItems = this.initializeActionMenuItems();
  }

  public scheduleNewMeeting(): void {
    // TODO: Open create dialog when form is available
  }

  public onVisibilityChange(value: string | null): void {
    this.visibilityFilter.set(value);
  }

  public onMenuToggle(event: { event: Event; meeting: Meeting; menuComponent: MenuComponent }): void {
    this.selectedMeeting.set(event.meeting);
    event.menuComponent.toggle(event.event);
  }

  // Action handlers
  private viewMeeting(): void {
    const meeting = this.selectedMeeting();
    if (meeting) {
      // TODO: Navigate to meeting details when route is available
    }
  }

  private editMeeting(): void {
    const meeting = this.selectedMeeting();
    if (meeting) {
      // TODO: Open edit dialog when form is available
    }
  }

  private deleteMeeting(): void {
    const meeting = this.selectedMeeting();
    if (!meeting) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete this meeting? This action cannot be undone.`,
      header: 'Delete Meeting',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => {
        // TODO: Implement delete when API endpoint is available
      },
    });
  }

  // Private initialization methods
  private initializeSearchForm(): FormGroup {
    return new FormGroup({
      search: new FormControl<string>(''),
      visibility: new FormControl<string | null>(null),
    });
  }

  private initializeSearchTerm(): Signal<string> {
    return toSignal(this.searchForm.get('search')!.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()), { initialValue: '' });
  }

  private initializeMeetings(): Signal<Meeting[]> {
    return toSignal(
      this.project()
        ? this.meetingService.getMeetingsByProject(this.project()!.id, undefined, 'start_time.asc.nullslast').pipe(tap(() => this.meetingsLoading.set(false)))
        : of([]),
      {
        initialValue: [],
      }
    );
  }

  private initializeVisibilityOptions(): Signal<{ label: string; value: string | null }[]> {
    return signal([
      { label: 'All Meetings', value: null },
      { label: 'Public', value: 'public' },
      { label: 'Private', value: 'private' },
      { label: 'Restricted', value: 'restricted' },
    ]);
  }

  private initializeFilteredMeetings(): Signal<Meeting[]> {
    return computed(() => {
      let filtered = this.meetings();

      // Apply search filter
      const searchTerm = this.searchTerm()?.toLowerCase() || '';
      if (searchTerm) {
        filtered = filtered.filter(
          (meeting) =>
            meeting.topic?.toLowerCase().includes(searchTerm) ||
            meeting.agenda?.toLowerCase().includes(searchTerm) ||
            meeting.meeting_type?.toLowerCase().includes(searchTerm)
        );
      }

      // Apply visibility filter
      const visibility = this.visibilityFilter();
      if (visibility) {
        filtered = filtered.filter((meeting) => meeting.visibility === visibility);
      }

      return filtered;
    });
  }

  private initializeMenuItems(): MenuItem[] {
    return [
      {
        label: 'Schedule Meeting',
        icon: 'fa-light fa-calendar-plus text-sm',
        command: () => this.scheduleNewMeeting(),
      },
      {
        label: 'Meeting History',
        icon: 'fa-light fa-calendar-days text-sm',
      },
      {
        label: 'Public Calendar',
        icon: 'fa-light fa-calendar-check text-sm',
      },
    ];
  }

  private initializeActionMenuItems(): MenuItem[] {
    return [
      {
        label: 'View',
        icon: 'fa-light fa-eye',
        command: () => this.viewMeeting(),
      },
      {
        label: 'Edit',
        icon: 'fa-light fa-edit',
        command: () => this.editMeeting(),
      },
      {
        separator: true,
      },
      {
        label: 'Delete',
        icon: 'fa-light fa-trash',
        styleClass: 'text-red-500',
        disabled: this.isDeleting(),
        command: () => this.deleteMeeting(),
      },
    ];
  }

  private initializePublicMeetingsCount(): Signal<number> {
    return computed(() => this.meetings().filter((m) => m.visibility === 'public').length);
  }

  private initializePrivateMeetingsCount(): Signal<number> {
    return computed(() => this.meetings().filter((m) => m.visibility === 'private').length);
  }

  private initializeRestrictedMeetingsCount(): Signal<number> {
    return computed(() => this.meetings().filter((m) => m.visibility === 'restricted').length);
  }
}
