// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, signal } from '@angular/core';

type InvolveTab = 'brand' | 'talent' | 'risk' | 'security' | 'systems' | 'insights';

@Component({
  selector: 'lfx-org-strategy',
  templateUrl: './org-strategy.component.html',
})
export class OrgStrategyComponent {
  protected readonly activeInvolveTab = signal<InvolveTab>('brand');

  protected setInvolveTab(tab: string): void {
    this.activeInvolveTab.set(tab as InvolveTab);
  }
}
