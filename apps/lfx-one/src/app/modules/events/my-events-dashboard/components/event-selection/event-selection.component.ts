// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EventsService } from '@app/shared/services/events.service';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { RequestType, SearchEvent, SearchEventsResponse, TimeFilterValue } from '@lfx-one/shared/interfaces';
import { MessageService } from 'primeng/api';
import { catchError, combineLatest, debounceTime, EMPTY, finalize, of, scan, skip, switchMap, tap } from 'rxjs';
import { EVENT_SELECTION_PAGE_SIZE } from '@lfx-one/shared/constants/events.constants';
@Component({
  selector: 'lfx-event-selection',
  imports: [ButtonComponent, ReactiveFormsModule, SelectComponent, InputTextComponent],
  templateUrl: './event-selection.component.html',
  styleUrl: './event-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventSelectionComponent {
  private readonly eventsService = inject(EventsService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly messageService = inject(MessageService);

  public readonly type = input.required<RequestType>();
  public selectedEvent = model<SearchEvent | null>(null);

  // Search via its own form (required by lfx-input-text); debounced separately to avoid extra API calls on each keystroke
  public readonly searchForm = this.fb.group({ searchQuery: '' });

  // Time and location filters via reactive form (required by lfx-select)
  public readonly filtersForm = this.fb.group({
    timeFilter: 'any' as TimeFilterValue,
    locationFilter: 'any' as string,
  });

  private readonly filtersValue = toSignal(this.filtersForm.valueChanges, {
    initialValue: this.filtersForm.getRawValue(),
  });

  // Events & pagination
  protected readonly loading = signal(true);
  protected readonly loadingMore = signal(false);
  private currentOffset = signal(0);

  // Location filter options loaded once
  private readonly countriesResponse = this.initializeCountries();
  protected readonly availableLocations = computed(() => [
    { label: 'Anywhere', value: 'any' },
    ...this.countriesResponse().data.map((c) => ({ label: c, value: c })),
  ]);

  protected readonly timeFilterOptions: { label: string; value: TimeFilterValue }[] = [
    { label: 'Any Time', value: 'any' },
    { label: 'This Month', value: 'this-month' },
    { label: 'Next 3 Months', value: 'next-3-months' },
  ];

  // Debounced search to avoid API calls on every keystroke
  private readonly debouncedSearch = toSignal(this.searchForm.get('searchQuery')!.valueChanges.pipe(debounceTime(500)), { initialValue: '' });

  // Combined server-side filter params — changing this resets pagination and triggers a reload
  private readonly activeFilters = computed(() => ({
    searchQuery: this.debouncedSearch() || undefined,
    ...this.computeTimeFilterParams(this.filtersValue().timeFilter as TimeFilterValue),
    country: this.filtersValue().locationFilter !== 'any' ? (this.filtersValue().locationFilter ?? undefined) : undefined,
  }));

  // Initial events loaded reactively from activeFilters
  private readonly initialEventsResponse = this.initializeEvents();

  // Combine initial events with any "load more" results
  protected readonly allEvents = computed(() => this.initialEventsResponse().data);
  protected readonly hasMore = computed(() => this.initialEventsResponse().metadata.hasNextPage);

  public constructor() {
    // Reset additional events when filters change (skip initial emission)
    toObservable(this.activeFilters)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        this.currentOffset.set(0);
      });
  }

  public onSelectEvent(event: SearchEvent): void {
    this.selectedEvent.set(event);
  }

  public onLoadMore(): void {
    this.currentOffset.update((current) => current + EVENT_SELECTION_PAGE_SIZE);
  }

  private computeTimeFilterParams(timeFilter: TimeFilterValue): { startDateFrom?: string; startDateTo?: string } {
    if (timeFilter === 'this-month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { startDateFrom: firstDay.toISOString(), startDateTo: lastDay.toISOString() };
    }

    if (timeFilter === 'next-3-months') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const threeMonthsLater = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate(), 23, 59, 59, 999);
      return { startDateFrom: now.toISOString(), startDateTo: threeMonthsLater.toISOString() };
    }

    return {};
  }
  private initializeEvents() {
    const emptyResponse: SearchEventsResponse = { data: [], metadata: { offset: 0, pageSize: 0, totalSize: 0, hasNextPage: false } };

    return toSignal(
      combineLatest([toObservable(this.activeFilters), toObservable(this.currentOffset)]).pipe(
        tap(() => {
          if (this.currentOffset() === 0) {
            this.loading.set(true);
          } else {
            this.loadingMore.set(true);
          }
        }),
        switchMap(([filters, offset]) =>
          this.eventsService.searchEventsForApplication({ type: this.type(), pageSize: EVENT_SELECTION_PAGE_SIZE, offset, ...filters }).pipe(
            catchError(() => {
              if (offset === 0) {
                // Initial load failed - show empty state
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load events. Please try again.' });
                return of(emptyResponse);
              }
              // Load more failed - revert offset so retry fetches the same page
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load more events. Please try again.' });
              this.currentOffset.update((curr) => Math.max(0, curr - EVENT_SELECTION_PAGE_SIZE));
              return EMPTY; // Don't emit to scan, preserving existing data
            }),
            finalize(() => {
              this.loading.set(false);
              this.loadingMore.set(false);
            })
          )
        ),
        scan((acc, curr) => {
          // Reset when offset is 0 (filter changed), otherwise accumulate
          if (curr.metadata.offset === 0) {
            return curr;
          }
          return { ...curr, data: [...acc.data, ...curr.data] };
        }, emptyResponse)
      ),
      { initialValue: emptyResponse }
    );
  }

  private initializeCountries() {
    return toSignal(this.eventsService.getUpcomingCountries().pipe(catchError(() => of({ data: [] }))), {
      initialValue: { data: [] as string[] },
    });
  }
}
