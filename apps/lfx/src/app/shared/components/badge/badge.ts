// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input } from '@angular/core';

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'discovery';
type BadgeSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.css',
  host: {
    '[attr.data-testid]': '"badge"',
  },
})
export class Badge {
  public variant = input<BadgeVariant>('neutral');
  public size = input<BadgeSize>('sm');
  public contrast = input(false);
  public icon = input<string>();

  public badgeClasses = computed(() => {
    const sizeClasses: Record<BadgeSize, string> = {
      sm: 'px-1.5 py-0.5 text-xs gap-0.5',
      lg: 'px-2 py-1 text-sm gap-1',
    };

    const variantClasses = this.contrast() ? this.contrastVariantClasses() : this.defaultVariantClasses();

    return `${sizeClasses[this.size()]} ${variantClasses}`;
  });

  private defaultVariantClasses(): string {
    const classes: Record<BadgeVariant, string> = {
      neutral: 'bg-neutral-100 text-neutral-600',
      info: 'bg-info-100 text-info-500',
      success: 'bg-success-100 text-success-600',
      warning: 'bg-warning-100 text-warning-600',
      danger: 'bg-danger-100 text-danger-600',
      discovery: 'bg-discovery-100 text-discovery-600',
    };
    return classes[this.variant()];
  }

  private contrastVariantClasses(): string {
    const classes: Record<BadgeVariant, string> = {
      neutral: 'bg-neutral-600 text-white',
      info: 'bg-info-500 text-white',
      success: 'bg-success-500 text-white',
      warning: 'bg-warning-500 text-white',
      danger: 'bg-danger-500 text-white',
      discovery: 'bg-discovery-500 text-white',
    };
    return classes[this.variant()];
  }
}
