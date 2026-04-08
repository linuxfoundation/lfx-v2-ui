// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal, signal } from '@angular/core';
import { Badge, BadgeCategory } from '@lfx-one/shared/interfaces';

import { ButtonComponent } from '@components/button/button.component';
import { BadgeCardComponent } from '../components/badge-card/badge-card.component';
import { BadgeService } from '../badge.service';

/** Represents a filter option in the category tab bar */
interface CategoryFilter {
  label: string;
  value: BadgeCategory | 'all';
}

const CATEGORY_FILTERS: CategoryFilter[] = [
  { label: 'All', value: 'all' },
  { label: 'Certifications', value: 'certification' },
  { label: 'Maintainer', value: 'maintainer' },
  { label: 'Speaking', value: 'speaking' },
  { label: 'Event Participation', value: 'event-participation' },
  { label: 'Contributions', value: 'project-contribution' },
  { label: 'Program Committee', value: 'program-committee' },
];

const PAGE_SUBTITLE =
  'Badges recognize achievements in community engagement, event participation, and project contributions. LFX One displays these recognitions as part of your professional identity.';

@Component({
  selector: 'lfx-badges-dashboard',
  imports: [BadgeCardComponent, ButtonComponent],
  templateUrl: './badges-dashboard.component.html',
})
export class BadgesDashboardComponent {
  // ─── Private Injections ────────────────────────────────────────────────────
  private readonly badgeService = inject(BadgeService);

  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly subtitle = PAGE_SUBTITLE;
  protected readonly categoryFilters = CATEGORY_FILTERS;

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly activeFilter = signal<BadgeCategory | 'all'>('all');
  private readonly allBadges = signal<Badge[]>(this.badgeService.getBadges());

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly filteredBadges: Signal<Badge[]> = this.initFilteredBadges();
  protected readonly isEmpty: Signal<boolean> = this.initIsEmpty();

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected setFilter(value: BadgeCategory | 'all'): void {
    this.activeFilter.set(value);
  }

  protected isFilterActive(value: BadgeCategory | 'all'): boolean {
    return this.activeFilter() === value;
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initFilteredBadges(): Signal<Badge[]> {
    return computed(() => {
      const filter = this.activeFilter();
      const badges = this.allBadges();
      return filter === 'all' ? badges : badges.filter((b) => b.category === filter);
    });
  }

  private initIsEmpty(): Signal<boolean> {
    return computed(() => this.allBadges().length === 0);
  }
}
