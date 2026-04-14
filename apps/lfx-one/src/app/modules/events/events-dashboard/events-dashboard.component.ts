// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LensService } from '@app/shared/services/lens.service';
import { FoundationEventDashboardComponent } from '../foundation-event-dashboard/foundation-event-dashboard.component';
import { MyEventsDashboardComponent } from '../my-events-dashboard/my-events-dashboard.component';

@Component({
  selector: 'lfx-events-dashboard',
  imports: [MyEventsDashboardComponent, FoundationEventDashboardComponent],
  template: `
    @if (isMeLens()) {
      <lfx-my-events-dashboard />
    } @else {
      <lfx-foundation-event-dashboard />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventsDashboardComponent {
  private readonly lensService = inject(LensService);

  protected readonly isMeLens = computed(() => this.lensService.activeLens() === 'me');
}
