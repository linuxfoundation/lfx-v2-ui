// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { PendingActionItem } from '@lfx-one/shared/interfaces';
import { HiddenActionsService } from '@services/hidden-actions.service';
import { ProjectContextService } from '@services/project-context.service';
import { SkeletonModule } from 'primeng/skeleton';
import { BehaviorSubject } from 'rxjs';

import { MyMeetingsComponent } from '../components/my-meetings/my-meetings.component';
import { MyProjectsComponent } from '../components/my-projects/my-projects.component';
import { PendingActionsComponent } from '../components/pending-actions/pending-actions.component';
import { RecentProgressComponent } from '../components/recent-progress/recent-progress.component';

@Component({
  selector: 'lfx-project-dashboard',
  imports: [RecentProgressComponent, PendingActionsComponent, MyMeetingsComponent, MyProjectsComponent, SkeletonModule],
  templateUrl: './project-dashboard.component.html',
  styleUrl: './project-dashboard.component.scss',
})
export class ProjectDashboardComponent {
  private readonly projectContextService = inject(ProjectContextService);
  private readonly hiddenActionsService = inject(HiddenActionsService);

  public readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly rawPendingActions = signal<PendingActionItem[]>([]);

  public readonly selectedProject = computed(() => this.projectContextService.activeContext());
  public readonly pendingActions = computed(() => {
    return this.rawPendingActions()
      .filter((item) => !this.hiddenActionsService.isActionHidden(item))
      .slice(0, 2);
  });

  public handleActionClick(): void {
    this.refresh$.next();
  }
}
