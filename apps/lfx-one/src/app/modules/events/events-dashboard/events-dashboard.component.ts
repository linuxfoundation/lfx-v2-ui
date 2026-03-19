// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { CardComponent } from '@components/card/card.component';
import { ActiveLensService } from '@services/active-lens.service';

@Component({
  selector: 'lfx-events-dashboard',
  imports: [CardComponent],
  templateUrl: './events-dashboard.component.html',
})
export class EventsDashboardComponent {
  private readonly activeLensService = inject(ActiveLensService);
  public readonly pageTitle = computed(() => this.activeLensService.isMeLens() ? 'My Events' : 'Events');
}
