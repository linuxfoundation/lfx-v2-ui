// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, isDevMode, signal, Signal, WritableSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DashboardMeetingCardComponent } from '@app/modules/dashboards/components/dashboard-meeting-card/dashboard-meeting-card.component';
import { getActiveOccurrences } from '@lfx-one/shared';
import { LensService } from '@services/lens.service';
import { MeetingService } from '@services/meeting.service';
import { ProjectContextService } from '@services/project-context.service';
import { UserService } from '@services/user.service';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, combineLatest, Observable, of, switchMap, tap } from 'rxjs';

import { MeetingVisibility, RecurrenceType } from '@lfx-one/shared/enums';
import type { Meeting, MeetingWithOccurrence, PastMeeting } from '@lfx-one/shared/interfaces';

const DEV_MOCK_PAST_MEETING: PastMeeting = {
  id: 'dev-mock-meeting-001',
  title: 'Technical Steering Committee Monthly Sync',
  description: 'Monthly sync for the TSC to discuss roadmap, priorities, and community updates.',
  meeting_type: 'technical',
  start_time: '2026-04-15T15:00:00Z',
  duration: 60,
  timezone: 'America/New_York',
  project_uid: 'dev-project-001',
  project_name: 'CNCF',
  project_slug: 'cncf',
  recording_enabled: true,
  transcript_enabled: true,
  youtube_upload_enabled: false,
  zoom_config: { ai_companion_enabled: true } as PastMeeting['zoom_config'],
  recurrence: { type: RecurrenceType.WEEKLY, repeat_interval: 1, weekly_days: '3,5', end_times: 24 },
  visibility: MeetingVisibility.PUBLIC,
  restricted: false,
  invited: true,
  organizers: [],
  committees: [],
  password: null,
  artifact_visibility: null,
  individual_registrants_count: 0,
  committee_members_count: 0,
  registrants_accepted_count: 0,
  registrants_declined_count: 0,
  registrants_pending_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  modified_at: '2026-04-15T16:00:00Z',
  scheduled_start_time: '2026-04-15T15:00:00Z',
  scheduled_end_time: '2026-04-15T16:00:00Z',
  meeting_id: 'dev-mock-meeting-001',
  occurrence_id: 'dev-occurrence-001',
  platform_meeting_id: '99999999001',
  occurrences: [],
  sessions: [],
};

const DEV_MOCK_UPCOMING_MEETING: Meeting = {
  id: 'dev-mock-upcoming-001',
  title: 'Security Working Group — Closed Review',
  description: 'Private session to review security findings and coordinate response.',
  meeting_type: 'board',
  start_time: '2026-05-05T14:00:00Z',
  duration: 90,
  timezone: 'America/New_York',
  project_uid: 'dev-project-002',
  project_name: 'OpenSSF',
  project_slug: 'openssf',
  recording_enabled: false,
  transcript_enabled: false,
  youtube_upload_enabled: false,
  zoom_config: null,
  recurrence: null,
  visibility: MeetingVisibility.PRIVATE,
  restricted: true,
  invited: true,
  organizers: [],
  committees: [],
  password: null,
  artifact_visibility: null,
  individual_registrants_count: 0,
  committee_members_count: 0,
  registrants_accepted_count: 0,
  registrants_declined_count: 0,
  registrants_pending_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  modified_at: '2026-04-21T00:00:00Z',
  occurrences: [
    {
      occurrence_id: 'dev-occurrence-upcoming-001',
      title: 'Security Working Group — Closed Review',
      description: 'Private session to review security findings and coordinate response.',
      start_time: '2026-05-05T14:00:00Z',
      duration: 90,
      status: 'available',
    },
  ],
};

@Component({
  selector: 'lfx-my-meetings',
  imports: [DashboardMeetingCardComponent, SkeletonModule, RouterLink],
  templateUrl: './my-meetings.component.html',
  styleUrl: './my-meetings.component.scss',
})
export class MyMeetingsComponent {
  private readonly userService = inject(UserService);
  private readonly meetingService = inject(MeetingService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly lensService = inject(LensService);

  private static readonly bufferMs = 40 * 60 * 1000; // 40 minutes

  protected readonly activeLens = this.lensService.activeLens;
  protected readonly upcomingLoading = signal(!isDevMode());
  protected readonly pastLoading = signal(!isDevMode());

  private readonly selectedProject = computed(() => this.projectContextService.activeContext());

  // Raw data from API — switches data source based on active lens
  private readonly rawMeetings = isDevMode() ? signal<Meeting[]>([]) : this.initRawMeetings();
  private readonly rawPastMeetings = isDevMode() ? signal<PastMeeting[]>([]) : this.initRawPastMeetings();

  /** Dev-only recording URL passed to the last meeting card to bypass the recording API call. */
  protected readonly devRecordingUrl = isDevMode() ? 'https://zoom.us/rec/share/dev-mock-recording' : null;

  // Computed: Next upcoming meeting (with occurrence expansion)
  protected readonly nextMeeting: Signal<MeetingWithOccurrence | null> = this.initNextMeeting();

  // Computed: Last past meeting
  protected readonly lastMeeting: Signal<PastMeeting | null> = this.initLastMeeting();

  // Text based on lens
  protected readonly sectionTitle = computed(() => (this.activeLens() === 'me' ? 'My Meetings' : 'Meetings'));
  protected readonly emptyPastText = computed(() => (this.activeLens() === 'me' ? 'Your past meetings will appear here.' : 'No past meetings found.'));
  protected readonly emptyUpcomingText = computed(() =>
    this.activeLens() === 'me' ? 'Your scheduled meetings will appear here.' : 'No upcoming meetings found.'
  );

  private initRawMeetings() {
    return this.initLensSwitchedData<Meeting>(
      this.upcomingLoading,
      () => this.userService.getUserMeetings(),
      (uid) => this.meetingService.getUpcomingMeetingsByProject(uid)
    );
  }

  private initRawPastMeetings() {
    return this.initLensSwitchedData<PastMeeting>(
      this.pastLoading,
      () => this.userService.getUserPastMeetings(),
      (uid) => this.meetingService.getPastMeetingsByProject(uid)
    );
  }

  private initLensSwitchedData<T>(
    loading: WritableSignal<boolean>,
    meFetcher: () => Observable<T[]>,
    projectFetcher: (projectUid: string) => Observable<T[]>
  ): Signal<T[]> {
    const project$ = toObservable(this.selectedProject);
    const lens$ = toObservable(this.activeLens);

    return toSignal(
      combineLatest([project$, lens$]).pipe(
        tap(() => loading.set(true)),
        switchMap(([project, lens]) => {
          if (lens === 'org') {
            loading.set(false);
            return of([] as T[]);
          }

          let source$: Observable<T[]>;
          if (lens === 'me') {
            source$ = meFetcher();
          } else if (project?.uid) {
            source$ = projectFetcher(project.uid);
          } else {
            loading.set(false);
            return of([] as T[]);
          }

          return source$.pipe(
            tap(() => loading.set(false)),
            catchError(() => {
              loading.set(false);
              return of([] as T[]);
            })
          );
        })
      ),
      { initialValue: [] as T[] }
    );
  }

  private initNextMeeting(): Signal<MeetingWithOccurrence | null> {
    return computed(() => {
      const meetings = this.rawMeetings();
      const now = Date.now();
      const entries: MeetingWithOccurrence[] = [];

      for (const meeting of meetings) {
        if (meeting.occurrences && meeting.occurrences.length > 0) {
          for (const occurrence of getActiveOccurrences(meeting.occurrences)) {
            const startMs = new Date(occurrence.start_time).getTime();
            const endMs = startMs + occurrence.duration * 60 * 1000 + MyMeetingsComponent.bufferMs;
            if (endMs >= now) {
              entries.push({ meeting, occurrence, sortTime: startMs, trackId: `${meeting.id}-${occurrence.occurrence_id}` });
            }
          }
        } else {
          const startMs = new Date(meeting.start_time).getTime();
          const endMs = startMs + meeting.duration * 60 * 1000 + MyMeetingsComponent.bufferMs;
          if (endMs >= now) {
            entries.push({
              meeting,
              occurrence: {
                occurrence_id: '',
                title: meeting.title,
                description: meeting.description,
                start_time: meeting.start_time,
                duration: meeting.duration,
              },
              sortTime: startMs,
              trackId: meeting.id,
            });
          }
        }
      }

      entries.sort((a, b) => a.sortTime - b.sortTime);
      return entries[0] ?? null;
    });
  }

  private initLastMeeting(): Signal<PastMeeting | null> {
    return computed(() => {
      const pastMeetings = this.rawPastMeetings();
      if (pastMeetings.length === 0) {
        return null;
      }

      // Sort by scheduled_start_time descending (most recent first)
      const sorted = [...pastMeetings].sort((a, b) =>
        (b.scheduled_start_time ?? b.start_time ?? '').localeCompare(a.scheduled_start_time ?? a.start_time ?? '')
      );
      return sorted[0] ?? null;
    });
  }
}
