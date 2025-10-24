// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChartComponent } from '@components/chart/chart.component';
import { TableComponent } from '@components/table/table.component';
import { AnalyticsService } from '@services/analytics.service';
import { BehaviorSubject, finalize, switchMap, tap } from 'rxjs';

import type { ChartData, ChartOptions } from 'chart.js';
import type { ProjectItem } from '@lfx-one/shared/interfaces';

interface ProjectItemWithCharts extends ProjectItem {
  codeActivitiesChartData: ChartData<'line'>;
  nonCodeActivitiesChartData: ChartData<'line'>;
}

@Component({
  selector: 'lfx-my-projects',
  standalone: true,
  imports: [CommonModule, ChartComponent, TableComponent],
  templateUrl: './my-projects.component.html',
  styleUrl: './my-projects.component.scss',
})
export class MyProjectsComponent {
  private readonly analyticsService = inject(AnalyticsService);
  private readonly paginationState$ = new BehaviorSubject({ page: 1, limit: 10 });
  protected readonly loading = signal(true);

  public readonly chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  public readonly rows = signal(10);

  private readonly projectsResponse = toSignal(
    this.paginationState$.pipe(
      tap(() => this.loading.set(true)),
      switchMap(({ page, limit }) => this.analyticsService.getMyProjects(page, limit).pipe(finalize(() => this.loading.set(false))))
    ),
    {
      initialValue: { data: [], totalProjects: 0 },
    }
  );

  public readonly projects = computed<ProjectItemWithCharts[]>(() => {
    const response = this.projectsResponse();
    return response.data.map((project) => ({
      ...project,
      codeActivitiesChartData: this.createChartData(project.codeActivities, '#009AFF', 'rgba(0, 154, 255, 0.1)'),
      nonCodeActivitiesChartData: this.createChartData(project.nonCodeActivities, '#10b981', 'rgba(16, 185, 129, 0.1)'),
    }));
  });

  public readonly totalRecords = computed(() => this.projectsResponse().totalProjects);
  public readonly paginatedProjects = computed<ProjectItemWithCharts[]>(() => this.projects());

  public onPageChange(event: { first: number; rows: number }): void {
    const page = Math.floor(event.first / event.rows) + 1;
    this.rows.set(event.rows);
    this.paginationState$.next({ page, limit: event.rows });
  }

  private createChartData(data: number[], borderColor: string, backgroundColor: string): ChartData<'line'> {
    return {
      labels: Array.from({ length: data.length }, () => ''),
      datasets: [
        {
          data,
          borderColor,
          backgroundColor,
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 0,
        },
      ],
    };
  }
}
