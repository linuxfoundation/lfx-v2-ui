// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'lfx-tooltip',
  imports: [],
  templateUrl: './tooltip.html',
  styleUrl: './tooltip.css',
  host: {
    '[attr.data-testid]': '"tooltip"',
  },
})
export class Tooltip {
  public label = input.required<string>();
  public description = input<string>();

  public containerClasses = computed(() => {
    return this.description() ? 'flex-col gap-1 items-start' : '';
  });

  public labelClasses = computed(() => {
    return this.description() ? '' : 'text-center w-full';
  });
}
