// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { DEFAULT_PEOPLE_TAB_ID, PEOPLE_TABS, VALID_PEOPLE_TAB_IDS } from '@lfx-one/shared/constants';
import { AccountContextService } from '@services/account-context.service';

import type { PeopleTabConfig, PeopleTabId } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-org-people',
  imports: [EmptyStateComponent],
  templateUrl: './org-people.component.html',
})
export class OrgPeopleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountContext = inject(AccountContextService);

  protected readonly tabs = PEOPLE_TABS;

  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly activeTab: Signal<PeopleTabId> = computed(() => {
    const raw = this.queryParamMap().get('tab');
    return raw && VALID_PEOPLE_TAB_IDS.has(raw as PeopleTabId) ? (raw as PeopleTabId) : DEFAULT_PEOPLE_TAB_ID;
  });

  protected readonly activeTabConfig: Signal<PeopleTabConfig> = computed(() => PEOPLE_TABS.find((t) => t.id === this.activeTab()) ?? PEOPLE_TABS[0]);

  protected readonly companyName = computed(() => this.accountContext.selectedAccount().accountName);

  protected readonly hasCompany = computed(() => this.accountContext.selectedAccount().accountId !== '');

  protected readonly heading = computed(() => {
    const name = this.companyName();
    return name ? `People — ${name}` : 'People';
  });

  protected readonly noCompanyEmptyTitle = computed(() => `Select a company via Impersonate to view ${this.activeTabConfig().noun}.`);

  protected switchTab(tabId: PeopleTabId): void {
    if (tabId === this.activeTab()) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      // Drop the param when it would equal the default so the URL stays
      // `/org/people` rather than `/org/people?tab=all`.
      queryParams: { tab: tabId === DEFAULT_PEOPLE_TAB_ID ? null : tabId },
      queryParamsHandling: 'merge',
    });
  }
}
