// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, effect, inject, signal, Signal, WritableSignal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MeetingCardComponent } from '@app/modules/meetings/components/meeting-card/meeting-card.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { MEETING_TYPE_CONFIGS } from '@lfx-one/shared/constants';
import { Lens, Meeting, MeetingRsvp, PageResult, PastMeeting, ProjectContext } from '@lfx-one/shared/interfaces';
import { getCurrentOrNextOccurrence, hasMeetingEnded } from '@lfx-one/shared/utils';
import { LensService } from '@services/lens.service';
import { MeetingService } from '@services/meeting.service';
import { PersonaService } from '@services/persona.service';
import { ProjectContextService } from '@services/project-context.service';
import { UserService } from '@services/user.service';
import { OnRenderDirective } from '@shared/directives/on-render.directive';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  expand,
  finalize,
  firstValueFrom,
  map,
  merge,
  of,
  scan,
  Subject,
  switchMap,
  take,
  tap,
  toArray,
} from 'rxjs';

import { MeetingsTopBarComponent } from './components/meetings-top-bar/meetings-top-bar.component';

@Component({
  selector: 'lfx-meetings-dashboard',
  imports: [MeetingCardComponent, MeetingsTopBarComponent, ButtonComponent, CardComponent, OnRenderDirective],
  templateUrl: './meetings-dashboard.component.html',
  styleUrl: './meetings-dashboard.component.scss',
})
export class MeetingsDashboardComponent {
  private readonly meetingService = inject(MeetingService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly personaService = inject(PersonaService);
  private readonly lensService = inject(LensService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  public readonly activeLens: Signal<Lens> = this.lensService.activeLens;

  public meetingsLoading: WritableSignal<boolean>;
  public pastMeetingsLoading: WritableSignal<boolean>;
  public upcomingMeetings: Signal<Meeting[]>;
  public pastMeetings: Signal<PastMeeting[]>;
  public filteredMeetings: Signal<(Meeting | PastMeeting)[]>;
  public visibleMeetings: Signal<(Meeting | PastMeeting)[]>;
  public refresh$: BehaviorSubject<void>;
  public searchQuery: WritableSignal<string>;
  public debouncedSearchQuery: Signal<string>;
  public timeFilter: WritableSignal<'upcoming' | 'past' | 'pending-rsvp'>;

  // RSVP state for the "Pending RSVP" time filter. Populated lazily via initRsvpFetcher() when the filter is active.
  // - rsvpMap: meetingId -> user's RSVP (null = fetched and user has not responded)
  // - rsvpFetchedIds: ids for which the fetch has resolved (used to distinguish unfetched from explicit null)
  // - rsvpInflightIds: ids currently being fetched (plain Set — prevents duplicate requests across overlapping batches)
  private readonly rsvpMap: WritableSignal<Map<string, MeetingRsvp | null>> = signal(new Map());
  private readonly rsvpFetchedIds: WritableSignal<Set<string>> = signal(new Set());
  private readonly rsvpInflightIds = new Set<string>();
  protected readonly rsvpLoading: WritableSignal<boolean> = signal(false);
  public meetingTypeFilter: WritableSignal<string | null>;
  public meetingTypeOptions: Signal<{ label: string; value: string | null }[]>;
  public foundationFilter: WritableSignal<string | null>;
  public projectFilter: WritableSignal<string | null>;
  public showFoundationFilter: Signal<boolean>;
  public showProjectFilter: Signal<boolean>;
  public foundationOptions: Signal<{ label: string; value: string | null }[]>;
  public projectOptions: Signal<{ label: string; value: string | null }[]>;
  public project: Signal<ProjectContext | null>;
  protected readonly canWrite = this.projectContextService.canWrite;
  public loadingMore = signal(false);
  public hasMore: Signal<boolean>;
  public autoLoadTriggerIndex: Signal<number>;

  private fpUpcomingLoading = signal(false);
  private fpPastLoading = signal(false);

  // Raw user meetings cached for client-side filtering (Me lens only)
  private rawUserMeetings: Signal<Meeting[]>;
  private rawUserPastMeetings: Signal<PastMeeting[]>;
  // Pre-filtered/sorted upcoming meetings (shared source for Me lens stat cards)
  private sortedUpcomingUserMeetings: Signal<Meeting[]>;
  // Raw FP/project meetings for stat cards (independent of time-filter tab)
  private rawFpUpcomingMeetings: Signal<Meeting[]>;
  private rawFpPastMeetings: Signal<PastMeeting[]>;
  // Time-filtered meetings for deriving filter options. Server pre-filters past from upcoming;
  // the filter inside filterAndSortUpcomingMeetings is a safety net for SWR-cached responses.
  private timeFilteredMeetings: Signal<(Meeting | PastMeeting)[]>;

  // Me lens stat cards
  protected readonly meLensStatsLoading: Signal<boolean>;
  protected readonly upcomingCount: Signal<number>;
  protected readonly nextMeetingDate: Signal<string>;
  protected readonly pastThisMonthCount: Signal<number>;
  protected readonly recurringCount: Signal<number>;
  protected readonly recordingsAvailableCount: Signal<number>;
  protected readonly attendanceRate: Signal<number>;
  protected readonly recurringAcrossLabel: Signal<string>;

  // Foundation/Project lens stat cards
  protected readonly fpStatsLoading: Signal<boolean>;
  protected readonly fpUpcomingCount: Signal<number>;
  protected readonly fpPastCount: Signal<number>;
  protected readonly fpRecurringCount: Signal<number>;
  protected readonly fpRecordingsAvailableCount: Signal<number>;

  private upcomingPageToken = signal<string | undefined>(undefined);
  private pastPageToken = signal<string | undefined>(undefined);
  private loadMoreUpcoming$ = new Subject<string>();
  private loadMorePast$ = new Subject<string>();

  public constructor() {
    // Initialize project context first (needed for reactive data loading)
    this.project = computed(() => this.projectContextService.activeContext());

    // Initialize state
    this.meetingsLoading = signal<boolean>(true);
    this.pastMeetingsLoading = signal<boolean>(true);
    this.refresh$ = new BehaviorSubject<void>(undefined);
    this.searchQuery = signal<string>('');
    this.debouncedSearchQuery = toSignal(toObservable(this.searchQuery).pipe(debounceTime(300), distinctUntilChanged()), { initialValue: '' });
    const timeParam = this.route.snapshot.queryParamMap.get('time');
    let initialTimeFilter: 'upcoming' | 'past' | 'pending-rsvp' = 'upcoming';
    if (timeParam === 'past') {
      initialTimeFilter = 'past';
    } else if (timeParam === 'pending-rsvp') {
      initialTimeFilter = 'pending-rsvp';
    }
    this.timeFilter = signal<'upcoming' | 'past' | 'pending-rsvp'>(initialTimeFilter);
    this.meetingTypeFilter = signal<string | null>(null);
    this.foundationFilter = signal<string | null>(null);
    this.projectFilter = signal<string | null>(null);
    this.hasMore = computed(() => this.activeLens() !== 'me' && (this.timeFilter() === 'past' ? !!this.pastPageToken() : !!this.upcomingPageToken()));

    // Initialize meeting type options
    this.meetingTypeOptions = this.initializeMeetingTypeOptions();

    // Initialize Me lens data (fetched once, filtered client-side)
    this.rawUserMeetings = this.initializeRawUserMeetings();
    this.rawUserPastMeetings = this.initializeRawUserPastMeetings();
    // Single shared source for all Me-lens upcoming stats — avoids re-filtering rawUserMeetings on each stat signal
    this.sortedUpcomingUserMeetings = computed(() => this.filterAndSortUpcomingMeetings(this.rawUserMeetings()));
    this.timeFilteredMeetings = computed(() => {
      if (this.timeFilter() === 'past') {
        return this.rawUserPastMeetings();
      }
      return this.sortedUpcomingUserMeetings();
    });

    // Filter options derived from time-filtered meetings (only show projects with meetings in current view)
    this.foundationOptions = this.initializeFoundationOptions();
    this.projectOptions = this.initializeProjectOptions();
    // Show filter when there's at least one real option (beyond the "All" entry) and user has the right persona role
    this.showFoundationFilter = computed(() => this.activeLens() === 'me' && this.personaService.hasBoardRole() && this.foundationOptions().length > 1);
    this.showProjectFilter = computed(() => this.activeLens() === 'me' && this.personaService.hasProjectRole() && this.projectOptions().length > 1);

    // Me lens stat cards (computed from shared sorted upcoming signal)
    this.meLensStatsLoading = computed(() => this.meetingsLoading() || this.pastMeetingsLoading());
    this.upcomingCount = computed(() => this.sortedUpcomingUserMeetings().length);
    this.nextMeetingDate = this.initNextMeetingDate();
    this.pastThisMonthCount = this.initPastThisMonthCount();
    this.recurringCount = computed(() => this.sortedUpcomingUserMeetings().filter((m) => m.recurrence !== null).length);
    this.recordingsAvailableCount = this.initRecordingsAvailableCount();
    this.attendanceRate = this.initAttendanceRate();
    this.recurringAcrossLabel = this.initRecurringAcrossLabel();

    // Initialize data with reactive pattern
    this.upcomingMeetings = this.initializeUpcomingMeetings();
    this.pastMeetings = this.initializePastMeetings();
    this.filteredMeetings = this.initializeFilteredMeetings();
    this.visibleMeetings = this.initializeVisibleMeetings();

    // Raw FP meetings for stat cards — fetched once, independent of time-filter tab
    this.rawFpUpcomingMeetings = this.initializeRawFpUpcomingMeetings();
    this.rawFpPastMeetings = this.initializeRawFpPastMeetings();

    // Foundation/Project lens stat cards (computed from raw FP signals, not paginated)
    this.fpStatsLoading = computed(() => this.fpUpcomingLoading() || this.fpPastLoading());
    this.fpUpcomingCount = computed(() => (this.activeLens() !== 'me' ? this.rawFpUpcomingMeetings().length : 0));
    this.fpPastCount = computed(() => (this.activeLens() !== 'me' ? this.rawFpPastMeetings().length : 0));
    this.fpRecurringCount = computed(() => (this.activeLens() !== 'me' ? this.rawFpUpcomingMeetings().filter((m) => m.recurrence !== null).length : 0));
    this.fpRecordingsAvailableCount = this.initFpRecordingsAvailableCount();

    // Sentinel is placed at 50% of the list to trigger auto-load as user scrolls
    this.autoLoadTriggerIndex = computed(() => Math.floor(this.visibleMeetings().length / 2));

    // Lazy-fetches per-meeting RSVP state when the "Pending RSVP" time filter is active.
    this.initRsvpFetcher();
  }

  public refreshMeetings(): void {
    this.meetingsLoading.set(true);
    this.pastMeetingsLoading.set(true);
    this.refresh$.next();
    // Any dashboard-level refresh (meeting create/update/delete) may invalidate cached RSVPs;
    // clear so the next pending-rsvp view re-reads from the server.
    this.clearRsvpCache();
  }

  public onMeetingTypeChange(value: string | null): void {
    this.meetingTypeFilter.set(value);
  }

  public onFoundationFilterChange(value: string | null): void {
    this.foundationFilter.set(value);
    this.projectFilter.set(null);
  }

  public onProjectFilterChange(value: string | null): void {
    this.projectFilter.set(value);
  }

  public onTimeFilterChange(value: 'upcoming' | 'past' | 'pending-rsvp'): void {
    this.timeFilter.set(value);
    this.foundationFilter.set(null);
    this.projectFilter.set(null);
    // Clear RSVP cache on every toggle. Users who leave pending-rsvp, respond to a meeting
    // elsewhere, and toggle back should see a fresh fetch instead of the old null entries.
    this.clearRsvpCache();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { time: value === 'upcoming' ? null : value },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  public loadMore(): void {
    const isPast = this.timeFilter() === 'past';
    const pageToken = isPast ? this.pastPageToken() : this.upcomingPageToken();

    if (!pageToken || this.loadingMore()) {
      return;
    }

    if (isPast) {
      this.loadMorePast$.next(pageToken);
    } else {
      this.loadMoreUpcoming$.next(pageToken);
    }
  }

  private initializeUpcomingMeetings(): Signal<Meeting[]> {
    const project$ = toObservable(this.project);
    const lens$ = toObservable(this.activeLens);
    const timeFilter$ = toObservable(this.timeFilter);
    const searchQuery$ = toObservable(this.debouncedSearchQuery);
    const meetingType$ = toObservable(this.meetingTypeFilter);

    // Me lens: client-side filtering on cached data (no additional API calls)
    const rawUserMeetings$ = toObservable(this.rawUserMeetings);
    const foundationFilter$ = toObservable(this.foundationFilter);
    const projectFilter$ = toObservable(this.projectFilter);
    const meLens$ = combineLatest([lens$, timeFilter$, searchQuery$, meetingType$, rawUserMeetings$, foundationFilter$, projectFilter$]).pipe(
      switchMap(([lens, timeFilter, searchQuery, meetingType, rawMeetings, foundation, project]) => {
        // 'pending-rsvp' reuses the upcoming data source; visibleMeetings applies the RSVP filter on top.
        if (lens !== 'me' || (timeFilter !== 'upcoming' && timeFilter !== 'pending-rsvp')) {
          return of<PageResult<Meeting>>({ data: [], page_token: undefined, reset: true });
        }
        const filtered = this.filterMeLensMeetings(rawMeetings, searchQuery, meetingType, foundation, project);
        return of<PageResult<Meeting>>({ data: filtered, page_token: undefined, reset: true });
      })
    );

    // Project/foundation lens: server-side filtering with pagination
    const firstPage$ = combineLatest([project$, lens$, timeFilter$, this.refresh$, searchQuery$, meetingType$]).pipe(
      switchMap(([project, lens, timeFilter, , searchQuery, meetingType]) => {
        if (lens === 'me') {
          return EMPTY;
        }
        if (timeFilter !== 'upcoming' && timeFilter !== 'pending-rsvp') {
          this.meetingsLoading.set(false);
          return of<PageResult<Meeting>>({ data: [], page_token: undefined, reset: true });
        }

        if (!project?.uid) {
          this.meetingsLoading.set(false);
          return of<PageResult<Meeting>>({ data: [], page_token: undefined, reset: true });
        }

        this.meetingsLoading.set(true);
        const filters = this.buildMeetingTypeFilters(meetingType);
        return this.meetingService.getMeetingsByProjectPaginated(project.uid, undefined, undefined, searchQuery || undefined, filters).pipe(
          map((r): PageResult<Meeting> => ({ ...r, reset: true })),
          catchError(() => of<PageResult<Meeting>>({ data: [], page_token: undefined, reset: true })),
          finalize(() => this.meetingsLoading.set(false))
        );
      })
    );

    // Next pages: emits when loadMore triggers (appends to accumulator)
    const nextPage$ = this.loadMoreUpcoming$.pipe(
      switchMap((pageToken) => {
        const projectUid = this.project()?.uid;
        if (!projectUid) {
          return of<PageResult<Meeting>>({ data: [], page_token: undefined, reset: false });
        }
        this.loadingMore.set(true);
        const searchName = this.debouncedSearchQuery() || undefined;
        const filters = this.buildMeetingTypeFilters(this.meetingTypeFilter());
        return this.meetingService.getMeetingsByProjectPaginated(projectUid, undefined, pageToken, searchName, filters).pipe(
          map((r): PageResult<Meeting> => ({ ...r, reset: false })),
          catchError(() => of<PageResult<Meeting>>({ data: [], page_token: undefined, reset: false })),
          finalize(() => this.loadingMore.set(false))
        );
      })
    );

    return toSignal(
      merge(meLens$, firstPage$, nextPage$).pipe(
        tap((response) => this.upcomingPageToken.set(response.page_token)),
        scan((acc: Meeting[], response: PageResult<Meeting>) => {
          const filtered = this.filterAndSortUpcomingMeetings(response.data);
          return response.reset ? filtered : [...acc, ...filtered];
        }, [])
      ),
      { initialValue: [] }
    );
  }

  private initializePastMeetings(): Signal<PastMeeting[]> {
    const project$ = toObservable(this.project);
    const lens$ = toObservable(this.activeLens);
    const timeFilter$ = toObservable(this.timeFilter);
    const searchQuery$ = toObservable(this.debouncedSearchQuery);
    const meetingType$ = toObservable(this.meetingTypeFilter);

    // Me lens: client-side filtering on cached data (no additional API calls)
    const rawUserPastMeetings$ = toObservable(this.rawUserPastMeetings);
    const pastFoundationFilter$ = toObservable(this.foundationFilter);
    const pastProjectFilter$ = toObservable(this.projectFilter);
    const meLens$ = combineLatest([lens$, timeFilter$, searchQuery$, meetingType$, rawUserPastMeetings$, pastFoundationFilter$, pastProjectFilter$]).pipe(
      switchMap(([lens, timeFilter, searchQuery, meetingType, rawPastMeetings, foundation, project]) => {
        if (lens !== 'me' || timeFilter !== 'past') {
          return of<PageResult<PastMeeting>>({ data: [], page_token: undefined, reset: true });
        }
        const filtered = this.filterMeLensMeetings(rawPastMeetings, searchQuery, meetingType, foundation, project);
        return of<PageResult<PastMeeting>>({ data: filtered, page_token: undefined, reset: true });
      })
    );

    // Project/foundation lens: server-side filtering with pagination
    const firstPage$ = combineLatest([project$, lens$, timeFilter$, this.refresh$, searchQuery$, meetingType$]).pipe(
      switchMap(([project, lens, timeFilter, , searchQuery, meetingType]) => {
        if (lens === 'me') {
          return EMPTY;
        }
        if (timeFilter !== 'past') {
          this.pastMeetingsLoading.set(false);
          return of<PageResult<PastMeeting>>({ data: [], page_token: undefined, reset: true });
        }

        if (!project?.uid) {
          this.pastMeetingsLoading.set(false);
          return of<PageResult<PastMeeting>>({ data: [], page_token: undefined, reset: true });
        }

        this.pastMeetingsLoading.set(true);
        const filters = this.buildMeetingTypeFilters(meetingType);
        return this.meetingService.getPastMeetingsByProjectPaginated(project.uid, undefined, searchQuery || undefined, filters).pipe(
          map((r): PageResult<PastMeeting> => ({ ...r, reset: true })),
          catchError(() => of<PageResult<PastMeeting>>({ data: [], page_token: undefined, reset: true })),
          finalize(() => this.pastMeetingsLoading.set(false))
        );
      })
    );

    // Next pages: emits when loadMore triggers (appends to accumulator)
    const nextPage$ = this.loadMorePast$.pipe(
      switchMap((pageToken) => {
        const projectUid = this.project()?.uid;
        if (!projectUid) {
          return of<PageResult<PastMeeting>>({ data: [], page_token: undefined, reset: false });
        }
        this.loadingMore.set(true);
        const searchName = this.debouncedSearchQuery() || undefined;
        const filters = this.buildMeetingTypeFilters(this.meetingTypeFilter());
        return this.meetingService.getPastMeetingsByProjectPaginated(projectUid, pageToken, searchName, filters).pipe(
          map((r): PageResult<PastMeeting> => ({ ...r, reset: false })),
          catchError(() => of<PageResult<PastMeeting>>({ data: [], page_token: undefined, reset: false })),
          finalize(() => this.loadingMore.set(false))
        );
      })
    );

    return toSignal(
      merge(meLens$, firstPage$, nextPage$).pipe(
        tap((response) => this.pastPageToken.set(response.page_token)),
        scan((acc: PastMeeting[], response: PageResult<PastMeeting>) => {
          // TODO: Remove client-side sorting once API supports sorting by scheduled_start_time
          const sorted = response.data.sort((a, b) => {
            const timeA = new Date(a.scheduled_start_time ?? a.start_time).getTime();
            const timeB = new Date(b.scheduled_start_time ?? b.start_time).getTime();
            return timeB - timeA;
          });
          return response.reset ? sorted : [...acc, ...sorted];
        }, [])
      ),
      { initialValue: [] }
    );
  }

  private initializeRawUserMeetings(): Signal<Meeting[]> {
    const lens$ = toObservable(this.activeLens);

    return toSignal(
      combineLatest([lens$, this.refresh$]).pipe(
        switchMap(([lens]) => {
          if (lens !== 'me') {
            return of([] as Meeting[]);
          }
          this.meetingsLoading.set(true);
          return this.userService.getUserMeetings().pipe(
            tap(() => this.meetingsLoading.set(false)),
            catchError(() => {
              this.meetingsLoading.set(false);
              return of([] as Meeting[]);
            })
          );
        })
      ),
      { initialValue: [] as Meeting[] }
    );
  }

  private initializeRawUserPastMeetings(): Signal<PastMeeting[]> {
    const lens$ = toObservable(this.activeLens);

    return toSignal(
      combineLatest([lens$, this.refresh$]).pipe(
        switchMap(([lens]) => {
          if (lens !== 'me') {
            return of([] as PastMeeting[]);
          }
          this.pastMeetingsLoading.set(true);
          return this.userService.getUserPastMeetings().pipe(
            tap(() => this.pastMeetingsLoading.set(false)),
            catchError(() => {
              this.pastMeetingsLoading.set(false);
              return of([] as PastMeeting[]);
            })
          );
        })
      ),
      { initialValue: [] as PastMeeting[] }
    );
  }

  private filterAndSortUpcomingMeetings(meetings: Meeting[]): Meeting[] {
    // Server filters past meetings before sending, but HTTP SWR cache can serve responses up to
    // ~150s old. Re-apply the filter here as a safety net for meetings that ended after caching.
    const activeMeetings = meetings.filter((meeting) => {
      if (meeting.occurrences && meeting.occurrences.length > 0) {
        return meeting.occurrences.some((occurrence) => occurrence.status !== 'cancel' && !hasMeetingEnded(meeting, occurrence));
      }
      return !hasMeetingEnded(meeting);
    });

    return activeMeetings.sort((a, b) => {
      const occurrenceA = getCurrentOrNextOccurrence(a);
      const occurrenceB = getCurrentOrNextOccurrence(b);
      const timeA = occurrenceA ? new Date(occurrenceA.start_time).getTime() : new Date(a.start_time).getTime();
      const timeB = occurrenceB ? new Date(occurrenceB.start_time).getTime() : new Date(b.start_time).getTime();
      return timeA - timeB;
    });
  }

  private initializeMeetingTypeOptions(): Signal<{ label: string; value: string | null }[]> {
    return computed(() => {
      const types = Object.entries(MEETING_TYPE_CONFIGS).map(([, config]) => ({
        label: config.label,
        value: config.label,
      }));

      return [{ label: 'All Types', value: null }, ...types];
    });
  }

  private initializeFilteredMeetings(): Signal<(Meeting | PastMeeting)[]> {
    return computed(() => {
      return this.timeFilter() === 'past' ? this.pastMeetings() : this.upcomingMeetings();
    });
  }

  private initializeVisibleMeetings(): Signal<(Meeting | PastMeeting)[]> {
    return computed(() => {
      const base = this.filteredMeetings();
      if (this.timeFilter() !== 'pending-rsvp') {
        return base;
      }
      const map = this.rsvpMap();
      const fetched = this.rsvpFetchedIds();
      // Only surface a meeting as "pending" once its RSVP has been fetched AND the response is explicitly null.
      // An unfetched entry (map.get() === undefined) stays hidden until the lookup completes, so
      // already-answered meetings don't flash in the list during the initial batch.
      return base.filter((m) => fetched.has(m.id) && map.get(m.id) === null);
    });
  }

  private clearRsvpCache(): void {
    this.rsvpMap.set(new Map());
    this.rsvpFetchedIds.set(new Set());
    this.rsvpInflightIds.clear();
  }

  private initRsvpFetcher(): void {
    effect(() => {
      if (this.timeFilter() !== 'pending-rsvp') {
        return;
      }
      const current = this.filteredMeetings();
      const fetched = this.rsvpFetchedIds();
      const toFetch: string[] = [];
      for (const m of current) {
        if (!fetched.has(m.id) && !this.rsvpInflightIds.has(m.id)) {
          toFetch.push(m.id);
        }
      }
      if (toFetch.length === 0) {
        return;
      }
      // Mark in-flight BEFORE awaiting so concurrent effect re-runs don't re-request the same ids.
      toFetch.forEach((id) => this.rsvpInflightIds.add(id));
      this.rsvpLoading.set(true);
      // MeetingService.getMeetingRsvpForCurrentUser already catches+logs and returns of(null), so no wrapper here.
      Promise.all(toFetch.map((id) => firstValueFrom(this.meetingService.getMeetingRsvpForCurrentUser(id))))
        .then((results) => {
          const nextMap = new Map(this.rsvpMap());
          const nextFetched = new Set(this.rsvpFetchedIds());
          toFetch.forEach((id, i) => {
            nextMap.set(id, results[i] ?? null);
            nextFetched.add(id);
          });
          this.rsvpMap.set(nextMap);
          this.rsvpFetchedIds.set(nextFetched);
        })
        .finally(() => {
          toFetch.forEach((id) => this.rsvpInflightIds.delete(id));
          // Only clear the loading flag once ALL overlapping batches are done.
          if (this.rsvpInflightIds.size === 0) {
            this.rsvpLoading.set(false);
          }
        });
    });
  }

  private filterMeLensMeetings<T extends Meeting>(
    items: T[],
    searchQuery: string,
    meetingType: string | null,
    foundation: string | null,
    project: string | null
  ): T[] {
    let filtered = items;

    if (project) {
      filtered = filtered.filter((m) => m.project_uid === project);
    } else if (foundation) {
      // Show meetings for the foundation itself and its non-foundation children only.
      // Sub-foundations (is_foundation: true with parent = this foundation) are their own
      // top-level filter entries, so exclude them and their children here.
      filtered = filtered.filter((m) => m.project_uid === foundation || (m.parent_project_uid === foundation && !m.is_foundation));
    }

    return this.filterBySearchAndType(filtered, searchQuery, meetingType);
  }

  private filterBySearchAndType<T extends { title?: string; meeting_type?: string | null }>(items: T[], searchQuery: string, meetingType: string | null): T[] {
    let filtered = items;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => m.title?.toLowerCase().includes(query));
    }
    if (meetingType) {
      filtered = filtered.filter((m) => m.meeting_type === meetingType);
    }
    return filtered;
  }

  private initializeFoundationOptions(): Signal<{ label: string; value: string | null }[]> {
    return computed(() => {
      const meetings = this.timeFilteredMeetings();
      const seen = new Map<string, string>();

      for (const m of meetings) {
        if (m.is_foundation && m.project_uid && !seen.has(m.project_uid)) {
          seen.set(m.project_uid, m.project_name || m.project_uid);
        }
      }

      const options = [...seen.entries()].map(([uid, name]) => ({ label: name, value: uid })).sort((a, b) => a.label.localeCompare(b.label));

      return [{ label: 'All Foundations', value: null }, ...options];
    });
  }

  private initializeProjectOptions(): Signal<{ label: string; value: string | null }[]> {
    return computed(() => {
      const meetings = this.timeFilteredMeetings();
      const foundation = this.foundationFilter();
      const seen = new Map<string, string>();

      for (const m of meetings) {
        if (!m.is_foundation && m.project_uid && !seen.has(m.project_uid)) {
          // If a foundation is selected, only show its children
          if (foundation && m.parent_project_uid !== foundation) {
            continue;
          }
          seen.set(m.project_uid, m.project_name || m.project_uid);
        }
      }

      const options = [...seen.entries()].map(([uid, name]) => ({ label: name, value: uid })).sort((a, b) => a.label.localeCompare(b.label));

      return [{ label: 'All Projects', value: null }, ...options];
    });
  }

  private initNextMeetingDate(): Signal<string> {
    return computed(() => {
      const first = this.sortedUpcomingUserMeetings()[0];
      if (!first) return '';
      const occ = getCurrentOrNextOccurrence(first);
      const d = new Date(occ ? occ.start_time : first.start_time);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
  }

  private initPastThisMonthCount(): Signal<number> {
    return computed(() => {
      const now = new Date();
      return this.rawUserPastMeetings().filter((m) => {
        const d = new Date(m.scheduled_start_time);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length;
    });
  }

  private initRecordingsAvailableCount(): Signal<number> {
    return computed(() => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return this.rawUserPastMeetings().filter((m) => m.recording_enabled === true && new Date(m.scheduled_start_time).getTime() >= cutoff).length;
    });
  }

  private initAttendanceRate(): Signal<number> {
    return computed(() => {
      const now = new Date();
      const pastThisMonth = this.rawUserPastMeetings().filter((m) => {
        const d = new Date(m.scheduled_start_time);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
      if (pastThisMonth.length === 0) return 0;
      const attended = pastThisMonth.filter((m) => (m.attended_count ?? 0) > 0).length;
      return Math.round((attended / pastThisMonth.length) * 100);
    });
  }

  private initRecurringAcrossLabel(): Signal<string> {
    return computed(() => {
      const recurring = this.sortedUpcomingUserMeetings().filter((m) => m.recurrence !== null);
      const uniqueProjects = new Set(recurring.map((m) => m.project_name).filter(Boolean));
      const count = uniqueProjects.size;
      return count > 0 ? `Across ${count} ${count === 1 ? 'project' : 'projects'}` : '';
    });
  }

  private initFpRecordingsAvailableCount(): Signal<number> {
    return computed(() => {
      if (this.activeLens() === 'me') return 0;
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return this.rawFpPastMeetings().filter((m) => m.recording_enabled === true && new Date(m.scheduled_start_time).getTime() >= cutoff).length;
    });
  }

  private initializeRawFpUpcomingMeetings(): Signal<Meeting[]> {
    const project$ = toObservable(this.project);
    const lens$ = toObservable(this.activeLens);

    return toSignal(
      combineLatest([project$, lens$, this.refresh$]).pipe(
        switchMap(([project, lens]) => {
          if (lens === 'me' || !project?.uid) {
            return of([] as Meeting[]);
          }
          const projectUid = project.uid;
          this.fpUpcomingLoading.set(true);
          const fetchPage = (pageToken?: string) => this.meetingService.getMeetingsByProjectPaginated(projectUid, undefined, pageToken);
          return fetchPage().pipe(
            expand((response) => (response.page_token ? fetchPage(response.page_token) : EMPTY)),
            take(10),
            toArray(),
            map((responses) => this.filterAndSortUpcomingMeetings(responses.flatMap((r) => r.data))),
            catchError(() => of([] as Meeting[])),
            finalize(() => this.fpUpcomingLoading.set(false))
          );
        })
      ),
      { initialValue: [] as Meeting[] }
    );
  }

  private initializeRawFpPastMeetings(): Signal<PastMeeting[]> {
    const project$ = toObservable(this.project);
    const lens$ = toObservable(this.activeLens);

    return toSignal(
      combineLatest([project$, lens$, this.refresh$]).pipe(
        switchMap(([project, lens]) => {
          if (lens === 'me' || !project?.uid) {
            return of([] as PastMeeting[]);
          }
          const projectUid = project.uid;
          this.fpPastLoading.set(true);
          const fetchPage = (pageToken?: string) => this.meetingService.getPastMeetingsByProjectPaginated(projectUid, pageToken);
          return fetchPage().pipe(
            expand((response) => (response.page_token ? fetchPage(response.page_token) : EMPTY)),
            take(10),
            toArray(),
            map((responses) => responses.flatMap((r) => r.data)),
            catchError(() => of([] as PastMeeting[])),
            finalize(() => this.fpPastLoading.set(false))
          );
        })
      ),
      { initialValue: [] as PastMeeting[] }
    );
  }

  private buildMeetingTypeFilters(meetingType: string | null): string[] | undefined {
    if (!meetingType) {
      return undefined;
    }
    return [`meeting_type:${meetingType}`];
  }
}
