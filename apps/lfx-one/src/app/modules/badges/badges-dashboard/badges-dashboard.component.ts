// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal, signal } from '@angular/core';
import { Badge, BadgeCategory, FilterPillOption } from '@lfx-one/shared/interfaces';

import { ButtonComponent } from '@components/button/button.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { BadgeCardComponent } from '../components/badge-card/badge-card.component';
import { BadgeService } from '../badge.service';

const CATEGORY_FILTER_OPTIONS: FilterPillOption[] = [
  { id: 'all', label: 'All' },
  { id: 'certification', label: 'Certifications' },
  { id: 'maintainer', label: 'Maintainer' },
  { id: 'speaking', label: 'Speaking' },
  { id: 'event-participation', label: 'Event Participation' },
  { id: 'project-contribution', label: 'Contributions' },
  { id: 'program-committee', label: 'Program Committee' },
];

const PAGE_SUBTITLE = 'Badges recognize achievements in community engagement, event participation, and project contributions.';

@Component({
  selector: 'lfx-badges-dashboard',
  imports: [BadgeCardComponent, ButtonComponent, FilterPillsComponent],
  templateUrl: './badges-dashboard.component.html',
})
export class BadgesDashboardComponent {
  // ─── Private Injections ────────────────────────────────────────────────────
  private readonly badgeService = inject(BadgeService);

  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly subtitle = PAGE_SUBTITLE;
  protected readonly filterOptions = CATEGORY_FILTER_OPTIONS;

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly activeFilter = signal<string>('all');
  private readonly allBadges = signal<Badge[]>(this.badgeService.getBadges());

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly filteredBadges: Signal<Badge[]> = this.initFilteredBadges();
  protected readonly isEmpty: Signal<boolean> = this.initIsEmpty();

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected onFilterChange(filterId: string): void {
    this.activeFilter.set(filterId);
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initFilteredBadges(): Signal<Badge[]> {
    return computed(() => {
      const filter = this.activeFilter() as BadgeCategory | 'all';
      const badges = this.allBadges();
      return filter === 'all' ? badges : badges.filter((b) => b.category === filter);
    });
  }

  private initIsEmpty(): Signal<boolean> {
    return computed(() => this.allBadges().length === 0);
  }
}
