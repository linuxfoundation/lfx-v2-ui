// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'lfx-card',
  imports: [],
  templateUrl: './card.html',
  styleUrl: './card.css',
  host: {
    '[attr.data-testid]': '"card"',
  },
})
export class Card {
  public padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  public hoverable = input(false);

  public cardClasses = computed(() => {
    const paddingClasses: Record<string, string> = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverClass = this.hoverable() ? 'transition-shadow hover:shadow-md' : '';

    return `${paddingClasses[this.padding()]} ${hoverClass}`.trim();
  });
}
