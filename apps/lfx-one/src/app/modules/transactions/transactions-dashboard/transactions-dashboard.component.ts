// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  TRANSACTION_TYPE_BUNDLE,
  TRANSACTION_TYPE_CERTIFICATION,
  TRANSACTION_TYPE_EVENT,
  TRANSACTION_TYPE_INDIVIDUAL_SUPPORT,
  TRANSACTION_TYPE_SUBSCRIPTION,
  TRANSACTION_TYPE_TRAINING,
} from '@lfx-one/shared/constants';
import { FilterPillOption, Transaction } from '@lfx-one/shared/interfaces';

import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { TransactionService } from '@services/transaction.service';

const PAGE_SUBTITLE = 'View your Linux Foundation purchase history. Recent purchases may take up to 48 hours to appear.';

const TAB_OPTIONS: FilterPillOption[] = [
  { id: 'all', label: 'All Transactions' },
  { id: 'event-tickets', label: 'Event Tickets' },
  { id: 'training', label: 'Training' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'bundle', label: 'Bundles' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'individual-support', label: 'Individual Support' },
];

const TYPE_STYLE_MAP: Record<string, string> = {
  [TRANSACTION_TYPE_EVENT]: '!bg-blue-50 !text-blue-700',
  [TRANSACTION_TYPE_TRAINING]: '!bg-emerald-50 !text-emerald-700',
  [TRANSACTION_TYPE_CERTIFICATION]: '!bg-violet-50 !text-violet-700',
  [TRANSACTION_TYPE_SUBSCRIPTION]: '!bg-amber-50 !text-amber-700',
  [TRANSACTION_TYPE_INDIVIDUAL_SUPPORT]: '!bg-rose-50 !text-rose-700',
  [TRANSACTION_TYPE_BUNDLE]: '!bg-teal-50 !text-teal-700',
};

const TAB_TYPE_MAP: Record<string, string> = {
  'event-tickets': TRANSACTION_TYPE_EVENT,
  training: TRANSACTION_TYPE_TRAINING,
  certifications: TRANSACTION_TYPE_CERTIFICATION,
  subscriptions: TRANSACTION_TYPE_SUBSCRIPTION,
  'individual-support': TRANSACTION_TYPE_INDIVIDUAL_SUPPORT,
  bundle: TRANSACTION_TYPE_BUNDLE,
};

@Component({
  selector: 'lfx-transactions-dashboard',
  imports: [FilterPillsComponent, TableComponent, TagComponent, CurrencyPipe, DatePipe],
  templateUrl: './transactions-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsDashboardComponent {
  // ─── Private Injections ────────────────────────────────────────────────────
  private readonly transactionService = inject(TransactionService);

  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly subtitle = PAGE_SUBTITLE;
  protected readonly tabOptions = TAB_OPTIONS;

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly activeTab = signal<string>('all');
  protected readonly currentPage = signal<number>(1);
  protected readonly pageSize = 10;

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly transactions: Signal<Transaction[] | undefined> = this.initTransactions();
  protected readonly filteredTransactions: Signal<Transaction[]> = this.initFilteredTransactions();
  protected readonly totalPages: Signal<number> = computed(() => Math.max(1, Math.ceil(this.filteredTransactions().length / this.pageSize)));
  protected readonly paginatedTransactions: Signal<Transaction[]> = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredTransactions().slice(start, start + this.pageSize);
  });
  protected readonly pageNumbers: Signal<number[]> = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  protected readonly firstIndex: Signal<number> = computed(() => (this.filteredTransactions().length === 0 ? 0 : (this.currentPage() - 1) * this.pageSize + 1));
  protected readonly lastIndex: Signal<number> = computed(() => Math.min(this.currentPage() * this.pageSize, this.filteredTransactions().length));

  public constructor() {
    // Reset to page 1 when tab or filtered data changes
    effect(() => {
      this.filteredTransactions();
      this.currentPage.set(1);
    });
  }

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected onTabChange(tabId: string): void {
    this.activeTab.set(tabId);
  }

  protected getTypeStyleClass(transactionType: string | null): string {
    if (!transactionType) return '';
    return TYPE_STYLE_MAP[transactionType] ?? '';
  }

  protected goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initTransactions(): Signal<Transaction[] | undefined> {
    return toSignal(this.transactionService.getTransactions());
  }

  private initFilteredTransactions(): Signal<Transaction[]> {
    return computed(() => {
      const all = this.transactions();
      if (!all) return [];

      const tab = this.activeTab();
      if (tab === 'all') return all;

      const keyword = TAB_TYPE_MAP[tab];
      if (!keyword) return all;

      return all.filter((t) => t.transactionType === keyword);
    });
  }
}
