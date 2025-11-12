// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, effect, inject, Signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SelectComponent } from '@app/shared/components/select/select.component';
import { AnalyticsService } from '@app/shared/services/analytics.service';
import { ProjectContextService } from '@app/shared/services/project-context.service';
import { MyMeetingsComponent } from '../components/my-meetings/my-meetings.component';
import { MyProjectsComponent } from '../components/my-projects/my-projects.component';
import { PendingActionsComponent } from '../components/pending-actions/pending-actions.component';
import { RecentProgressComponent } from '../components/recent-progress/recent-progress.component';

@Component({
  selector: 'lfx-maintainer-dashboard',
  standalone: true,
  imports: [RecentProgressComponent, PendingActionsComponent, MyMeetingsComponent, MyProjectsComponent, SelectComponent, ReactiveFormsModule],
  templateUrl: './maintainer-dashboard.component.html',
  styleUrl: './maintainer-dashboard.component.scss',
})
export class MaintainerDashboardComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly projectContextService = inject(ProjectContextService);
  private hasInitialized = false;

  public readonly filterForm = new FormGroup({
    projectId: new FormControl<string>(this.projectContextService.getProjectId() || ''),
  });

  // Fetch projects from Snowflake
  private readonly projectsData = toSignal(this.analyticsService.getProjects(), {
    initialValue: { projects: [] },
  });

  // Available projects for dropdown
  public readonly availableProjects: Signal<Array<{ projectId: string; name: string; slug: string }>> = computed(() => this.projectsData().projects);

  constructor() {
    // Subscribe to form changes to update the project context service
    this.filterForm
      .get('projectId')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((projectId) => {
        if (projectId) {
          const project = this.availableProjects().find((p) => p.projectId === projectId);
          if (project) {
            this.projectContextService.setProject(project);
          }
        } else {
          this.projectContextService.clearProject();
        }
      });

    // Initialize project selection when projects are loaded
    effect(() => {
      const projects = this.availableProjects();
      
      if (projects.length > 0 && !this.hasInitialized) {
        this.hasInitialized = true;
        
        const storedProjectId = untracked(() => this.projectContextService.getProjectId());
        const currentFormValue = untracked(() => this.filterForm.get('projectId')?.value);
        
        // Try to restore stored project
        if (storedProjectId && !currentFormValue) {
          const storedProject = projects.find((p) => p.projectId === storedProjectId);
          if (storedProject) {
            this.filterForm.get('projectId')?.setValue(storedProject.projectId, { emitEvent: true });
            return;
          }
        }
        
        // If no stored project or stored project not found, auto-select first project
        if (!currentFormValue || currentFormValue === '') {
          this.filterForm.get('projectId')?.setValue(projects[0].projectId, { emitEvent: true });
        }
      }
    });
  }
}
