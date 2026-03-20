// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { CardComponent } from '@components/card/card.component';
import { Committee, Meeting, PastMeeting } from '@lfx-one/shared/interfaces';
import { MeetingCardComponent } from '@app/modules/meetings/components/meeting-card/meeting-card.component';
import { MeetingService } from '@services/meeting.service';
import { DialogService } from 'primeng/dynamicdialog';
import { catchError, debounceTime, distinctUntilChanged, filter, of, startWith, switchMap } from 'rxjs';

type TimeFilter = 'upcoming' | 'past';

@Component({
  selector: 'lfx-committee-meetings',
  imports: [ReactiveFormsModule, CardComponent, MeetingCardComponent],
  providers: [DialogService],
  templateUrl: './committee-meetings.component.html',
  styleUrl: './committee-meetings.component.scss',
})
export class CommitteeMeetingsComponent {
  private readonly meetingService = inject(MeetingService);

  // Inputs
  public committee = input.required<Committee>();
  public canEdit = input<boolean>(false);

  // Filter state
  public searchControl = new FormControl('');
  public timeFilter = signal<TimeFilter>('upcoming');

  // Time filter options
  public timeOptions: { label: string; value: TimeFilter }[] = [
    { label: 'Upcoming', value: 'upcoming' },
    { label: 'Past', value: 'past' },
  ];

  // Data
  public meetings: Signal<Meeting[]> = this.initMeetings();
  public pastMeetings: Signal<PastMeeting[]> = this.initPastMeetings();

  // Filtered data
  public filteredMeetings: Signal<(Meeting | PastMeeting)[]> = this.initFilteredMeetings();

  public setTimeFilter(value: TimeFilter): void {
    this.timeFilter.set(value);
  }

  // Private initializer functions
  private initMeetings(): Signal<Meeting[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => this.meetingService.getMeetingsByCommittee(c.uid, undefined, 'start_time.asc').pipe(catchError(() => of([]))))
      ),
      { initialValue: [] }
    );
  }

  private initPastMeetings(): Signal<PastMeeting[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => this.meetingService.getPastMeetingsByCommittee(c.uid).pipe(catchError(() => of([]))))
      ),
      { initialValue: [] }
    );
  }

  private initFilteredMeetings(): Signal<(Meeting | PastMeeting)[]> {
    const searchTerm = toSignal(this.searchControl.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()), { initialValue: '' });

    return computed(() => {
      const time = this.timeFilter();
      const term = (searchTerm() || '').toLowerCase();
      const items: (Meeting | PastMeeting)[] = time === 'upcoming' ? this.meetings() : this.pastMeetings();

      if (!term) {
        return items;
      }

      return items.filter((m) => {
        const title = 'title' in m ? m.title : '';
        return title.toLowerCase().includes(term);
      });
    });
  }
}
