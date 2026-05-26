// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, input, Signal } from '@angular/core';
import type { OrgAllEmployeeDetail } from '@lfx-one/shared/interfaces';

/** Expandable detail sub-table for one All Employees row — up to five sections, empty ones hidden. */
@Component({
  selector: 'lfx-org-people-all-employees-detail',
  imports: [DecimalPipe],
  templateUrl: './all-employees-detail.component.html',
})
export class AllEmployeesDetailComponent {
  public readonly detail = input.required<OrgAllEmployeeDetail | null>();
  public readonly loading = input<boolean>(false);

  protected readonly hasAnyDetail: Signal<boolean> = computed(() => this.initHasAnyDetail());

  protected readonly boardSeats = computed(() => this.detail()?.boardSeats ?? []);
  protected readonly committeeSeats = computed(() => this.detail()?.committeeSeats ?? []);
  protected readonly code = computed(() => this.detail()?.code ?? []);
  protected readonly events = computed(() => this.detail()?.events ?? []);
  protected readonly training = computed(() => this.detail()?.training ?? []);

  private initHasAnyDetail(): boolean {
    const d = this.detail();
    if (!d) return false;
    return d.boardSeats.length + d.committeeSeats.length + d.code.length + d.events.length + d.training.length > 0;
  }
}
