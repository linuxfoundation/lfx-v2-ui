// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, model, output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

const DEFAULT_REASON = "This seat is controlled by the foundation and cannot be edited from your organization's view.";

@Component({
  selector: 'lfx-why-cant-edit-modal',
  standalone: true,
  imports: [DialogModule],
  templateUrl: './why-cant-edit-modal.component.html',
})
export class WhyCantEditModalComponent {
  // === Two-way bound visibility ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly reason = input<string | null>(null);
  public readonly seatId = input<string>('');

  // === Outputs ===
  public readonly modalHide = output<void>();
  public readonly contactFoundationClick = output<void>();

  /** FR-012a — render `reason` if non-null/non-empty, otherwise the generic fallback. */
  protected readonly displayedReason = computed(() => {
    const r = this.reason();
    return r && r.trim().length > 0 ? r : DEFAULT_REASON;
  });

  protected onGotIt(): void {
    this.visible.set(false);
    this.modalHide.emit();
  }

  protected onContactFoundation(): void {
    // V1: emit only. Parent handles the no-op console log per FR-012c.
    this.contactFoundationClick.emit();
  }

  protected onHide(): void {
    this.modalHide.emit();
  }
}
