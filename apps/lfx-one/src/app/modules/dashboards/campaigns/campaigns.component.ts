// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, signal } from '@angular/core';

type CampaignTab = 'planning' | 'implementation' | 'monitoring' | 'optimization';

interface TabOption {
  id: CampaignTab;
  label: string;
  icon: string;
}

const TABS: TabOption[] = [
  { id: 'planning', label: 'Planning', icon: 'fa-light fa-clipboard-list' },
  { id: 'implementation', label: 'Implementation', icon: 'fa-light fa-rocket' },
  { id: 'monitoring', label: 'Monitoring', icon: 'fa-light fa-chart-line' },
  { id: 'optimization', label: 'Optimization', icon: 'fa-light fa-wand-magic-sparkles' },
];

@Component({
  selector: 'lfx-campaigns',
  imports: [],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.scss',
})
export class CampaignsComponent {
  protected readonly tabs = TABS;
  protected readonly selectedTab = signal<CampaignTab>('planning');

  protected selectTab(tab: CampaignTab): void {
    this.selectedTab.set(tab);
  }
}
