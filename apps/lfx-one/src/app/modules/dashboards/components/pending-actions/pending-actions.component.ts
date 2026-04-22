// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, output, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { TagComponent } from '@components/tag/tag.component';
import { HiddenActionsService } from '@shared/services/hidden-actions.service';

import type { PendingActionItem } from '@lfx-one/shared/interfaces';
@Component({
  selector: 'lfx-pending-actions',
  imports: [ButtonComponent, TagComponent],
  templateUrl: './pending-actions.component.html',
  styleUrl: './pending-actions.component.scss',
})
export class PendingActionsComponent {
  private readonly hiddenActionsService = inject(HiddenActionsService);

  public readonly pendingActions = input.required<PendingActionItem[]>();
  public readonly displayLimit = input<number>(5);

  public readonly actionClick = output<PendingActionItem>();

  // Windowed view of the incoming list: drop anything the user has dismissed (HiddenActionsService
  // sets a 24h cookie on click) and cap to displayLimit so the user focuses on a handful at a time.
  // When one is dismissed, it leaves the window and the next waiting item slides into the slot on
  // the next change-detection pass. The full list still lives on the parent — this just controls
  // what gets rendered.
  protected readonly visibleActions: Signal<PendingActionItem[]> = computed(() => {
    const unhidden = this.pendingActions().filter((item) => !this.hiddenActionsService.isActionHidden(item));
    return unhidden.slice(0, this.displayLimit());
  });

  protected handleActionClick(item: PendingActionItem): void {
    this.hiddenActionsService.hideAction(item);
    this.actionClick.emit(item);
  }
}
