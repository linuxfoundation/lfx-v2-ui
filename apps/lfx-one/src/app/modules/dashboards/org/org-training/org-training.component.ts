// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, PLATFORM_ID, signal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { DEFAULT_ORG_TRAINING_TAB_ID, ORG_TRAINING_LEVEL_OPTIONS, ORG_TRAINING_TABS, VALID_ORG_TRAINING_TAB_IDS } from '@lfx-one/shared/constants';
import type { OrgTrainingTabId } from '@lfx-one/shared/interfaces';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { AccountContextService } from '@shared/services/account-context.service';

@Component({
  selector: 'lfx-org-training',
  imports: [FormsModule, CardComponent, EmptyStateComponent, InputTextModule, SelectModule],
  templateUrl: './org-training.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgTrainingComponent {
  // ─── Private injections ────────────────────────────────────────────────────
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly accountContext = inject(AccountContextService);
  private readonly platformId = inject(PLATFORM_ID);

  // ─── Configuration ─────────────────────────────────────────────────────────
  protected readonly tabs = ORG_TRAINING_TABS;
  protected readonly levelOptions = ORG_TRAINING_LEVEL_OPTIONS;

  // ─── Writable Signals ──────────────────────────────────────────────────────
  protected readonly searchTerm = signal('');
  protected readonly selectedLevel = signal<string | null>(null);

  // ─── Computed / toSignal ───────────────────────────────────────────────────
  protected readonly companyName = computed(() => this.accountContext.selectedAccount().accountName ?? '');
  protected readonly activeTab: Signal<OrgTrainingTabId> = this.initActiveTab();

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected switchTab(tabId: OrgTrainingTabId): void {
    if (tabId === this.activeTab()) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabId === DEFAULT_ORG_TRAINING_TAB_ID ? null : tabId },
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
        (document.getElementById(`org-training-tab-${ids[next]}`) as HTMLElement | null)?.focus();
      }
    }
  }

  protected onStatCardClick(tabId: OrgTrainingTabId): void {
    this.switchTab(tabId);
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initActiveTab(): Signal<OrgTrainingTabId> {
    const queryParamMap = toSignal(this.route.queryParamMap, {
      initialValue: this.route.snapshot.queryParamMap,
    });
    return computed(() => {
      const raw = queryParamMap().get('tab');
      return raw && VALID_ORG_TRAINING_TAB_IDS.has(raw as OrgTrainingTabId) ? (raw as OrgTrainingTabId) : DEFAULT_ORG_TRAINING_TAB_ID;
    });
  }
}
