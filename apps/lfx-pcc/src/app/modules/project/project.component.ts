// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, inject, Injector, OnInit, runInInjectionContext, signal, Signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CardComponent } from '@app/shared/components/card/card.component';
import { TableComponent } from '@app/shared/components/table/table.component';
import { CommitteeService } from '@app/shared/services/committee.service';
import { ProjectService } from '@app/shared/services/project.service';
import { Committee, Project } from '@lfx-pcc/shared/interfaces';
import { SkeletonModule } from 'primeng/skeleton';
import { finalize } from 'rxjs';

@Component({
  selector: 'lfx-project',
  imports: [CardComponent, TableComponent, DatePipe, RouterModule, SkeletonModule],
  templateUrl: './project.component.html',
  styleUrl: './project.component.scss',
})
export class ProjectComponent implements OnInit {
  public readonly activatedRoute = inject(ActivatedRoute);
  private readonly projectService = inject(ProjectService);
  private readonly committeeService = inject(CommitteeService);
  private readonly injector = inject(Injector);

  // Signal to hold recent committees
  public recentCommittees: Signal<Committee[]> = signal([]);
  public committeesLoading: WritableSignal<boolean> = signal(true);

  // Load project data based on slug from URL
  public project: Signal<Project | null> = this.projectService.project;

  public readonly meetingTableData: Signal<any[]> = signal([
    {
      id: 1,
      title: 'Meeting with a really long title that should be truncated',
      url: 'meetings',
      status: 'Upcoming',
      date: '2025-07-10T10:00:00Z',
    },
    {
      id: 2,
      title: 'Standup',
      url: 'meetings',
      status: 'Upcoming',
      date: '2025-07-10T13:00:00Z',
    },
    {
      id: 3,
      title: 'Q4 Board Meeting',
      url: 'meetings',
      status: 'Upcoming',
      date: '2025-07-10T16:00:00Z',
    },
  ]);

  public readonly committeeTableData: Signal<any[]> = computed(() => {
    return this.recentCommittees().map((committee) => ({
      id: committee.id,
      title: committee.name,
      url: `committees/${committee.id}`,
      status: 'Active',
      date: committee.last_updated_at || committee.created_date,
    }));
  });

  public readonly mailingListTableData: Signal<any[]> = signal([
    {
      id: 1,
      title: 'board',
      url: 'mailing-lists',
      status: 'Upcoming',
      date: '2025-07-10T10:32:00Z',
    },
    {
      id: 2,
      title: 'gsoc',
      url: 'mailing-lists',
      status: 'Upcoming',
      date: '2025-07-10T10:32:00Z',
    },
    {
      id: 3,
      title: 'budget',
      url: 'mailing-lists',
      status: 'Upcoming',
      date: '2025-07-10T10:32:00Z',
    },
  ]);

  public ngOnInit() {
    runInInjectionContext(this.injector, () => {
      this.recentCommittees = toSignal(
        this.committeeService.getRecentCommitteesByProject(this.project()?.id || '').pipe(
          finalize(() => {
            this.committeesLoading.set(false);
          })
        ),
        { initialValue: [] }
      );
    });
  }
}
