// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, Signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { CardComponent } from '@components/card/card.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { SelectComponent } from '@components/select/select.component';
import { Paginator, PaginatorState } from 'primeng/paginator';
import { Popover, PopoverModule } from 'primeng/popover';
import { SkeletonModule } from 'primeng/skeleton';
import { MessageService } from 'primeng/api';
import { BADGE_FILTER_OPTIONS, BADGE_LABEL, BADGE_STATUS_FILTER_OPTIONS, BADGE_VISIBILITY_FILTER_OPTIONS } from '@lfx-one/shared';
import { Badge, BadgeCategory, BadgeState, BadgeStatusFilter, BadgeVisibilityFilter } from '@lfx-one/shared/interfaces';
import { catchError, map, of, startWith } from 'rxjs';

import { BadgesService } from '../../../shared/services/badges.service';

const BADGES_PER_PAGE = 12;
const SKELETON_CARDS = [1, 2, 3, 4, 5, 6];

/** Status filter options shaped for lfx-select: { label, value } */
const STATUS_SELECT_OPTIONS = BADGE_STATUS_FILTER_OPTIONS.map(o => ({ label: o.label, value: o.id }));

/** Visibility filter options shaped for lfx-select: { label, value } */
const VISIBILITY_SELECT_OPTIONS = BADGE_VISIBILITY_FILTER_OPTIONS.map(o => ({ label: o.label, value: o.id }));

@Component({
  selector: 'lfx-badges-dashboard',
  imports: [CardComponent, FilterPillsComponent, ReactiveFormsModule, SelectComponent, DatePipe, NgTemplateOutlet, Paginator, PopoverModule, SkeletonModule],
  templateUrl: './badges-dashboard.component.html',
  styleUrl: './badges-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgesDashboardComponent {
  // === Injections ===
  private readonly badgesService = inject(BadgesService);
  private readonly messageService = inject(MessageService);

  // === Constants ===
  protected readonly badgeLabelPlural = BADGE_LABEL.plural;
  protected readonly filterOptions = BADGE_FILTER_OPTIONS;
  protected readonly statusSelectOptions = STATUS_SELECT_OPTIONS;
  protected readonly visibilitySelectOptions = VISIBILITY_SELECT_OPTIONS;
  protected readonly rowsPerPage = BADGES_PER_PAGE;
  protected readonly skeletonCards = SKELETON_CARDS;

  // === Forms ===
  protected readonly statusForm = new FormGroup({
    status: new FormControl<BadgeStatusFilter>('all', { nonNullable: true }),
  });

  protected readonly visibilityForm = new FormGroup({
    visibility: new FormControl<BadgeVisibilityFilter>('all', { nonNullable: true }),
  });

  // === View Children ===
  protected readonly filtersPopover = viewChild<Popover>('filtersPopover');

  // === Writable Signals ===
  protected readonly selectedFilter = signal<BadgeCategory | 'all'>('all');
  protected readonly selectedStatusFilter = signal<BadgeStatusFilter>('all');
  protected readonly selectedVisibilityFilter = signal<BadgeVisibilityFilter>('all');
  protected readonly paginatorFirst = signal<number>(0);

  // === Declarative State ===
  private readonly badgeState: Signal<BadgeState> = this.initializeBadgeState();
  protected readonly loading = computed(() => this.badgeState().loading);
  protected readonly hasError = computed(() => this.badgeState().error);
  private readonly badges = computed(() => this.badgeState().data);

  // === Computed Signals ===
  protected readonly hasActiveFilters = computed(() => this.selectedStatusFilter() !== 'all' || this.selectedVisibilityFilter() !== 'all');
  protected readonly filteredBadges = this.initializeFilteredBadges();
  protected readonly badgeCount = computed(() => this.filteredBadges().length);
  protected readonly paginatedBadges = computed(() => {
    const first = this.paginatorFirst();
    return this.filteredBadges().slice(first, first + BADGES_PER_PAGE);
  });

  public constructor() {
    // Bridge status form control changes to signal
    this.statusForm.controls.status.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(value => this.selectedStatusFilter.set(value));

    // Bridge visibility form control changes to signal
    this.visibilityForm.controls.visibility.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(value => this.selectedVisibilityFilter.set(value));

    // Reset to first page when any filter changes
    effect(() => {
      this.selectedFilter();
      this.selectedStatusFilter();
      this.selectedVisibilityFilter();
      this.paginatorFirst.set(0);
    }, { allowSignalWrites: true });
  }

  protected onFilterChange(filter: string): void {
    this.selectedFilter.set(filter as BadgeCategory | 'all');
  }

  protected toggleFiltersPanel(event: MouseEvent): void {
    this.filtersPopover()?.toggle(event);
  }

  protected async shareBadge(event: MouseEvent, credlyUrl: string): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(credlyUrl);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Badge URL copied to clipboard',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Copy failed',
        detail: 'Unable to copy link to clipboard',
      });
    }
  }

  protected onPageChange(event: PaginatorState): void {
    this.paginatorFirst.set(event.first ?? 0);
  }

  private initializeBadgeState(): Signal<BadgeState> {
    return toSignal(
      this.badgesService.getBadges().pipe(
        map((data): BadgeState => ({ loading: false, error: false, data })),
        catchError(() => of<BadgeState>({ loading: false, error: true, data: [] })),
        startWith<BadgeState>({ loading: true, error: false, data: [] })
      ),
      { initialValue: { loading: true, error: false, data: [] } }
    );
  }

  private initializeFilteredBadges(): Signal<Badge[]> {
    return computed(() => {
      const categoryFilter = this.selectedFilter();
      const statusFilter = this.selectedStatusFilter();
      const visibilityFilter = this.selectedVisibilityFilter();
      let result = this.badges();

      if (categoryFilter !== 'all') {
        result = result.filter(badge => badge.category === categoryFilter);
      }

      if (statusFilter === 'active') {
        result = result.filter(badge => !badge.isExpired);
      } else if (statusFilter === 'expired') {
        result = result.filter(badge => badge.isExpired);
      }

      if (visibilityFilter === 'public') {
        result = result.filter(badge => badge.isPublic);
      } else if (visibilityFilter === 'private') {
        result = result.filter(badge => !badge.isPublic);
      }

      return result;
    });
  }
}
