// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { BoardSeat, CommitteeSeat, OrgMembershipKeyContactPerson, VotingRecord } from '@lfx-one/shared/interfaces';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { OrgLensBoardCommitteeService } from '@services/org-lens-board-committee.service';

import { ReassignBoardRolesModalComponent, type ReassignSubmitEvent } from './reassign-board-roles-modal.component';
import { WhyCantEditModalComponent } from './why-cant-edit-modal.component';

type SectionLoadState = 'idle' | 'loading' | 'success' | 'error';

@Component({
  selector: 'lfx-board-committee-card',
  standalone: true,
  imports: [
    FormsModule,
    InputTextModule,
    ToastModule,
    TooltipModule,
    CardComponent,
    EmptyStateComponent,
    ReassignBoardRolesModalComponent,
    WhyCantEditModalComponent,
  ],
  templateUrl: './board-committee-card.component.html',
})
export class BoardCommitteeCardComponent {
  // === Inputs ===
  public readonly accountId = input.required<string>();
  public readonly foundationId = input.required<string>();
  public readonly foundationName = input<string>('');

  // === Injected services ===
  private readonly service = inject(OrgLensBoardCommitteeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageService = inject(MessageService);

  // === Internal: per-section data + load state ===
  protected readonly boardSeats = signal<BoardSeat[]>([]);
  protected readonly committeeSeats = signal<CommitteeSeat[]>([]);
  protected readonly votingHistory = signal<VotingRecord[]>([]);

  protected readonly boardState = signal<SectionLoadState>('idle');
  protected readonly committeeState = signal<SectionLoadState>('idle');
  protected readonly votingState = signal<SectionLoadState>('idle');

  /** True when ANY of the three sections has not yet resolved (shows the tab-wide skeleton). */
  protected readonly initialLoading = computed(
    () => this.boardState() === 'loading' || this.committeeState() === 'loading' || this.votingState() === 'loading'
  );

  // === Accordion state ===
  protected readonly boardExpanded = signal(true);
  protected readonly committeeExpanded = signal(false);
  protected readonly votingExpanded = signal(false);

  // === Search ===
  protected readonly searchTerm = signal('');

  /** Computed: filtered Board Seats by name OR email (case-insensitive substring). */
  protected readonly filteredBoardSeats = computed(() => this.applyFilter(this.boardSeats()));
  protected readonly filteredCommitteeSeats = computed(() => this.applyFilter(this.committeeSeats()));

  // === Modals ===
  protected readonly reassignModalVisible = signal(false);
  protected readonly reassignModalSeat = signal<BoardSeat | CommitteeSeat | null>(null);
  protected readonly reassignModalKind = signal<'board' | 'committee'>('board');

  protected readonly whyCantEditVisible = signal(false);
  protected readonly whyCantEditReason = signal<string | null>(null);
  protected readonly whyCantEditSeatId = signal<string>('');

  // === Private subjects + tracking ===
  private readonly searchInput$ = new Subject<string>();
  private hasFetched = false;

  public constructor() {
    this.searchInput$.pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe((term) => this.searchTerm.set(term));

    effect(() => {
      const accId = this.accountId();
      const foundationId = this.foundationId();
      if (accId && foundationId && !this.hasFetched) {
        this.hasFetched = true;
        this.fetchAll();
      }
    });
  }

  // === Fetch methods ===
  protected fetchAll(): void {
    this.fetchBoard();
    this.fetchCommittee();
    this.fetchVoting();
  }

  protected fetchBoard(): void {
    this.boardState.set('loading');
    this.service
      .getBoardSeats(this.accountId(), this.foundationId())
      .pipe(
        catchError(() => {
          this.boardState.set('error');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        if (response) {
          this.boardSeats.set(response.boardSeats);
          this.boardState.set('success');
        }
      });
  }

  protected fetchCommittee(): void {
    this.committeeState.set('loading');
    this.service
      .getCommitteeSeats(this.accountId(), this.foundationId())
      .pipe(
        catchError(() => {
          this.committeeState.set('error');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        if (response) {
          this.committeeSeats.set(response.committeeSeats);
          this.committeeState.set('success');
        }
      });
  }

  protected fetchVoting(): void {
    this.votingState.set('loading');
    this.service
      .getVotingHistory(this.accountId(), this.foundationId())
      .pipe(
        catchError(() => {
          this.votingState.set('error');
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        if (response) {
          this.votingHistory.set(response.votingHistory);
          this.votingState.set('success');
        }
      });
  }

  // === Search handlers ===
  protected onSearchInput(value: string): void {
    this.searchInput$.next(value);
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
    this.searchInput$.next('');
  }

  // === Accordion toggles (FR-003 / FR-003a / FR-017b) ===
  protected toggleBoard(): void {
    this.boardExpanded.update((v) => !v);
  }

  protected toggleCommittee(): void {
    this.committeeExpanded.update((v) => !v);
  }

  protected toggleVoting(): void {
    this.votingExpanded.update((v) => !v);
  }

  /** Enter / Space keyboard activation on accordion headers (FR-017b). */
  protected onAccordionKeydown(event: KeyboardEvent, section: 'board' | 'committee' | 'voting'): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (section === 'board') this.toggleBoard();
      else if (section === 'committee') this.toggleCommittee();
      else this.toggleVoting();
    }
  }

  // === Modal openers ===
  protected openReassignModal(seat: BoardSeat | CommitteeSeat, kind: 'board' | 'committee'): void {
    this.reassignModalSeat.set(seat);
    this.reassignModalKind.set(kind);
    this.reassignModalVisible.set(true);
  }

  protected openWhyCantEditModal(seat: BoardSeat | CommitteeSeat): void {
    this.whyCantEditReason.set(seat.reason);
    this.whyCantEditSeatId.set(seat.seatId);
    this.whyCantEditVisible.set(true);
  }

  /** Receives the reassign submit from the modal; applies optimistic update + refetch (FR-008h + FR-008j + FR-011d.4). */
  protected onReassignSubmit(event: ReassignSubmitEvent): void {
    const initials = (event.body.firstName.charAt(0) + event.body.lastName.charAt(0)).toUpperCase();
    const tempPerson: OrgMembershipKeyContactPerson = {
      personId: `temp-${this.generateUuid()}`,
      firstName: event.body.firstName,
      lastName: event.body.lastName,
      fullName: `${event.body.firstName} ${event.body.lastName}`,
      email: event.body.email,
      jobTitle: null,
      initials,
    };

    if (event.seatKind === 'board') {
      this.boardSeats.update((seats) => seats.map((s) => (s.seatId === event.seatId ? { ...s, person: tempPerson, votingPercentage: null } : s)));
    } else {
      this.committeeSeats.update((seats) => seats.map((s) => (s.seatId === event.seatId ? { ...s, person: tempPerson, votingPercentage: null } : s)));
    }

    this.messageService.add({
      key: 'board-toast-success-reassigned',
      severity: 'success',
      summary: 'Board roles reassigned',
      life: 3000,
    });

    if (event.seatKind === 'board') {
      this.service
        .getBoardSeats(this.accountId(), this.foundationId())
        .pipe(
          catchError(() => {
            this.messageService.add({
              key: 'board-committee-refetch-error-toast',
              severity: 'error',
              summary: 'Could not refresh board seats — please retry.',
              life: 5000,
            });
            return of(null);
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((response) => {
          if (response) this.boardSeats.set(response.boardSeats);
        });
    } else {
      this.service
        .getCommitteeSeats(this.accountId(), this.foundationId())
        .pipe(
          catchError(() => {
            this.messageService.add({
              key: 'board-committee-refetch-error-toast',
              severity: 'error',
              summary: 'Could not refresh committee seats — please retry.',
              life: 5000,
            });
            return of(null);
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((response) => {
          if (response) this.committeeSeats.set(response.committeeSeats);
        });
    }
  }

  /** Why-can't-I-edit Contact Foundation handler — explicit no-op in v1 (FR-012c). */
  protected onContactFoundationClick(): void {
    console.info('[board] contact foundation clicked for', this.whyCantEditSeatId());
  }

  // === Template helpers ===
  protected formatDate(dateString: string): string {
    if (!dateString) return '—';
    // Parse YYYY-MM-DD as a LOCAL date (not UTC). `new Date('2026-04-14')` parses as UTC
    // midnight; `.toLocaleDateString` then shifts it back one day in negative-offset
    // timezones (e.g., UTC-5 → "Apr 13"). Split-and-construct avoids the shift.
    const parts = dateString.split('-').map(Number);
    if (parts.length !== 3 || parts.some(Number.isNaN)) return dateString;
    const [year, month, day] = parts as [number, number, number];
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected voteChipClass(vote: 'Yes' | 'No' | 'Abstain' | string): string {
    switch (vote) {
      case 'Yes':
        return 'bg-green-100 text-green-800';
      case 'No':
        return 'bg-red-100 text-red-800';
      case 'Abstain':
        return 'bg-gray-100 text-gray-800';
      default:
        console.warn('[board] unexpected vote value defensively rendered as gray chip:', vote);
        return 'bg-gray-100 text-gray-600';
    }
  }

  protected trackSeatId(_index: number, seat: BoardSeat | CommitteeSeat): string {
    return seat.seatId;
  }

  protected trackVoteId(_index: number, vote: VotingRecord): string {
    return vote.voteId;
  }

  // === Private helpers ===
  private applyFilter<T extends { person: OrgMembershipKeyContactPerson }>(rows: T[]): T[] {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => r.person.fullName.toLowerCase().includes(term) || r.person.email.toLowerCase().includes(term));
  }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
