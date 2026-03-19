// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, output } from '@angular/core';

export type TabStyle = 'bordered' | 'switch';
export type TabSize = 'sm' | 'lg';

@Component({
  selector: 'lfx-tab-item',
  imports: [],
  templateUrl: './tab-item.html',
  styleUrl: './tab-item.css',
  host: {
    '[attr.data-testid]': '"tab-item"',
  },
})
export class TabItem {
  public label = input.required<string>();
  public value = input.required<string>();
  public icon = input<string>();
  public selected = input(false);
  public tabStyle = input<TabStyle>('switch');
  public size = input<TabSize>('lg');

  public readonly selectTab = output<string>();

  public itemClasses = computed(() => {
    const style = this.tabStyle();
    const size = this.size();
    const selected = this.selected();

    if (style === 'switch') {
      return this.switchClasses(size, selected);
    }
    return this.borderedClasses(size, selected);
  });

  public textClasses = computed(() => {
    const selected = this.selected();
    const size = this.size();

    const sizeClass = size === 'sm' ? 'text-xs leading-4' : 'text-sm leading-5';
    const weightClass = selected ? 'font-medium' : 'font-normal';
    const colorClass = selected ? 'text-neutral-900' : 'text-neutral-600';

    return `${sizeClass} ${weightClass} ${colorClass}`;
  });

  public iconClasses = computed(() => {
    const selected = this.selected();
    const size = this.size();

    const sizeClass = size === 'sm' ? 'text-xs' : 'text-base';
    const colorClass = selected ? 'text-neutral-900' : 'text-neutral-600';

    return `${sizeClass} ${colorClass}`;
  });

  public onSelect(): void {
    if (!this.selected()) {
      this.selectTab.emit(this.value());
    }
  }

  private switchClasses(size: TabSize, selected: boolean): string {
    const base = 'rounded-full overflow-clip';

    const sizeClasses: Record<TabSize, string> = {
      sm: 'h-6 px-2 gap-1',
      lg: 'h-7 px-3 gap-1.5',
    };

    const stateClass = selected ? 'bg-white border border-white shadow-sm' : 'border border-neutral-200';

    return `${base} ${sizeClasses[size]} ${stateClass}`;
  }

  private borderedClasses(size: TabSize, selected: boolean): string {
    const sizeClasses: Record<TabSize, string> = {
      sm: 'h-8 pt-1 gap-1',
      lg: 'h-10 pt-1 gap-1.5',
    };

    const stateClass = selected ? 'border-b border-info-500' : '';

    return `${sizeClasses[size]} ${stateClass}`;
  }
}
