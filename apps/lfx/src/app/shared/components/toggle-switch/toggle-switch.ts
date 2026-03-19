// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, output } from '@angular/core';

type ToggleSwitchSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-toggle-switch',
  imports: [],
  templateUrl: './toggle-switch.html',
  styleUrl: './toggle-switch.css',
  host: {
    '[attr.data-testid]': '"toggle-switch"',
  },
})
export class ToggleSwitch {
  public size = input<ToggleSwitchSize>('lg');
  public disabled = input(false);
  public label = input<string>();

  public checked = model(false);

  public readonly changed = output<boolean>();

  public trackClasses = computed(() => {
    const isChecked = this.checked();
    const isDisabled = this.disabled();
    const isSmall = this.size() === 'sm';

    const sizeClass = isSmall ? 'w-5 h-3' : 'w-[30px] h-4';

    let bgClass: string;
    if (isDisabled) {
      bgClass = 'bg-neutral-300';
    } else {
      bgClass = isChecked ? 'bg-info-500' : 'bg-neutral-200';
    }

    return `${sizeClass} ${bgClass}`;
  });

  public knobClasses = computed(() => {
    const isDisabled = this.disabled();
    const isSmall = this.size() === 'sm';

    const sizeClass = isSmall ? 'size-2' : 'size-3';
    const colorClass = isDisabled ? 'bg-neutral-100' : 'bg-white';

    return `${sizeClass} ${colorClass}`;
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
