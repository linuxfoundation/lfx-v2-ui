// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DashboardMeetingCardComponent } from '@app/modules/dashboards/components/dashboard-meeting-card/dashboard-meeting-card.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { getActiveOccurrences } from '@lfx-one/shared';
import { LensService } from '@services/lens.service';
import { MeetingService } from '@services/meeting.service';
import { ProjectContextService } from '@services/project-context.service';
import { UserService } from '@services/user.service';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, combineLatest, of, switchMap, tap } from 'rxjs';

import type { Meeting, MeetingWithOccurrence, PastMeeting } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-my-meetings',
  imports: [DashboardMeetingCardComponent, ButtonComponent, CardComponent, SkeletonModule],
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
  protected readonly upcomingLoading = signal(true);
  protected readonly pastLoading = signal(true);

  private readonly selectedProject = computed(() => this.projectContextService.selectedProject() || this.projectContextService.selectedFoundation());

  // Raw data from API — switches data source based on active lens
  private readonly rawMeetings = this.initRawMeetings();
  private readonly rawPastMeetings = this.initRawPastMeetings();

  // Computed: Next upcoming meeting (with occurrence expansion)
  protected readonly nextMeeting: Signal<MeetingWithOccurrence | null> = this.initNextMeeting();

  // Computed: Last past meeting
  protected readonly lastMeeting: Signal<PastMeeting | null> = this.initLastMeeting();

  // Header text based on lens
  protected readonly sectionTitle = computed(() => (this.activeLens() === 'me' ? 'My Meetings' : 'Meetings'));

  private initRawMeetings() {
    const project$ = toObservable(this.selectedProject);
    const lens$ = toObservable(this.activeLens);

    return toSignal(
      combineLatest([project$, lens$]).pipe(
        tap(() => this.upcomingLoading.set(true)),
        switchMap(([project, lens]) => {
          if (!project?.uid || lens === 'org') {
            this.upcomingLoading.set(false);
            return of([]);
          }

          const meetings$ =
            lens === 'me' ? this.userService.getUserMeetings(project.uid, 100) : this.meetingService.getUpcomingMeetingsByProject(project.uid, 100);

          return meetings$.pipe(
            tap(() => this.upcomingLoading.set(false)),
            catchError(() => {
              this.upcomingLoading.set(false);
              return of([]);
            })
          );
        })
      ),
      { initialValue: [] as Meeting[] }
    );
  }

  private initRawPastMeetings() {
    const project$ = toObservable(this.selectedProject);
    const lens$ = toObservable(this.activeLens);

    return toSignal(
      combineLatest([project$, lens$]).pipe(
        tap(() => this.pastLoading.set(true)),
        switchMap(([project, lens]) => {
          if (!project?.uid || lens === 'org') {
            this.pastLoading.set(false);
            return of([]);
          }

          const pastMeetings$ =
            lens === 'me' ? this.userService.getUserPastMeetings(project.uid, 50) : this.meetingService.getPastMeetingsByProject(project.uid, 50);

          return pastMeetings$.pipe(
            tap(() => this.pastLoading.set(false)),
            catchError(() => {
              this.pastLoading.set(false);
              return of([]);
            })
          );
        })
      ),
      { initialValue: [] as PastMeeting[] }
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
