// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CardComponent } from '@components/card/card.component';
import { VOTE_LABEL } from '@lfx-one/shared';
import { PaginatedResponse, Vote, VoteFilterState } from '@lfx-one/shared/interfaces';
import { VoteService } from '@services/vote.service';
import { BehaviorSubject, catchError, combineLatest, map, of, switchMap, tap } from 'rxjs';

import { VoteResultsDrawerComponent } from '@app/modules/votes/components/vote-results-drawer/vote-results-drawer.component';
import { VotesTableComponent } from '@app/modules/votes/components/votes-table/votes-table.component';

@Component({
  selector: 'lfx-committee-votes-list',
  imports: [CardComponent, VotesTableComponent, VoteResultsDrawerComponent],
  templateUrl: './committee-votes-list.component.html',
})
export class CommitteeVotesListComponent {
  // === Services ===
  private readonly voteService = inject(VoteService);

  // === Constants ===
  protected readonly voteLabelPlural = VOTE_LABEL.plural;

  // === Inputs ===
  public readonly projectUid = input.required<string>();
  public readonly committeeName = input.required<string>();
  public readonly hasPMOAccess = input<boolean>(false);

  // === Subjects ===
  private readonly fetch$ = new BehaviorSubject<void>(undefined);
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  // === Writable Signals ===
  protected readonly loading = signal<boolean>(true);
  protected readonly resultsDrawerVisible = signal<boolean>(false);
  protected readonly selectedVoteId = signal<string | null>(null);
  protected readonly rowsPerPage = signal<number>(10);
  protected readonly currentFirst = signal<number>(0);
  protected readonly totalRecords = signal<number>(0);

  // === Filter State ===
  protected readonly filters = signal<VoteFilterState>({ search: '', status: null, group: null });

  // === Page Tokens ===
  private pageTokens: string[] = [];

  // === Computed Signals ===
  protected readonly votes: Signal<Vote[]> = this.initVotes();
  protected readonly selectedListVote: Signal<Vote | null> = this.initSelectedListVote();
  protected readonly totalCount: Signal<number> = this.initTotalCount();

  // === Protected Methods ===
  protected onViewVote(voteId: string): void {
    this.selectedVoteId.set(voteId);
    this.resultsDrawerVisible.set(true);
  }

  protected refreshVotes(): void {
    this.loading.set(true);
    this.pageTokens = [];
    this.currentFirst.set(0);
    this.fetch$.next();
    this.refresh$.next();
  }

  protected onPageChange(event: { first: number; rows: number }): void {
    if (event.rows !== this.rowsPerPage()) {
      this.pageTokens = [];
      this.rowsPerPage.set(event.rows);
      this.currentFirst.set(0);
      this.fetch$.next();
      return;
    }

    this.currentFirst.set(event.first);
    this.fetch$.next();
  }

  protected onFiltersChange(state: VoteFilterState): void {
    this.pageTokens = [];
    this.currentFirst.set(0);
    this.filters.set(state);
  }

  // === Private Helpers ===
  private buildFilters(): string[] {
    const queryFilters: string[] = [`committee_name:${this.committeeName()}`];
    const { status } = this.filters();
    if (status) {
      queryFilters.push(`status:${status}`);
    }
    return queryFilters;
  }

  // === Private Initializers ===
  private initTotalCount(): Signal<number> {
    const filters$ = toObservable(this.filters);
    const projectUid$ = toObservable(this.projectUid);
    const committeeName$ = toObservable(this.committeeName);

    return toSignal(
      combineLatest([projectUid$, committeeName$, filters$, this.refresh$]).pipe(
        switchMap(([projectUid]) => {
          if (!projectUid) return of(0);
          const searchName = this.filters().search;
          const queryFilters = this.buildFilters();
          return this.voteService.getVotesCountByProject(projectUid, searchName || undefined, queryFilters).pipe(
            tap((count) => this.totalRecords.set(count)),
            catchError(() => {
              this.totalRecords.set(0);
              return of(0);
            })
          );
        })
      ),
      { initialValue: 0 }
    );
  }

  private initVotes(): Signal<Vote[]> {
    const filters$ = toObservable(this.filters);
    const projectUid$ = toObservable(this.projectUid);
    const committeeName$ = toObservable(this.committeeName);

    return toSignal(
      combineLatest([projectUid$, committeeName$, filters$, this.fetch$]).pipe(
        tap(() => this.loading.set(true)),
        switchMap(([projectUid]) => {
          if (!projectUid) {
            this.loading.set(false);
            return of([]);
          }

          const rows = this.rowsPerPage();
          const first = this.currentFirst();
          const pageIndex = first / rows;
          const pageToken = pageIndex > 0 ? this.pageTokens[pageIndex - 1] : undefined;

          if (pageIndex > 0 && !pageToken) {
            this.currentFirst.set(0);
            this.loading.set(false);
            return of([]);
          }

          const searchName = this.filters().search;
          const queryFilters = this.buildFilters();

          return this.voteService.getVotesByProjectPaginated(projectUid, rows, pageToken, searchName || undefined, queryFilters).pipe(
            tap((response: PaginatedResponse<Vote>) => {
              if (response.page_token) {
                this.pageTokens[pageIndex] = response.page_token;
              }
              this.loading.set(false);
            }),
            map((response: PaginatedResponse<Vote>) => response.data),
            catchError(() => {
              this.loading.set(false);
              return of([]);
            })
          );
        })
      ),
      { initialValue: [] }
    );
  }

  private initSelectedListVote(): Signal<Vote | null> {
    return computed(() => {
      const id = this.selectedVoteId();
      if (!id) return null;
      return this.votes().find((v) => v.uid === id) || null;
    });
  }
}
