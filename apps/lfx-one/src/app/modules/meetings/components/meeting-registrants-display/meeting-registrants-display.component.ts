// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, InputSignal, output, OutputEmitterRef, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { ButtonComponent } from '@components/button/button.component';
import { SelectComponent } from '@components/select/select.component';
import { Meeting, MeetingRegistrant, PastMeeting, PastMeetingParticipant } from '@lfx-one/shared';
import { markFormControlsAsTouched } from '@lfx-one/shared/utils';
import { MeetingService } from '@services/meeting.service';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  merge,
  of,
  pairwise,
  startWith,
  Subject,
  switchMap,
  take,
  tap,
} from 'rxjs';

import { RegistrantFormComponent } from '../registrant-form/registrant-form.component';

@Component({
  selector: 'lfx-meeting-registrants-display',
  imports: [AvatarComponent, ButtonComponent, TooltipModule, ReactiveFormsModule, RegistrantFormComponent, SelectComponent, NgClass],
  templateUrl: './meeting-registrants-display.component.html',
})
export class MeetingRegistrantsDisplayComponent {
  // === Services ===
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // === Inputs ===
  public readonly meeting: InputSignal<Meeting | PastMeeting> = input.required<Meeting | PastMeeting>();
  public readonly pastMeeting: InputSignal<boolean> = input<boolean>(false);
  public readonly visible: InputSignal<boolean> = input<boolean>(false);
  public readonly showAddRegistrant: InputSignal<boolean> = input<boolean>(false);
  public readonly myMeetingRegistrants: InputSignal<boolean> = input<boolean>(false);
  // Gates the past-meeting participants self-fetch. When the parent (e.g. the public meeting-join
  // page) knows the viewer does not have full access, it can pass `false` so the child skips the
  // network call entirely and the drawer header / body stay consistent. Defaults to `true` so
  // existing callers (meeting-card on the dashboard) keep their previous behavior.
  public readonly pastMeetingFullAccess: InputSignal<boolean> = input<boolean>(true);
  // Externally-managed mode: when the parent already owns the registrants list (e.g. on the
  // meeting join page) it can pass it in here to avoid a duplicate fetch on drawer open. The
  // child uses the seed as its source and emits refreshRequested when the data needs to be
  // re-pulled (e.g. after adding a guest). Pass `null` (default) to keep the legacy self-fetch
  // behavior used by meeting-card.
  public readonly initialRegistrants: InputSignal<MeetingRegistrant[] | null> = input<MeetingRegistrant[] | null>(null);
  // Same externally-managed pattern for past-meeting participants; allows parent components
  // to reuse already-fetched participant data and avoid a duplicate fetch when opening drawers.
  public readonly initialPastParticipants: InputSignal<PastMeetingParticipant[] | null> = input<PastMeetingParticipant[] | null>(null);
  public readonly initialPastParticipantsLoading: InputSignal<boolean> = input<boolean>(false);
  public readonly initialRegistrantsLoading: InputSignal<boolean> = input<boolean>(false);

  // === Outputs ===
  public readonly registrantsCountChange: OutputEmitterRef<number> = output<number>();
  public readonly refreshRequested: OutputEmitterRef<number> = output<number>();

  // === Static Options ===
  protected readonly rsvpFilterOptions = [
    { label: 'All RSVPs', value: 'all' },
    { label: 'Accepted', value: 'yes' },
    { label: 'Declined', value: 'no' },
    { label: 'Pending', value: 'pending' },
  ];

  // === Forms ===
  protected addRegistrantForm: FormGroup;
  protected readonly searchControl: FormControl<string> = new FormControl<string>('', { nonNullable: true });
  protected readonly rsvpFilterControl: FormControl<string> = new FormControl<string>('all', { nonNullable: true });
  protected readonly groupFilterControl: FormControl<string> = new FormControl<string>('all', { nonNullable: true });
  protected readonly filterForm: FormGroup = new FormGroup({
    rsvpFilter: this.rsvpFilterControl,
    groupFilter: this.groupFilterControl,
  });

  // === Internal Streams ===
  // Manual triggers (refresh button, post-add refetch) merge with the visibility-driven trigger
  // inside the init* pipelines below.
  private readonly manualRefresh$ = new Subject<void>();

  // === WritableSignals ===
  // Initialized to `false` — the lazy-load pipelines flip it to `true` via `tap` when a fetch
  // actually starts. The drawer is closed on initial render, so there is no upfront work to mask.
  private readonly internalLoading = signal(false);
  protected readonly additionalRegistrantsCount = signal(0);
  protected readonly showAddForm = signal(false);
  protected readonly submitting = signal(false);

  // === Computed Signals ===
  private readonly externallyManaged: Signal<boolean> = computed(() => this.initialRegistrants() !== null);
  private readonly externallyManagedPast: Signal<boolean> = computed(() => this.pastMeeting() && this.initialPastParticipants() !== null);
  private readonly internalRegistrants: Signal<MeetingRegistrant[]> = this.initRegistrantsList();
  private readonly internalPastMeetingParticipants: Signal<PastMeetingParticipant[]> = this.initPastMeetingParticipantsList();
  protected readonly pastMeetingParticipants: Signal<PastMeetingParticipant[]> = computed(() => {
    if (this.externallyManagedPast()) {
      const seed = this.initialPastParticipants() ?? [];
      return [...seed].sort((a, b) => a.first_name?.localeCompare(b.first_name ?? '') ?? 0) as PastMeetingParticipant[];
    }
    return this.internalPastMeetingParticipants();
  });
  protected readonly registrants: Signal<MeetingRegistrant[]> = computed(() => {
    if (this.externallyManaged()) {
      const seed = this.initialRegistrants() ?? [];
      return [...seed].sort((a, b) => a.first_name?.localeCompare(b.first_name ?? '') ?? 0) as MeetingRegistrant[];
    }
    return this.internalRegistrants();
  });
  protected readonly registrantsLoading: Signal<boolean> = computed(() => {
    if (this.externallyManagedPast()) {
      return this.initialPastParticipantsLoading();
    }
    // Upcoming meetings can be externally managed by the parent. Past meetings can now also be
    // externally managed via initialPastParticipants.
    if (this.externallyManaged() && !this.pastMeeting()) {
      return this.initialRegistrantsLoading();
    }
    return this.internalLoading();
  });
  protected readonly groupFilterOptions = this.initGroupFilterOptions();
  protected readonly hasCommittees = this.initHasCommittees();
  protected readonly searchQuery: Signal<string> = toSignal(this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300)), { initialValue: '' });
  protected readonly rsvpFilter: Signal<string> = toSignal(this.rsvpFilterControl.valueChanges.pipe(startWith('all')), { initialValue: 'all' });
  protected readonly groupFilter: Signal<string> = toSignal(this.groupFilterControl.valueChanges.pipe(startWith('all')), { initialValue: 'all' });
  protected readonly filteredRegistrants = this.initFilteredRegistrants();
  protected readonly filteredPastParticipants = this.initFilteredPastParticipants();

  // === Constructor ===
  public constructor() {
    this.addRegistrantForm = this.meetingService.createRegistrantFormGroup(false);

    // Reset inline add form when drawer closes (open → closed transition).
    toObservable(this.visible)
      .pipe(
        pairwise(),
        filter(([prev, curr]) => prev && !curr),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.showAddForm.set(false);
        this.addRegistrantForm.reset();
      });
  }

  // === Public Methods ===
  public refresh(): void {
    this.manualRefresh$.next();
  }

  // === Protected Methods (template handlers) ===
  protected toggleAddForm(): void {
    const isShowing = this.showAddForm();
    this.showAddForm.set(!isShowing);
    if (isShowing) {
      this.addRegistrantForm.reset();
    }
  }

  protected onAddRegistrant(): void {
    if (this.submitting()) return;

    if (this.addRegistrantForm.valid) {
      this.submitting.set(true);
      const formValue = this.addRegistrantForm.value;
      const createData = this.meetingService.stripMetadata(this.meeting().id, formValue);

      this.meetingService
        .addMeetingRegistrants(this.meeting().id, [createData])
        .pipe(take(1))
        .subscribe({
          next: (response) => {
            this.submitting.set(false);
            if (response.summary.successful > 0) {
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Guest added successfully' });
              if (this.externallyManaged()) {
                // Parent owns the data — request a refetch and let it bump its own optimistic count.
                this.refreshRequested.emit(response.summary.successful);
              } else {
                // Self-managed mode: optimistically increment locally (query indexing is async).
                this.additionalRegistrantsCount.update((c) => c + response.summary.successful);
                this.registrantsCountChange.emit(this.additionalRegistrantsCount());
                this.manualRefresh$.next();
              }
              this.addRegistrantForm.reset();
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: response.failures[0]?.error?.message || 'Failed to add guest',
              });
            }
          },
          error: () => {
            this.submitting.set(false);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add guest. Please try again.' });
          },
        });
    } else {
      markFormControlsAsTouched(this.addRegistrantForm);
    }
  }

  protected onUserSelectedFromSearch(): void {
    this.onAddRegistrant();
  }

  // === Private Initializers ===
  private initRegistrantsList(): Signal<MeetingRegistrant[]> {
    // Trigger sources: drawer becoming visible (only for upcoming, self-managed mode) and explicit
    // manual refreshes (post-add refetch, public refresh()).
    const visibleTrigger$ = combineLatest([toObservable(this.visible), toObservable(this.myMeetingRegistrants)]).pipe(
      filter(([visible]) => visible && !this.pastMeeting() && !this.externallyManaged()),
      distinctUntilChanged(([prevVisible, prevUseMy], [currVisible, currUseMy]) => prevVisible === currVisible && prevUseMy === currUseMy)
    );

    return toSignal(
      merge(visibleTrigger$.pipe(map(() => undefined)), this.manualRefresh$).pipe(
        takeUntilDestroyed(),
        // Re-check guards on every emission — externallyManaged can flip at runtime.
        filter(() => !this.pastMeeting() && !this.externallyManaged()),
        tap(() => this.internalLoading.set(true)),
        switchMap(() => {
          // Use access-controlled endpoint for meeting join page, regular endpoint for organizer views.
          const registrantsObservable = this.myMeetingRegistrants()
            ? this.meetingService.getMyMeetingRegistrants(this.meeting().id, true)
            : this.meetingService.getMeetingRegistrants(this.meeting().id, true);

          return registrantsObservable.pipe(
            map((registrants) => registrants.sort((a, b) => a.first_name?.localeCompare(b.first_name ?? '') ?? 0) as MeetingRegistrant[]),
            tap((registrants) => {
              const baseCount = (this.meeting().individual_registrants_count || 0) + (this.meeting().committee_members_count || 0);
              const fetchedAdditional = Math.max(0, registrants.length - baseCount);
              // Never decrease below the current optimistic count (async indexing may lag).
              const additionalCount = Math.max(fetchedAdditional, this.additionalRegistrantsCount());
              this.additionalRegistrantsCount.set(additionalCount);
              this.registrantsCountChange.emit(additionalCount);
            }),
            catchError(() => of([] as MeetingRegistrant[])),
            finalize(() => this.internalLoading.set(false))
          );
        })
      ),
      { initialValue: [] as MeetingRegistrant[] }
    );
  }

  private initPastMeetingParticipantsList(): Signal<PastMeetingParticipant[]> {
    // Past-meeting fetch is gated by visibility, the past-meeting flag, full-access permission,
    // and the externally-managed seed not being present. Re-check guards on every emission so a
    // late-flipping `pastMeetingFullAccess` (e.g. after the access check resolves on the public
    // meeting-join page) can still drive the fetch.
    const visibleTrigger$ = toObservable(this.visible).pipe(
      filter((visible) => visible && this.pastMeeting() && this.pastMeetingFullAccess() && !this.externallyManagedPast()),
      distinctUntilChanged()
    );

    return toSignal(
      merge(visibleTrigger$.pipe(map(() => undefined)), this.manualRefresh$).pipe(
        takeUntilDestroyed(),
        filter(() => this.pastMeeting() && this.pastMeetingFullAccess() && !this.externallyManagedPast()),
        tap(() => this.internalLoading.set(true)),
        switchMap(() =>
          this.meetingService.getPastMeetingParticipants(this.meeting().id).pipe(
            map((participants) => participants.sort((a, b) => a.first_name?.localeCompare(b.first_name ?? '') ?? 0) as PastMeetingParticipant[]),
            catchError(() => of([] as PastMeetingParticipant[])),
            finalize(() => this.internalLoading.set(false))
          )
        )
      ),
      { initialValue: [] as PastMeetingParticipant[] }
    );
  }

  private initGroupFilterOptions(): Signal<{ label: string; value: string }[]> {
    return computed(() => {
      const meeting = this.meeting();
      const committees = (meeting as Meeting).committees || [];

      const options = [{ label: 'All Groups', value: 'all' }];

      committees.forEach((committee) => {
        if (committee.name) {
          options.push({ label: committee.name, value: committee.uid });
        }
      });

      return options;
    });
  }

  private initHasCommittees(): Signal<boolean> {
    return computed(() => {
      const meeting = this.meeting();
      return ((meeting as Meeting).committees?.length || 0) > 0;
    });
  }

  private initFilteredRegistrants(): Signal<MeetingRegistrant[]> {
    return computed(() => {
      const registrants = this.registrants();
      const query = this.searchQuery().toLowerCase().trim();
      const rsvp = this.rsvpFilter();
      const group = this.groupFilter();

      return registrants.filter((registrant) => {
        const matchesSearch =
          !query ||
          registrant.first_name?.toLowerCase().includes(query) ||
          registrant.last_name?.toLowerCase().includes(query) ||
          registrant.email?.toLowerCase().includes(query) ||
          registrant.org_name?.toLowerCase().includes(query);

        // RSVP filter (must match display logic in template).
        let matchesRsvp = true;
        if (rsvp !== 'all') {
          if (rsvp === 'yes') {
            matchesRsvp = registrant.rsvp?.response_type === 'accepted' || registrant.invite_accepted === true;
          } else if (rsvp === 'no') {
            matchesRsvp = registrant.rsvp?.response_type === 'declined' || registrant.invite_accepted === false;
          } else if (rsvp === 'pending') {
            const isAccepted = registrant.rsvp?.response_type === 'accepted' || registrant.invite_accepted === true;
            const isDeclined = registrant.rsvp?.response_type === 'declined' || registrant.invite_accepted === false;
            matchesRsvp = !isAccepted && !isDeclined;
          }
        }

        const matchesGroup = group === 'all' || registrant.committee_uid === group;

        return matchesSearch && matchesRsvp && matchesGroup;
      });
    });
  }

  private initFilteredPastParticipants(): Signal<PastMeetingParticipant[]> {
    return computed(() => {
      const participants = this.pastMeetingParticipants();
      const query = this.searchQuery().toLowerCase().trim();

      if (!query) {
        return participants;
      }

      return participants.filter(
        (participant) =>
          participant.first_name?.toLowerCase().includes(query) ||
          participant.last_name?.toLowerCase().includes(query) ||
          participant.email?.toLowerCase().includes(query)
      );
    });
  }
}
