// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { MeetingService } from '@app/shared/services/meeting.service';
import { CardComponent } from '@components/card/card.component';

import type { Meeting, MeetingItem, MeetingOccurrence } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-my-meetings',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './my-meetings.component.html',
  styleUrl: './my-meetings.component.scss',
})
export class MyMeetingsComponent {
  private readonly meetingService = inject(MeetingService);
  private readonly allMeetings = signal<Meeting[]>([]);

  public readonly joinMeeting = output<MeetingItem>();

  protected readonly meetings = computed<MeetingItem[]>(() => {
    const now = new Date();
    const currentTime = now.getTime();
    const buffer = 40 * 60 * 1000; // 40 minutes in milliseconds

    const upcomingMeetings: Array<{ meeting: Meeting; occurrence: MeetingOccurrence; sortTime: number }> = [];

    for (const meeting of this.allMeetings()) {
      // Process occurrences if they exist
      if (meeting.occurrences && meeting.occurrences.length > 0) {
        for (const occurrence of meeting.occurrences) {
          const startTime = new Date(occurrence.start_time).getTime();
          const endTime = startTime + occurrence.duration * 60 * 1000 + buffer;

          // Only include if meeting hasn't ended yet (including buffer)
          if (endTime >= currentTime) {
            upcomingMeetings.push({
              meeting,
              occurrence,
              sortTime: startTime,
            });
          }
        }
      } else {
        // Handle meetings without occurrences (single meetings)
        const startTime = new Date(meeting.start_time).getTime();
        const endTime = startTime + meeting.duration * 60 * 1000 + buffer;

        // Only include if meeting hasn't ended yet (including buffer)
        if (endTime >= currentTime) {
          upcomingMeetings.push({
            meeting,
            occurrence: {
              occurrence_id: '',
              title: meeting.title,
              description: meeting.description,
              start_time: meeting.start_time,
              duration: meeting.duration,
            },
            sortTime: startTime,
          });
        }
      }
    }

    // Sort by earliest time first and limit to 5
    return upcomingMeetings
      .sort((a, b) => a.sortTime - b.sortTime)
      .slice(0, 5)
      .map((item) => ({
        title: item.occurrence.title,
        time: this.formatMeetingTime(item.occurrence.start_time),
        attendees: item.meeting.individual_registrants_count + item.meeting.committee_members_count,
      }));
  });

  public constructor() {
    // Load meetings when component initializes
    this.meetingService.getMeetings().subscribe((meetings) => {
      this.allMeetings.set(meetings);
    });
  }

  public handleJoinMeeting(meeting: MeetingItem): void {
    this.joinMeeting.emit(meeting);
  }

  private formatMeetingTime(startTime: string): string {
    const meetingDate = new Date(startTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const meetingDateOnly = new Date(meetingDate.getFullYear(), meetingDate.getMonth(), meetingDate.getDate());

    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const formattedTime = timeFormatter.format(meetingDate);

    if (meetingDateOnly.getTime() === today.getTime()) {
      return `Today, ${formattedTime}`;
    } else if (meetingDateOnly.getTime() === tomorrow.getTime()) {
      return `Tomorrow, ${formattedTime}`;
    }
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    return `${dateFormatter.format(meetingDate)}, ${formattedTime}`;
  }
}
