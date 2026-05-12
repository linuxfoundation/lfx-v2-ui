// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, input } from '@angular/core';

import { ButtonComponent } from '@components/button/button.component';

@Component({
  selector: 'lfx-health-metrics-card-empty-state',
  standalone: true,
  imports: [ButtonComponent],
  templateUrl: './health-metrics-card-empty-state.component.html',
  host: { class: 'flex flex-1 flex-col' },
})
export class HealthMetricsCardEmptyStateComponent {
  public readonly icon = input.required<string>();
  public readonly title = input.required<string>();
  public readonly description = input.required<string>();
  public readonly action = input<string | undefined>(undefined);
  public readonly actionLinkLabel = input<string | undefined>(undefined);
  public readonly actionLinkHref = input<string | undefined>(undefined);
  public readonly ctaLabel = input<string | undefined>(undefined);
  public readonly ctaRoute = input<string | string[] | undefined>(undefined);
  public readonly ctaHref = input<string | undefined>(undefined);
}
