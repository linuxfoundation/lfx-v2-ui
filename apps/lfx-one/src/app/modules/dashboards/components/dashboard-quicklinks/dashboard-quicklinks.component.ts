// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { DashboardQuickLink } from '@lfx-one/shared/interfaces';
import { ProjectContextService } from '@services/project-context.service';

@Component({
  selector: 'lfx-dashboard-quicklinks',
  imports: [RouterLink],
  templateUrl: './dashboard-quicklinks.component.html',
})
export class DashboardQuicklinksComponent {
  private readonly projectContextService = inject(ProjectContextService);

  protected readonly links: DashboardQuickLink[] = [
    { label: 'Create meeting', icon: 'fa-light fa-calendar', route: ['/meetings', 'create'], testId: 'create-meeting' },
    { label: 'Create group', icon: 'fa-light fa-users', route: ['/groups', 'create'], testId: 'create-group' },
    { label: 'Create mailing list', icon: 'fa-light fa-envelope', route: ['/mailing-lists', 'create'], testId: 'create-mailing-list' },
  ];

  protected readonly canWrite = this.projectContextService.canWrite;

  /**
   * When the active context has a project UID, pin it to the create-flow URL so the form
   * binds to that project regardless of subsequent project-selector changes (mirrors how
   * committee → Schedule Meeting pins `committee_uid`).
   */
  protected readonly contextQueryParams: Signal<Params> = this.initContextQueryParams();

  private initContextQueryParams(): Signal<Params> {
    return computed(() => {
      const uid = this.projectContextService.activeContextUid();
      return uid ? { project_uid: uid } : {};
    });
  }
}
