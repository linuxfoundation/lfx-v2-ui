// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { TagComponent } from '@components/tag/tag.component';
import { AccountContextService } from '@services/account-context.service';

@Component({
  selector: 'lfx-org-overview',
  imports: [TagComponent],
  templateUrl: './org-overview.component.html',
})
export class OrgOverviewComponent {
  private readonly accountContextService = inject(AccountContextService);

  protected readonly selectedAccount = this.accountContextService.selectedAccount;

  protected readonly companyName: Signal<string> = computed(() => this.selectedAccount().accountName || 'Your Organization');

  protected readonly tierLabel: Signal<string | null> = computed(() => this.selectedAccount().membershipTier ?? null);
}
