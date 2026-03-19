// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, output } from '@angular/core';

type LinkButtonVariant = 'accent' | 'neutral';
type LinkButtonSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-link-button',
  imports: [],
  templateUrl: './link-button.html',
  styleUrl: './link-button.css',
  host: {
    '[attr.data-testid]': '"link-button"',
  },
})
export class LinkButton {
  public variant = input<LinkButtonVariant>('accent');
  public size = input<LinkButtonSize>('lg');
  public disabled = input(false);
  public underline = input(false);
  public leftIcon = input<string>();
  public rightIcon = input<string>();

  public readonly clicked = output<MouseEvent>();

  public buttonClasses = computed(() => {
    const variantClasses: Record<LinkButtonVariant, string> = {
      accent: 'text-info-500 hover:text-info-600',
      neutral: 'text-neutral-500 hover:text-neutral-600',
    };

    const sizeClasses: Record<LinkButtonSize, string> = {
      sm: 'text-xs gap-1',
      lg: 'text-sm gap-1.5',
    };

    const underlineClass = this.underline() ? 'hover:underline' : '';

    const disabledClass = this.disabled() ? 'opacity-50 pointer-events-none' : '';

    return `${variantClasses[this.variant()]} ${sizeClasses[this.size()]} ${underlineClass} ${disabledClass}`.trim();
  });

  public onClick(event: MouseEvent): void {
    if (!this.disabled()) {
      this.clicked.emit(event);
    }
  }
}
