// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { CORE_DEVELOPER_ACTION_ITEMS } from '@lfx-one/shared/constants';
import { ActiveLensService } from '@services/active-lens.service';
import { HiddenActionsService } from '@services/hidden-actions.service';
import { ProjectContextService } from '@services/project-context.service';
import { SkeletonModule } from 'primeng/skeleton';
import { BehaviorSubject } from 'rxjs';

import { MyMeetingsComponent } from '../components/my-meetings/my-meetings.component';
import { MyProjectsComponent } from '../components/my-projects/my-projects.component';
import { PendingActionsComponent } from '../components/pending-actions/pending-actions.component';
import { RecentProgressComponent } from '../components/recent-progress/recent-progress.component';

@Component({
  selector: 'lfx-core-developer-dashboard',
  imports: [RecentProgressComponent, PendingActionsComponent, MyMeetingsComponent, MyProjectsComponent, SkeletonModule],
  templateUrl: './core-developer-dashboard.component.html',
  styleUrl: './core-developer-dashboard.component.scss',
})
export class CoreDeveloperDashboardComponent {
  private readonly projectContextService = inject(ProjectContextService);
  private readonly hiddenActionsService = inject(HiddenActionsService);
  private readonly activeLensService = inject(ActiveLensService);

  public readonly selectedFoundation = computed(() => this.projectContextService.selectedFoundation());
  public readonly isMeLens = this.activeLensService.isMeLens;
  public readonly refresh$: BehaviorSubject<void> = new BehaviorSubject<void>(undefined);
  private readonly rawCoreDevActions = signal(CORE_DEVELOPER_ACTION_ITEMS);
  public readonly coreDevActions = computed(() => {
    return this.rawCoreDevActions()
      .filter((item) => !this.hiddenActionsService.isActionHidden(item))
      .slice(0, 2);
  });

  // Lens-aware page title: Me lens = "Home", Foundation lens = "[Foundation] Overview"
  public readonly pageTitle = computed(() => {
    if (this.activeLensService.isMeLens()) {
      return 'Home';
    }
    return this.selectedFoundation()?.name ? `${this.selectedFoundation()!.name} Overview` : 'Overview';
  });

  // Lens-aware section title for Recent Progress
  public readonly recentProgressTitle = computed(() =>
    this.activeLensService.isMeLens() ? 'My Recent Progress' : 'Recent Progress'
  );

  public handleActionClick(): void {
    this.refresh$.next();
  }
}
