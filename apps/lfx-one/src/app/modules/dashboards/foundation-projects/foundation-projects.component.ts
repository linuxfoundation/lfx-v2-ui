// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { StatCardGridComponent } from '@components/stat-card-grid/stat-card-grid.component';
import { TableComponent } from '@components/table/table.component';
import { DEFAULT_FOUNDATION_PROJECTS_DETAIL } from '@lfx-one/shared/constants';
import { buildLensAwareInsightsUrl } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { LensService } from '@services/lens.service';
import { ProjectContextService } from '@services/project-context.service';
import { catchError, filter, finalize, of, switchMap } from 'rxjs';

import type { FoundationProjectsDetailResponse, ProjectTableRow, StatCardItem } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-foundation-projects',
  imports: [DecimalPipe, ReactiveFormsModule, InputTextComponent, StatCardGridComponent, TableComponent],
  templateUrl: './foundation-projects.component.html',
  styleUrl: './foundation-projects.component.scss',
})
export class FoundationProjectsComponent {
  // === Services ===
  private readonly projectContextService = inject(ProjectContextService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly lensService = inject(LensService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // === Forms ===
  protected readonly searchForm: FormGroup = this.fb.group({
    query: [''],
  });

  // === Simple WritableSignals ===
  protected readonly loading = signal(false);

  // === Computed/toSignal Signals ===
  protected readonly foundationSlug: Signal<string> = computed(() => this.projectContextService.selectedFoundation()?.slug ?? '');
  protected readonly foundationName: Signal<string> = computed(() => this.projectContextService.selectedFoundation()?.name ?? 'The Linux Foundation');
  private readonly rawData: Signal<FoundationProjectsDetailResponse> = this.initRawData();
  protected readonly searchQuery: Signal<string> = this.initSearchQuery();
  protected readonly allProjects: Signal<ProjectTableRow[]> = computed(() => this.rawData().projects);
  protected readonly totalProjects: Signal<number> = computed(() => this.allProjects().length);
  protected readonly summaryCards: Signal<StatCardItem[]> = this.initSummaryCards();
  protected readonly filteredProjects: Signal<ProjectTableRow[]> = this.initFilteredProjects();

  // === Protected Methods ===
  protected getInsightsUrl(slug: string): string {
    return buildLensAwareInsightsUrl(slug, false);
  }

  protected openProjectLens(project: ProjectTableRow): void {
    if (!project.projectId) {
      return;
    }
    this.projectContextService.setProject({
      uid: project.projectId,
      name: project.projectName,
      slug: project.projectSlug,
    });
    this.lensService.setLens('project');
    this.router.navigate(['/project/overview']);
  }

  // === Private Initializers ===
  private initRawData(): Signal<FoundationProjectsDetailResponse> {
    return toSignal(
      toObservable(this.foundationSlug).pipe(
        filter((slug) => !!slug),
        switchMap((slug) => {
          // Set loading inside switchMap so that on rapid slug changes the order is:
          // old inner's `finalize(false)` (switchMap cancels it) → new inner's `loading.set(true)`.
          // Putting `loading.set(true)` in an outer `tap` would make the ordering
          // implementation-dependent when new slugs arrive while a request is in flight.
          this.loading.set(true);
          return this.analyticsService.getFoundationProjectsDetail(slug).pipe(
            catchError(() => of(DEFAULT_FOUNDATION_PROJECTS_DETAIL)),
            finalize(() => this.loading.set(false))
          );
        })
      ),
      { initialValue: DEFAULT_FOUNDATION_PROJECTS_DETAIL }
    );
  }

  private initSearchQuery(): Signal<string> {
    return toSignal(this.searchForm.get('query')!.valueChanges, { initialValue: '' });
  }

  private initSummaryCards(): Signal<StatCardItem[]> {
    return computed<StatCardItem[]>(() => {
      const projects = this.allProjects();
      const activeCount = projects.filter((p) => p.commitsLast90Days > 0).length;
      const totalContributors = projects.reduce((sum, p) => sum + (p.activeContributors ?? 0), 0);
      return [
        {
          value: this.totalProjects(),
          label: 'Total Projects',
          icon: 'fa-light fa-diagram-project',
          iconContainerClass: 'bg-gray-200 text-gray-500',
        },
        {
          value: activeCount,
          label: 'Active (90d)',
          icon: 'fa-light fa-bolt',
          iconContainerClass: 'bg-emerald-100 text-emerald-600',
        },
        {
          value: totalContributors,
          label: 'Active Contributors (90d)',
          icon: 'fa-light fa-users',
          iconContainerClass: 'bg-blue-100 text-blue-600',
        },
      ];
    });
  }

  private initFilteredProjects(): Signal<ProjectTableRow[]> {
    return computed(() => {
      const query = this.searchQuery().toLowerCase().trim();
      if (!query) {
        return this.allProjects();
      }
      return this.allProjects().filter((project) => project.projectName.toLowerCase().includes(query));
    });
  }
}
