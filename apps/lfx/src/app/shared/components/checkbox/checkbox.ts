// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, output } from '@angular/core';

type CheckboxSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-checkbox',
  imports: [],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
  host: {
    '[attr.data-testid]': '"checkbox"',
  },
})
export class Checkbox {
  public size = input<CheckboxSize>('lg');
  public disabled = input(false);
  public indeterminate = input(false);
  public label = input<string>();

  public checked = model(false);

  public readonly changed = output<boolean>();

  public boxClasses = computed(() => {
    const isChecked = this.checked();
    const isIndeterminate = this.indeterminate();
    const isDisabled = this.disabled();
    const isSmall = this.size() === 'sm';

    const sizeClass = isSmall ? 'size-3 rounded-sm' : 'size-4 rounded-sm';

    let stateClass: string;
    if (isChecked || isIndeterminate) {
      stateClass = isDisabled ? 'bg-neutral-200 border-neutral-300' : 'bg-info-500 border-info-500';
    } else {
      stateClass = isDisabled ? 'bg-neutral-200 border-neutral-300' : 'bg-white border-neutral-300';
    }

    return `${sizeClass} ${stateClass}`;
  });

  public iconClasses = computed(() => {
    const isDisabled = this.disabled();
    const isSmall = this.size() === 'sm';
    const colorClass = isDisabled ? 'text-neutral-400' : 'text-white';
    const sizeClass = isSmall ? 'text-[8px]' : 'text-[10px]';
    return `${colorClass} ${sizeClass}`;
  });

  public labelClasses = computed(() => {
    const isSmall = this.size() === 'sm';
    const sizeClass = isSmall ? 'text-xs leading-4' : 'text-sm leading-5';
    const colorClass = this.disabled() ? 'text-neutral-500' : 'text-neutral-900';

    return `${sizeClass} font-normal ${colorClass}`;
  });

  public onToggle(): void {
    if (!this.disabled()) {
      const newValue = !this.checked();
      this.checked.set(newValue);
      this.changed.emit(newValue);
    }
  }
}
