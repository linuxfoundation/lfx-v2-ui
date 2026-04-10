// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, model, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EventsService } from '@app/shared/services/events.service';
import { ButtonComponent } from '@components/button/button.component';
import { SelectComponent } from '@components/select/select.component';
import { EMPTY_MY_EVENTS_RESPONSE } from '@lfx-one/shared/constants';
import { MyEvent } from '@lfx-one/shared/interfaces';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, debounceTime, finalize, of, skip, switchMap, tap } from 'rxjs';

type TimeFilterValue = 'any' | 'this-month' | 'next-3-months';

const PAGE_SIZE = 12;

@Component({
  selector: 'lfx-event-selection',
  imports: [ButtonComponent, ReactiveFormsModule, SelectComponent, IconFieldModule, InputIconModule, InputTextModule],
  templateUrl: './event-selection.component.html',
  styleUrl: './event-selection.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventSelectionComponent {
  private readonly eventsService = inject(EventsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  public selectedEvent = model<MyEvent | null>(null);

  // Search filter (plain signal — debounced before sending to API)
  public searchQuery = signal('');

  // Time and location filters via reactive form (required by lfx-select)
  public readonly filtersForm = this.fb.group({
    timeFilter: 'any' as TimeFilterValue,
    locationFilter: 'any' as string,
  });

  private readonly filtersValue = toSignal(this.filtersForm.valueChanges, {
    initialValue: this.filtersForm.getRawValue(),
  });

  // Events & pagination
  public loading = signal(true);
  public loadingMore = signal(false);
  public allEvents = signal<MyEvent[]>([]);
  public totalFromServer = signal(0);
  public availableLocations = signal<{ label: string; value: string }[]>([{ label: 'Any Where', value: 'any' }]);
  private currentOffset = 0;

  public hasMore = computed(() => this.allEvents().length < this.totalFromServer());

  public readonly timeFilterOptions: { label: string; value: TimeFilterValue }[] = [
    { label: 'Any Time', value: 'any' },
    { label: 'This Month', value: 'this-month' },
    { label: 'Next 3 Months', value: 'next-3-months' },
  ];

  // Debounced search to avoid API calls on every keystroke
  private readonly debouncedSearch = toSignal(toObservable(this.searchQuery).pipe(debounceTime(500)), { initialValue: '' });

  // Combined server-side filter params — changing this resets pagination and triggers a reload
  private readonly activeFilters = computed(() => ({
    searchQuery: this.debouncedSearch() || undefined,
    ...this.computeTimeFilterParams(this.filtersValue().timeFilter as TimeFilterValue),
    country: this.filtersValue().locationFilter !== 'any' ? (this.filtersValue().locationFilter ?? undefined) : undefined,
  }));

  public constructor() {
    // Reset and reload when filters change (skip initial emission)
    toObservable(this.activeFilters)
      .pipe(skip(1), debounceTime(0), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadInitialEvents());

    this.loadInitialEvents();
    this.loadCountries();
  }

  public onSelectEvent(event: MyEvent): void {
    this.selectedEvent.set(event);
  }

  public onLoadMore(): void {
    this.currentOffset += PAGE_SIZE;
    this.loadingMore.set(true);

    this.eventsService
      .getMyEvents({ isPast: false, pageSize: PAGE_SIZE, offset: this.currentOffset, registeredFirst: true, ...this.activeFilters() })
      .pipe(
        catchError(() => of(EMPTY_MY_EVENTS_RESPONSE)),
        finalize(() => this.loadingMore.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.allEvents.update((current) => [...current, ...response.data]);
        this.totalFromServer.set(response.total);
      });
  }

  private loadInitialEvents(): void {
    this.loading.set(true);
    this.currentOffset = 0;

    this.eventsService
      .getMyEvents({ isPast: false, pageSize: PAGE_SIZE, offset: 0, registeredFirst: true, ...this.activeFilters() })
      .pipe(
        catchError(() => of(EMPTY_MY_EVENTS_RESPONSE)),
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((response) => {
        this.allEvents.set(response.data);
        this.totalFromServer.set(response.total);
      });
  }

  private loadCountries(): void {
    this.eventsService
      .getUpcomingCountries()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((response) => {
        this.availableLocations.set([{ label: 'Any Where', value: 'any' }, ...response.data.map((c) => ({ label: c, value: c }))]);
      });
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
}
