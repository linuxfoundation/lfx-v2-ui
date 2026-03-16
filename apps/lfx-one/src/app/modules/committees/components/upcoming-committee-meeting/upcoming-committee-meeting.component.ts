// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Injector, input, OnInit, runInInjectionContext, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Meeting } from '@lfx-one/shared/interfaces';
import { MeetingTimePipe } from '@pipes/meeting-time.pipe';
import { CommitteeService } from '@services/committee.service';
import { ProjectService } from '@services/project.service';
import { TooltipModule } from 'primeng/tooltip';
import { map, of } from 'rxjs';

@Component({
  selector: 'lfx-upcoming-committee-meeting',
  imports: [RouterLink, MeetingTimePipe, TooltipModule],
  templateUrl: './upcoming-committee-meeting.component.html',
})
export class UpcomingCommitteeMeetingComponent implements OnInit {
  private readonly committeeService = inject(CommitteeService);
  private readonly projectService = inject(ProjectService);
  private readonly injector = inject(Injector);

  public readonly committeeId = input<string | null>(null);
  public readonly project = this.projectService.project;
  public upcomingMeeting!: Signal<Meeting | null>;
  public committees!: Signal<string>;

  public constructor() {
    this.committees = this.initializeCommittees();
  }

  public ngOnInit() {
    runInInjectionContext(this.injector, () => {
      this.upcomingMeeting = this.initializeUpcomingMeeting();
    });
  }

  private initializeUpcomingMeeting(): Signal<Meeting | null> {
    const committeeId = this.committeeId();
    if (!committeeId) return toSignal(of(null), { initialValue: null });

    return toSignal(
      this.committeeService.getCommitteeMeetings(committeeId).pipe(
        map((meetings: Meeting[]) => {
          const now = new Date().getTime();
          const upcoming = meetings
            .filter((m) => m.start_time && new Date(m.start_time).getTime() > now)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          return upcoming[0] ?? null;
        })
      ),
      { initialValue: null }
    );
  }

  private initializeCommittees() {
    return computed(
      () =>
        this.upcomingMeeting()
          ?.committees?.map((committee) => committee.name)
          .join(', ') ?? ''
    );
  }
}
