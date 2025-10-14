// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, computed, inject, signal } from '@angular/core';
import type { MeetingItem, PendingActionItem, ProgressItem, ProjectItem, Meeting, MeetingOccurrence } from '@lfx-one/shared/interfaces';
import { CardComponent } from '@components/card/card.component';
import { ChartComponent } from '@components/chart/chart.component';
import { MeetingService } from '@app/shared/services/meeting.service';

interface ProgressItemWithChart extends ProgressItem {
  chartData: any;
  chartOptions: any;
}

@Component({
  selector: 'lfx-home-new',
  standalone: true,
  imports: [CommonModule, CardComponent, ChartComponent],
  templateUrl: './home-new.component.html',
  styleUrl: './home-new.component.scss',
})
export class HomeNewComponent {
  @ViewChild('progressScroll') protected progressScrollContainer!: ElementRef;

  private readonly meetingService = inject(MeetingService);
  private readonly allMeetings = signal<Meeting[]>([]);

  // Recent Progress data with chart configurations
  protected readonly progressItems: ProgressItemWithChart[] = [
    {
      label: 'Pull requests merged',
      value: '12',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [3, 5, 2, 8, 6, 10, 12],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Code reviews completed',
      value: '8',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [2, 3, 4, 3, 5, 6, 8],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Issues closed',
      value: '15',
      trend: 'down',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [20, 18, 19, 17, 18, 16, 15],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Commits pushed',
      value: '24',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [15, 18, 20, 19, 21, 22, 24],
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Active branches',
      value: '6',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [3, 4, 4, 5, 5, 6, 6],
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
    {
      label: 'Documentation updates',
      value: '5',
      trend: 'up',
      chartData: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            data: [1, 2, 2, 3, 3, 4, 5],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 0,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    },
  ];

  // Pending Actions data
  protected readonly pendingActions: PendingActionItem[] = [
    {
      type: 'Issue',
      badge: 'Kubernetes',
      text: 'Maintainer tagged you for clarification on issue #238: Pod Autoscaler UI.',
      icon: 'fa-light fa-envelope',
      color: 'amber',
      buttonText: 'Add Comment',
    },
    {
      type: 'PR Review',
      badge: 'Linux Kernel',
      text: 'Code review requested for pull request #456: Memory management optimization.',
      icon: 'fa-light fa-code-pull-request',
      color: 'blue',
      buttonText: 'Review PR',
    },
    {
      type: 'Meeting',
      badge: 'CNCF',
      text: 'Technical Steering Committee meeting agenda review needed by EOD.',
      icon: 'fa-light fa-calendar',
      color: 'green',
      buttonText: 'View Agenda',
    },
  ];

  // My Meetings data - computed from API with occurrence filtering
  protected readonly meetings = computed<MeetingItem[]>(() => {
    const now = new Date();
    const currentTime = now.getTime();
    const buffer = 40 * 60 * 1000; // 40 minutes in milliseconds
    
    const upcomingMeetings: Array<{meeting: Meeting, occurrence: MeetingOccurrence, sortTime: number}> = [];
    
    for (const meeting of this.allMeetings()) {
      // Process occurrences if they exist
      if (meeting.occurrences && meeting.occurrences.length > 0) {
        for (const occurrence of meeting.occurrences) {
          const startTime = new Date(occurrence.start_time).getTime();
          const endTime = startTime + (occurrence.duration * 60 * 1000) + buffer;
          
          // Only include if meeting hasn't ended yet (including buffer)
          if (endTime >= currentTime) {
            upcomingMeetings.push({
              meeting,
              occurrence,
              sortTime: startTime
            });
          }
        }
      } else {
        // Handle meetings without occurrences (single meetings)
        const startTime = new Date(meeting.start_time).getTime();
        const endTime = startTime + (meeting.duration * 60 * 1000) + buffer;
        
        // Only include if meeting hasn't ended yet (including buffer)
        if (endTime >= currentTime) {
          upcomingMeetings.push({
            meeting,
            occurrence: {
              occurrence_id: '',
              title: meeting.title,
              description: meeting.description,
              start_time: meeting.start_time,
              duration: meeting.duration
            },
            sortTime: startTime
          });
        }
      }
    }
    
    // Sort by earliest time first and limit to 5
    return upcomingMeetings
      .sort((a, b) => a.sortTime - b.sortTime)
      .slice(0, 5)
      .map(item => ({
        title: item.occurrence.title,
        time: this.formatMeetingTime(item.occurrence.start_time),
        attendees: item.meeting.individual_registrants_count + item.meeting.committee_members_count
      }));
  });

  // My Projects data
  protected readonly projects: ProjectItem[] = [
    {
      name: 'Kubernetes',
      logo: 'https://www.cncf.io/wp-content/uploads/2023/04/kubernetes-icon-color.svg',
      role: 'Maintainer',
      affiliations: ['CNCF', 'Google'],
      codeActivities: [28, 32, 30, 35, 38, 40, 42],
      nonCodeActivities: [8, 10, 12, 11, 13, 14, 15],
      status: 'active',
    },
    {
      name: 'Linux Kernel',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg',
      role: 'Contributor',
      affiliations: ['Linux Foundation'],
      codeActivities: [15, 18, 20, 22, 24, 26, 28],
      nonCodeActivities: [3, 4, 5, 6, 7, 7, 8],
      status: 'active',
    },
    {
      name: 'Node.js',
      logo: 'https://nodejs.org/static/images/logo.svg',
      role: 'Reviewer',
      affiliations: ['OpenJS Foundation'],
      codeActivities: [18, 16, 15, 14, 13, 12, 12],
      nonCodeActivities: [8, 7, 6, 6, 5, 5, 5],
      status: 'archived',
    },
  ];

  public constructor() {
    // Load meetings when component initializes
    this.meetingService.getMeetings().subscribe(meetings => {
      this.allMeetings.set(meetings);
    });
  }

  protected scrollLeft(): void {
    const container = this.progressScrollContainer.nativeElement;
    container.scrollBy({ left: -300, behavior: 'smooth' });
  }

  protected scrollRight(): void {
    const container = this.progressScrollContainer.nativeElement;
    container.scrollBy({ left: 300, behavior: 'smooth' });
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
      hour12: true
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
        day: 'numeric'
      });
      return `${dateFormatter.format(meetingDate)}, ${formattedTime}`;
    
  }
}
