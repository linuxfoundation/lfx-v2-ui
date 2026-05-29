// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import {
  DEFAULT_EVENTS_PAGE_SIZE,
  DEFAULT_ORG_EVENTS_TAB_ID,
  EMPTY_ORG_EVENTS_RESPONSE,
  ORG_EVENTS_STATUS_OPTIONS,
  ORG_EVENTS_TABS,
  VALID_ORG_EVENTS_TAB_IDS,
} from '@lfx-one/shared/constants';
import type {
  FilterPillOption,
  OrgEvent,
  OrgEventStatFilterId,
  OrgEventsResponse,
  OrgEventsSummary,
  OrgEventsTabId,
  PageChangeEvent,
  SortChangeEvent,
} from '@lfx-one/shared/interfaces';
import { AccountContextService } from '@app/shared/services/account-context.service';
import { EventsService } from '@app/shared/services/events.service';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { catchError, combineLatest, debounceTime, filter, finalize, of, skip, switchMap, tap } from 'rxjs';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { DiscoverEventsButtonComponent } from '../components/discover-events-button/discover-events-button.component';
import { EventAttendeesDrawerComponent } from './components/event-attendees-drawer/event-attendees-drawer.component';
import { EventSpeakersDrawerComponent } from './components/event-speakers-drawer/event-speakers-drawer.component';
import { OrgUpcomingEventsTableComponent } from './components/org-upcoming-events-table/org-upcoming-events-table.component';

@Component({
  selector: 'lfx-org-events-dashboard',
  imports: [
    FormsModule,
    CardComponent,
    EmptyStateComponent,
    SelectModule,
    InputTextModule,
    FilterPillsComponent,
    DiscoverEventsButtonComponent,
    EventAttendeesDrawerComponent,
    EventSpeakersDrawerComponent,
    OrgUpcomingEventsTableComponent,
  ],
  templateUrl: './org-events-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgEventsDashboardComponent {
  // === Private injections ===
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountContext = inject(AccountContextService);
  private readonly eventsService = inject(EventsService);
  private readonly messageService = inject(MessageService);

  // === Template constants ===
  protected readonly statusOptions = ORG_EVENTS_STATUS_OPTIONS;

  // === WritableSignals ===
  protected readonly activeStatFilter = signal<OrgEventStatFilterId | null>(null);
  protected readonly attendeesDrawerVisible = signal(false);
  protected readonly speakersDrawerVisible = signal(false);
  protected readonly activeDrawerEvent = signal<OrgEvent | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly selectedStatus = signal<string | null>(null);
  protected readonly upcomingEventsLoading = signal(true);
  protected readonly upcomingEventsPage = signal<PageChangeEvent>({ offset: 0, pageSize: DEFAULT_EVENTS_PAGE_SIZE });
  protected readonly upcomingSortField = signal('EVENT_START_DATE');
  protected readonly upcomingSortOrder = signal<'ASC' | 'DESC'>('ASC');

  // === Computed / toSignal ===
  protected readonly companyName = computed(() => this.accountContext.selectedAccount().accountName ?? '');
  protected readonly activeTab: Signal<OrgEventsTabId> = this.initActiveTab();
  protected readonly eventsSummary: Signal<OrgEventsSummary | null> = this.initEventsSummary();
  protected readonly upcomingEvents: Signal<OrgEventsResponse> = this.initUpcomingEvents();
  protected readonly tabPillOptions = computed<FilterPillOption[]>(() => {
    const summary = this.eventsSummary();
    return ORG_EVENTS_TABS.map((tab) => {
      let count: number | null = null;
      if (summary !== null) {
        count = tab.id === 'upcoming' ? summary.upcomingEvents : summary.pastEvents;
      }
      return { id: tab.id, label: count !== null ? `${tab.label} (${count})` : tab.label };
    });
  });

  public constructor() {
    combineLatest([toObservable(this.searchTerm), toObservable(this.selectedStatus)])
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        this.upcomingEventsPage.set({ offset: 0, pageSize: this.upcomingEventsPage().pageSize });
      });
  }

  // === Protected methods ===
  protected applyEventsStatFilter(id: OrgEventStatFilterId): void {
    this.activeStatFilter.set(this.activeStatFilter() === id ? null : id);
  }

  protected switchTab(tabId: string): void {
    if (tabId === this.activeTab()) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId === DEFAULT_ORG_EVENTS_TAB_ID ? null : tabId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected onAttendeesClick(event: OrgEvent): void {
    this.activeDrawerEvent.set(event);
    this.speakersDrawerVisible.set(false);
    this.attendeesDrawerVisible.set(true);
  }

  protected onSpeakersClick(event: OrgEvent): void {
    this.activeDrawerEvent.set(event);
    this.attendeesDrawerVisible.set(false);
    this.speakersDrawerVisible.set(true);
  }

  protected onUpcomingPageChange(event: PageChangeEvent): void {
    this.upcomingEventsLoading.set(true);
    this.upcomingEventsPage.set(event);
  }

  protected onUpcomingSortChange(event: SortChangeEvent): void {
    if (this.upcomingSortField() === event.field) {
      this.upcomingSortOrder.set(this.upcomingSortOrder() === 'ASC' ? 'DESC' : 'ASC');
    } else {
      this.upcomingSortField.set(event.field);
      this.upcomingSortOrder.set('ASC');
    }
    this.upcomingEventsPage.set({ offset: 0, pageSize: this.upcomingEventsPage().pageSize });
  }

  // === Private initializers ===
  private initActiveTab(): Signal<OrgEventsTabId> {
    const queryParamMap = toSignal(this.route.queryParamMap, {
      initialValue: this.route.snapshot.queryParamMap,
    });
    return computed(() => {
      const raw = queryParamMap().get('tab');
      return raw && VALID_ORG_EVENTS_TAB_IDS.has(raw as OrgEventsTabId) ? (raw as OrgEventsTabId) : DEFAULT_ORG_EVENTS_TAB_ID;
    });
  }

  private initEventsSummary(): Signal<OrgEventsSummary | null> {
    const accountId$ = toObservable(computed(() => this.accountContext.selectedAccount().accountId));
    return toSignal(
      accountId$.pipe(
        filter((id): id is string => !!id),
        switchMap((id) => this.eventsService.getOrgEventsSummary(id).pipe(catchError(() => of(null))))
      ),
      { initialValue: null }
    );
  }

  private initUpcomingEvents(): Signal<OrgEventsResponse> {
    return toSignal(
      toObservable(
        computed(() => {
          const accountId = this.accountContext.selectedAccount().accountId;
          if (!accountId) return null;
          return {
            accountId,
            ...this.upcomingEventsPage(),
            searchQuery: this.searchTerm() || undefined,
            status: this.selectedStatus() ?? null,
            sortOrder: this.upcomingSortOrder(),
          };
        })
      ).pipe(
        debounceTime(0),
        filter((params): params is NonNullable<typeof params> => params !== null),
        tap(() => this.upcomingEventsLoading.set(true)),
        switchMap(({ accountId, ...params }) =>
          this.eventsService.getOrgEvents(accountId, { ...params, isPast: false }).pipe(
            catchError(() => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to load upcoming events. Please try again.',
              });
              return of(EMPTY_ORG_EVENTS_RESPONSE);
            }),
            finalize(() => this.upcomingEventsLoading.set(false))
          )
        )
      ),
      { initialValue: EMPTY_ORG_EVENTS_RESPONSE }
    );
  }
}
