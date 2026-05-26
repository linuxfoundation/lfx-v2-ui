// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { DEFAULT_ORG_EVENTS_TAB_ID, ORG_EVENTS_STATUS_OPTIONS, ORG_EVENTS_TABS, VALID_ORG_EVENTS_TAB_IDS } from '@lfx-one/shared/constants';
import type { OrgEventStatFilterId, OrgEventsTabId } from '@lfx-one/shared/interfaces';
import { AccountContextService } from '@app/shared/services/account-context.service';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { DiscoverEventsButtonComponent } from '../components/discover-events-button/discover-events-button.component';

@Component({
  selector: 'lfx-org-events-dashboard',
  imports: [FormsModule, CardComponent, EmptyStateComponent, SelectModule, InputTextModule, DiscoverEventsButtonComponent],
  templateUrl: './org-events-dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgEventsDashboardComponent {
  // === Private injections ===
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountContext = inject(AccountContextService);
  private readonly platformId = inject(PLATFORM_ID);

  // === Template constants ===
  protected readonly tabs = ORG_EVENTS_TABS;
  protected readonly statusOptions = ORG_EVENTS_STATUS_OPTIONS;

  // === WritableSignals ===
  protected readonly activeStatFilter = signal<OrgEventStatFilterId | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly selectedStatus = signal<string | null>(null);

  // === Computed / toSignal ===
  protected readonly companyName = computed(() => this.accountContext.selectedAccount().accountName ?? '');
  protected readonly activeTab: Signal<OrgEventsTabId> = this.initActiveTab();

  // === Protected methods ===
  protected applyEventsStatFilter(id: OrgEventStatFilterId): void {
    this.activeStatFilter.set(this.activeStatFilter() === id ? null : id);
  }

  protected switchTab(tabId: OrgEventsTabId): void {
    if (tabId === this.activeTab()) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId === DEFAULT_ORG_EVENTS_TAB_ID ? null : tabId },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected onTabKeydown(event: KeyboardEvent): void {
    const ids = this.tabs.map((t) => t.id);
    const idx = ids.indexOf(this.activeTab());
    let next: number | null = null;
    if (event.key === 'ArrowRight') next = (idx + 1) % ids.length;
    else if (event.key === 'ArrowLeft') next = (idx - 1 + ids.length) % ids.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = ids.length - 1;
    if (next !== null) {
      event.preventDefault();
      this.switchTab(ids[next]);
      if (isPlatformBrowser(this.platformId)) {
        (document.getElementById(`org-events-tab-${ids[next]}`) as HTMLElement | null)?.focus();
      }
    }
  }

  // === Private initializers ===
  private initActiveTab(): Signal<OrgEventsTabId> {
    const queryParamMap = toSignal(this.route.queryParamMap, {
      initialValue: this.route.snapshot.queryParamMap,
    });
    return computed(() => {
      const raw = queryParamMap().get('tab');
      return raw && VALID_ORG_EVENTS_TAB_IDS.has(raw as OrgEventsTabId) ? (raw as OrgEventsTabId) : DEFAULT_ORG_EVENTS_TAB_ID;
    });
  }
}
