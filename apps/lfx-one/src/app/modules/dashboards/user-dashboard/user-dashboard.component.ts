// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { CONTRIBUTOR_ACTION_ITEMS } from '@lfx-one/shared/constants';
import { isBoardScopedPersona, PendingActionItem } from '@lfx-one/shared/interfaces';
import { HiddenActionsService } from '@services/hidden-actions.service';
import { PersonaService } from '@services/persona.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { SkeletonModule } from 'primeng/skeleton';
import { BehaviorSubject, catchError, of, switchMap } from 'rxjs';

import { FoundationHealthComponent } from '../components/foundation-health/foundation-health.component';
import { MyMeetingsComponent } from '../components/my-meetings/my-meetings.component';
import { PendingActionsComponent } from '../components/pending-actions/pending-actions.component';
import { RecentProgressComponent } from '../components/recent-progress/recent-progress.component';

@Component({
  selector: 'lfx-user-dashboard',
  imports: [FoundationHealthComponent, RecentProgressComponent, PendingActionsComponent, MyMeetingsComponent, SkeletonModule],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss',
})
export class UserDashboardComponent {
  private readonly projectContextService = inject(ProjectContextService);
  private readonly personaService = inject(PersonaService);
  private readonly projectService = inject(ProjectService);
  private readonly hiddenActionsService = inject(HiddenActionsService);

  protected readonly isBoardScoped = computed(() => isBoardScopedPersona(this.personaService.currentPersona()));

  public readonly refresh$ = new BehaviorSubject<void>(undefined);

  // Board-scoped: API-fetched actions
  private readonly rawBoardActions: Signal<PendingActionItem[]> = this.initBoardActions();

  // Contributor/Maintainer: static actions
  private readonly rawContributorActions = signal(CONTRIBUTOR_ACTION_ITEMS);

  // Unified pending actions: pick based on persona, filter hidden, limit to 2
  public readonly pendingActions: Signal<PendingActionItem[]> = computed(() => {
    const raw = this.isBoardScoped() ? this.rawBoardActions() : this.rawContributorActions();
    return raw.filter((item) => !this.hiddenActionsService.isActionHidden(item)).slice(0, 2);
  });

  public handleActionClick(): void {
    this.refresh$.next();
  }

  private initBoardActions(): Signal<PendingActionItem[]> {
    const project$ = toObservable(computed(() => this.projectContextService.activeContext()));

    return toSignal(
      this.refresh$.pipe(
        takeUntilDestroyed(),
        switchMap(() => {
          return project$.pipe(
            switchMap((project) => {
              if (!project?.slug || !project?.uid) {
                return of([]);
              }

              return this.projectService.getPendingActions(project.slug, project.uid, this.personaService.currentPersona()).pipe(
                catchError((error) => {
                  console.error('Failed to fetch pending actions:', error);
                  return of([]);
                })
              );
            })
          );
        })
      ),
      { initialValue: [] }
    );
  }
}
