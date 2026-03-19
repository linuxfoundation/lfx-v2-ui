// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, output } from '@angular/core';
import { Spinner } from '../spinner/spinner';

type ButtonVariant = 'primary' | 'outline' | 'ghost-accent' | 'ghost-neutral' | 'destructive' | 'ghost-destructive' | 'bordered';
type ButtonSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-button',
  imports: [Spinner],
  templateUrl: './button.html',
  styleUrl: './button.css',
  host: {
    '[attr.data-testid]': '"button"',
  },
})
export class Button {
  public variant = input<ButtonVariant>('primary');
  public size = input<ButtonSize>('lg');
  public loading = input(false);
  public disabled = input(false);
  public type = input<'button' | 'submit' | 'reset'>('button');
  public iconOnly = input(false);
  public leftIcon = input<string>();
  public rightIcon = input<string>();

  public readonly clicked = output<MouseEvent>();

  public buttonClasses = computed(() => {
    const variantClasses: Record<ButtonVariant, string> = {
      primary: 'bg-info-500 text-white hover:bg-[#0082d9]',
      outline: 'bg-transparent text-info-500 border border-info-500 hover:bg-info-100',
      'ghost-accent': 'bg-transparent text-info-500 hover:bg-info-100',
      'ghost-neutral': 'bg-transparent text-neutral-900 hover:bg-neutral-50',
      destructive: 'bg-danger-500 text-white hover:bg-danger-600',
      'ghost-destructive': 'bg-transparent text-danger-600 hover:bg-danger-100',
      bordered: 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50',
    };

    const sizeClasses: Record<ButtonSize, string> = this.iconOnly()
      ? { sm: 'size-7 p-0', lg: 'size-9 p-0' }
      : { sm: 'h-7 px-2 py-1 text-xs gap-1', lg: 'h-9 px-3 py-1 text-sm gap-1.5' };

    let disabledClass = '';
    if (this.isDisabled()) {
      const v = this.variant();
      if (v === 'primary' || v === 'destructive') {
        disabledClass = 'pointer-events-none !bg-neutral-300 !text-white !border-transparent';
      } else {
        disabledClass = 'pointer-events-none opacity-50';
      }
    }

    return `${variantClasses[this.variant()]} ${sizeClasses[this.size()]} ${disabledClass}`.trim();
  });

  public isDisabled = computed(() => this.loading() || this.disabled());

  public onClick(event: MouseEvent): void {
    if (!this.isDisabled()) {
      this.clicked.emit(event);
    }
  }
}
