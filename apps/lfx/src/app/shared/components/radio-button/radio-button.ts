// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, output } from '@angular/core';

type RadioButtonSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-radio-button',
  imports: [],
  templateUrl: './radio-button.html',
  styleUrl: './radio-button.css',
  host: {
    '[attr.data-testid]': '"radio-button"',
  },
})
export class RadioButton {
  public size = input<RadioButtonSize>('lg');
  public disabled = input(false);
  public label = input<string>();
  public name = input<string>();
  public value = input<string>();

  public checked = model(false);

  public readonly changed = output<boolean>();

  public circleClasses = computed(() => {
    const isChecked = this.checked();
    const isDisabled = this.disabled();
    const isSmall = this.size() === 'sm';

    const sizeClass = isSmall ? 'size-3' : 'size-4';

    let stateClass: string;
    if (isChecked) {
      stateClass = isDisabled ? 'bg-neutral-200 border-neutral-300' : 'bg-info-500 border-info-500';
    } else {
      stateClass = isDisabled ? 'bg-neutral-200 border-neutral-300' : 'bg-white border-neutral-300';
    }

    return `${sizeClass} ${stateClass}`;
  });

  public dotClasses = computed(() => {
    const isDisabled = this.disabled();
    const isSmall = this.size() === 'sm';
    const colorClass = isDisabled ? 'bg-neutral-400' : 'bg-white';
    const sizeClass = isSmall ? 'size-1' : 'size-1.5';
    return `rounded-full ${colorClass} ${sizeClass}`;
  });

  public labelClasses = computed(() => {
    const isSmall = this.size() === 'sm';
    const sizeClass = isSmall ? 'text-xs leading-4' : 'text-sm leading-5';
    const colorClass = this.disabled() ? 'text-neutral-500' : 'text-neutral-900';

    return `${sizeClass} font-normal ${colorClass}`;
  });

  public onSelect(): void {
    if (!this.disabled()) {
      this.checked.set(true);
      this.changed.emit(true);
    }
  }
}
