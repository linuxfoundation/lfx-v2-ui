// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FilterPillOption } from '@lfx-one/shared/interfaces';

import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';

const PAGE_SUBTITLE = "Your organization's Linux Foundation training and certification footprint — enrollments, completions, and certification leaders.";

const TAB_OPTIONS: FilterPillOption[] = [
  { id: 'certifications', label: 'Certifications' },
  { id: 'trainings', label: 'Trainings' },
];

const USEFUL_LINKS = [
  {
    label: 'LF Education & Certification',
    url: 'https://training.linuxfoundation.org',
    description: 'Browse certifications, explore the full course catalog, and register for exams.',
  },
  {
    label: 'Certification Verification Tool',
    url: 'https://training.linuxfoundation.org/certification/verify/',
    description: 'Confirm and share the validity of certifications earned by your employees.',
  },
];

@Component({
  selector: 'lfx-org-training',
  imports: [CardComponent, EmptyStateComponent, FilterPillsComponent],
  templateUrl: './org-training.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgTrainingComponent {
  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly subtitle = PAGE_SUBTITLE;
  protected readonly tabOptions = TAB_OPTIONS;
  protected readonly usefulLinks = USEFUL_LINKS;

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly activeTab = signal<string>('certifications');

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  protected onStatCardClick(tabId: string): void {
    this.activeTab.set(tabId);
  }
}
