// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { ProjectSettings, UserInfo } from '@lfx-one/shared/interfaces';
import { ProjectService } from '@services/project.service';
import { SkeletonModule } from 'primeng/skeleton';
import { filter, switchMap } from 'rxjs';

interface StaffRow {
  key: 'executive_director' | 'program_manager' | 'opportunity_owner';
  label: string;
  icon: string;
  user: UserInfo | null | undefined;
}

@Component({
  selector: 'lfx-project-staff-card',
  imports: [AvatarComponent, SkeletonModule],
  templateUrl: './project-staff-card.component.html',
  styleUrl: './project-staff-card.component.scss',
})
export class ProjectStaffCardComponent {
  private readonly projectService = inject(ProjectService);

  public readonly projectUid = input.required<string>();

  // Fetch the project settings document when `projectUid` becomes available. `filter` drops the
  // empty string that `selectedProject()?.uid` can briefly emit before the project is resolved.
  // The service catches HTTP errors and yields `null`, so `undefined` here means "still loading".
  protected readonly settings: Signal<ProjectSettings | null | undefined> = toSignal(
    toObservable(this.projectUid).pipe(
      filter((uid): uid is string => !!uid),
      switchMap((uid) => this.projectService.getProjectSettings(uid))
    ),
    { initialValue: undefined }
  );

  protected readonly loading = computed(() => this.settings() === undefined);

  protected readonly staff: Signal<StaffRow[]> = computed(() => {
    const s = this.settings();
    return [
      { key: 'executive_director', label: 'Executive Director', icon: 'fa-light fa-user-tie', user: s?.executive_director },
      { key: 'program_manager', label: 'Program Manager', icon: 'fa-light fa-user-gear', user: s?.program_manager },
      { key: 'opportunity_owner', label: 'Opportunity Owner', icon: 'fa-light fa-user-chart', user: s?.opportunity_owner },
    ];
  });

  protected readonly hasAnyStaff = computed(() => this.staff().some((row) => !!row.user));
}
