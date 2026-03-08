// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MARKETING_OVERVIEW_METRICS } from '@lfx-one/shared/constants';
import { CategorizedMetricCard, FilterPillOption, PendingActionItem } from '@lfx-one/shared/interfaces';
import { HiddenActionsService } from '@services/hidden-actions.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { SkeletonModule } from 'primeng/skeleton';
import { BehaviorSubject, catchError, combineLatest, of, switchMap } from 'rxjs';

import { FoundationHealthComponent } from '../components/foundation-health/foundation-health.component';
import { MyMeetingsComponent } from '../components/my-meetings/my-meetings.component';
import { PendingActionsComponent } from '../components/pending-actions/pending-actions.component';

@Component({
  selector: 'lfx-executive-director-dashboard',
  imports: [PendingActionsComponent, MyMeetingsComponent, FoundationHealthComponent, SkeletonModule],
  templateUrl: './executive-director-dashboard.component.html',
  styleUrl: './executive-director-dashboard.component.scss',
})
export class ExecutiveDirectorDashboardComponent {
  // === Services ===
  private readonly projectContextService = inject(ProjectContextService);
  private readonly projectService = inject(ProjectService);
  private readonly hiddenActionsService = inject(HiddenActionsService);

  // === Inputs ===
  public readonly edFilterOptions: FilterPillOption[] = [
    { id: 'all', label: 'All' },
    { id: 'memberships', label: 'Memberships' },
    { id: 'marketing', label: 'Marketing' },
    { id: 'events', label: 'Events' },
    { id: 'education', label: 'Education' },
    { id: 'projectOperations', label: 'Project Operations' },
  ];

  public readonly marketingCards: CategorizedMetricCard[] = MARKETING_OVERVIEW_METRICS.map((card) => ({
    card,
    category: card.category || 'marketing',
  }));

  public readonly refresh$: BehaviorSubject<void> = new BehaviorSubject<void>(undefined);

  // === Computed Signals ===
  public readonly selectedFoundation = computed(() => this.projectContextService.selectedFoundation());
  public readonly selectedProject = computed(() => this.projectContextService.selectedProject() || this.projectContextService.selectedFoundation());
  private readonly rawPendingActions: Signal<PendingActionItem[]>;
  public readonly pendingActions: Signal<PendingActionItem[]>;

  public constructor() {
    this.rawPendingActions = this.initializePendingActions();

    this.pendingActions = computed(() => {
      return this.rawPendingActions()
        .filter((item) => !this.hiddenActionsService.isActionHidden(item))
        .slice(0, 2);
    });
  }

  // === Public Methods ===
  public handleActionClick(): void {
    this.refresh$.next();
  }

  // === Private Initializers ===
  private initializePendingActions(): Signal<PendingActionItem[]> {
    const project$ = toObservable(this.selectedProject);

    return toSignal(
      combineLatest([this.refresh$, project$]).pipe(
        switchMap(([, project]) => {
          if (!project?.slug || !project?.uid) {
            return of([]);
          }

          return this.projectService.getPendingActions(project.slug, project.uid, 'executive-director').pipe(
            catchError((error) => {
              console.error('Failed to fetch pending actions:', error);
              return of([]);
            })
          );
        })
      ),
      { initialValue: [] }
    );
  }
}
