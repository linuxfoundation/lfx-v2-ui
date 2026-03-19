// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, output } from '@angular/core';
import { TabItem, type TabSize, type TabStyle } from './tab-item';

export interface TabDefinition {
  label: string;
  value: string;
  icon?: string;
}

@Component({
  selector: 'lfx-tabs',
  imports: [TabItem],
  templateUrl: './tabs.html',
  styleUrl: './tabs.css',
  host: {
    '[attr.data-testid]': '"tabs"',
    '[attr.role]': '"tablist"',
  },
})
export class Tabs {
  public tabs = input.required<TabDefinition[]>();
  public tabStyle = input<TabStyle>('switch');
  public size = input<TabSize>('lg');

  public activeTab = model<string>('');

  public readonly tabChange = output<string>();

  public containerClasses = computed(() => {
    const style = this.tabStyle();
    const size = this.size();

    if (style === 'switch') {
      const sizeClasses: Record<TabSize, string> = {
        sm: 'bg-neutral-100 gap-0.5 p-0.5 rounded-full',
        lg: 'bg-neutral-100 gap-1 p-1 rounded-full',
      };
      return sizeClasses[size];
    }

    const sizeClasses: Record<TabSize, string> = {
      sm: 'border-b border-neutral-200 gap-5',
      lg: 'border-b border-neutral-200 gap-6',
    };
    return sizeClasses[size];
  });

  public onTabSelect(value: string): void {
    this.activeTab.set(value);
    this.tabChange.emit(value);
  }

  public isSelected(value: string): boolean {
    return this.activeTab() === value;
  }
}
