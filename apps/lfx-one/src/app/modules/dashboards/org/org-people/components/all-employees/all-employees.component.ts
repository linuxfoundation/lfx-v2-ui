// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { combineLatest, distinctUntilChanged, map, of, skip, switchMap, take, tap } from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { AccountContextService } from '@services/account-context.service';
import { PersonProfilePanelService } from '@services/person-profile-panel.service';

import { EMPTY_ORG_ALL_EMPLOYEES_RESPONSE, ORG_ALL_EMPLOYEE_ACTIVITY_OPTIONS, ORG_ALL_EMPLOYEES_INITIAL_LIMIT } from '@lfx-one/shared/constants';
import type {
  OrgAllEmployeeActivityFilter,
  OrgAllEmployeeActivityOption,
  OrgAllEmployeeDetail,
  OrgAllEmployeeRow,
  OrgAllEmployeesResponse,
  OrgAllEmployeeSortColumn,
  OrgAllEmployeeSortDirection,
  OrgDropdownOption,
} from '@lfx-one/shared/interfaces';

import { AllEmployeesService } from '../../services/all-employees.service';

import { AllEmployeesDetailComponent } from './all-employees-detail.component';

/** All Employees tab body — filter bar, 5 stat cards, sortable table with chevron-toggled detail rows. */
@Component({
  selector: 'lfx-org-people-all-employees',
  imports: [DecimalPipe, FormsModule, InputTextModule, SelectModule, SkeletonModule, TooltipModule, AllEmployeesDetailComponent],
  templateUrl: './all-employees.component.html',
})
export class AllEmployeesComponent {
  private readonly accountContext = inject(AccountContextService);
  private readonly dataService = inject(AllEmployeesService);
  private readonly personPanel = inject(PersonProfilePanelService);

  protected readonly initialLimit = ORG_ALL_EMPLOYEES_INITIAL_LIMIT;

  protected readonly searchTerm = signal<string>('');
  protected readonly selectedFoundationId = signal<string>('');
  protected readonly selectedActivity = signal<OrgAllEmployeeActivityFilter>('all');

  protected readonly sortColumn = signal<OrgAllEmployeeSortColumn>('name');
  protected readonly sortDirection = signal<OrgAllEmployeeSortDirection>(1);
  protected readonly limit = signal<number>(ORG_ALL_EMPLOYEES_INITIAL_LIMIT);

  protected readonly expansion = signal<Record<string, boolean>>({});
  protected readonly detailMap = signal<Record<string, OrgAllEmployeeDetail>>({});
  protected readonly detailLoading = signal<Record<string, boolean>>({});

  // Spread to a mutable array so PrimeNG's mutable [options] input type accepts it without an unsafe cast.
  protected readonly activityOptions: OrgAllEmployeeActivityOption[] = [...ORG_ALL_EMPLOYEE_ACTIVITY_OPTIONS];

  protected readonly statSkeletonLabels: readonly string[] = [
    'Employees Active in Open Source',
    'In Governance',
    'Code Contributors',
    'Event Attendees',
    'Trainees',
  ];

  protected readonly tableSkeletonRows: readonly number[] = [0, 1, 2, 3, 4, 5];

  // Seeded true: toSignal seeds EMPTY_ORG_ALL_EMPLOYEES_RESPONSE and a real fetch fires synchronously on mount.
  private readonly loadingState = signal<boolean>(true);
  protected readonly isLoading = this.loadingState.asReadonly();

  private readonly accountId$ = toObservable(this.accountContext.selectedAccount).pipe(
    map((account) => account.accountId),
    distinctUntilChanged()
  );

  protected readonly response: Signal<OrgAllEmployeesResponse> = toSignal(
    this.accountId$.pipe(
      tap(() => this.loadingState.set(true)),
      switchMap((accountId) => {
        if (!accountId) {
          this.loadingState.set(false);
          return of(EMPTY_ORG_ALL_EMPLOYEES_RESPONSE);
        }
        return this.dataService.getAllEmployees(accountId).pipe(tap(() => this.loadingState.set(false)));
      })
    ),
    { initialValue: EMPTY_ORG_ALL_EMPLOYEES_RESPONSE }
  );

  protected readonly stats = computed(() => this.response().stats);

  protected readonly foundationOptions: Signal<OrgDropdownOption[]> = computed(() => this.initFoundationOptions());

  protected readonly filteredRows: Signal<OrgAllEmployeeRow[]> = computed(() => this.initFilteredRows());

  protected readonly sortedRows: Signal<OrgAllEmployeeRow[]> = computed(() => this.initSortedRows());

  protected readonly totalFiltered = computed(() => this.sortedRows().length);

  protected readonly visibleRows = computed(() => this.sortedRows().slice(0, this.limit()));

  protected readonly canShowMore = computed(() => this.limit() < this.totalFiltered());

  protected readonly footerCountLabel: Signal<string> = computed(() => this.initFooterCountLabel());

  protected readonly hasNoCompany = computed(() => !this.accountContext.selectedAccount().accountId);

  protected readonly isFiltering: Signal<boolean> = computed(() => this.initIsFiltering());

  public constructor() {
    // Reset all state when the selected account changes; skip the initial emission on mount.
    toObservable(this.accountContext.selectedAccount)
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.resetAllState());

    // Reset pagination to the initial cap when any filter/sort input changes; skip(1) drops the synchronous initial combineLatest emission.
    combineLatest([
      toObservable(this.searchTerm),
      toObservable(this.selectedFoundationId),
      toObservable(this.selectedActivity),
      toObservable(this.sortColumn),
      toObservable(this.sortDirection),
    ])
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => this.limit.set(ORG_ALL_EMPLOYEES_INITIAL_LIMIT));
  }

  protected onSort(column: OrgAllEmployeeSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((d) => (d === 1 ? -1 : 1));
      return;
    }
    this.sortColumn.set(column);
    // First click on the name column → ascending; first click on a numeric column → descending.
    this.sortDirection.set(column === 'name' ? 1 : -1);
  }

  protected sortIcon(column: OrgAllEmployeeSortColumn): 'fa-light fa-sort' | 'fa-light fa-sort-up' | 'fa-light fa-sort-down' {
    if (this.sortColumn() !== column) return 'fa-light fa-sort';
    return this.sortDirection() === 1 ? 'fa-light fa-sort-up' : 'fa-light fa-sort-down';
  }

  protected toggleRow(row: OrgAllEmployeeRow): void {
    const open = !!this.expansion()[row.personKey];
    if (open) {
      this.expansion.update((state) => {
        const next = { ...state };
        delete next[row.personKey];
        return next;
      });
      return;
    }
    this.loadDetailIfNeeded(row);
    this.expansion.update((state) => ({ ...state, [row.personKey]: true }));
  }

  protected isExpanded(personKey: string): boolean {
    return !!this.expansion()[personKey];
  }

  protected getDetail(personKey: string): OrgAllEmployeeDetail | null {
    return this.detailMap()[personKey] ?? null;
  }

  protected isDetailLoading(personKey: string): boolean {
    return !!this.detailLoading()[personKey];
  }

  protected showAll(): void {
    this.limit.set(this.totalFiltered());
  }

  protected onPersonClick(row: OrgAllEmployeeRow): void {
    this.personPanel.open(row.name);
  }

  protected getInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  protected getAvatarColorClass(personKey: string): string {
    const palette = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-red-600', 'bg-gray-600'];
    const idx = AllEmployeesComponent.hashChar(personKey) % palette.length;
    return palette[idx];
  }

  private initFoundationOptions(): OrgDropdownOption[] {
    return [{ label: 'All Foundations', value: '' }, ...this.response().foundations.map((f) => ({ label: f.foundationName, value: f.foundationId }))];
  }

  private initFilteredRows(): OrgAllEmployeeRow[] {
    const rows = this.response().rows;
    const q = this.searchTerm().trim().toLowerCase();
    const foundationId = this.selectedFoundationId();
    const activity = this.selectedActivity();

    return rows.filter((row) => {
      if (q) {
        const inName = row.name.toLowerCase().includes(q);
        const inTitle = (row.title ?? '').toLowerCase().includes(q);
        if (!inName && !inTitle) return false;
      }
      if (foundationId && !row.engagedFoundationIds.includes(foundationId)) return false;
      if (activity !== 'all') {
        const matches =
          (activity === 'governance' && row.seatsCount > 0) ||
          (activity === 'code' && row.commitsCount > 0) ||
          (activity === 'events' && row.eventsCount > 0) ||
          (activity === 'training' && row.coursesCount > 0);
        if (!matches) return false;
      }
      return true;
    });
  }

  private initSortedRows(): OrgAllEmployeeRow[] {
    const filtered = this.filteredRows();
    const col = this.sortColumn();
    const dir = this.sortDirection();
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (col === 'name') {
        return a.name.localeCompare(b.name) * dir;
      }
      const va = AllEmployeesComponent.numericSortValue(a, col);
      const vb = AllEmployeesComponent.numericSortValue(b, col);
      if (va !== vb) return (va - vb) * dir;
      return a.name.localeCompare(b.name);
    });
    return copy;
  }

  private initFooterCountLabel(): string {
    const visible = Math.min(this.limit(), this.totalFiltered());
    return `Showing ${visible.toLocaleString()} of ${this.totalFiltered().toLocaleString()}`;
  }

  private initIsFiltering(): boolean {
    return this.searchTerm().trim().length > 0 || !!this.selectedFoundationId() || this.selectedActivity() !== 'all';
  }

  private loadDetailIfNeeded(row: OrgAllEmployeeRow): void {
    if (this.detailMap()[row.personKey]) return;
    if (this.detailLoading()[row.personKey]) return;
    const accountId = this.accountContext.selectedAccount().accountId;
    if (!accountId) return;

    this.detailLoading.update((state) => ({ ...state, [row.personKey]: true }));
    this.dataService
      .getEmployeeDetail(accountId, row.personKey)
      .pipe(take(1))
      .subscribe({
        next: (detail) => {
          this.detailMap.update((state) => ({ ...state, [row.personKey]: detail }));
          this.clearDetailLoading(row.personKey);
        },
        error: () => this.clearDetailLoading(row.personKey),
      });
  }

  private clearDetailLoading(personKey: string): void {
    this.detailLoading.update((state) => {
      const next = { ...state };
      delete next[personKey];
      return next;
    });
  }

  private resetAllState(): void {
    this.searchTerm.set('');
    this.selectedFoundationId.set('');
    this.selectedActivity.set('all');
    this.sortColumn.set('name');
    this.sortDirection.set(1);
    this.limit.set(ORG_ALL_EMPLOYEES_INITIAL_LIMIT);
    this.expansion.set({});
    this.detailMap.set({});
    this.detailLoading.set({});
  }

  private static numericSortValue(row: OrgAllEmployeeRow, column: Exclude<OrgAllEmployeeSortColumn, 'name'>): number {
    switch (column) {
      case 'seats':
        return row.seatsCount;
      case 'commits':
        return row.commitsCount;
      case 'events':
        return row.eventsCount;
      case 'courses':
        return row.coursesCount;
    }
  }

  private static hashChar(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }
}
