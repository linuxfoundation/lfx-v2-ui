// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, input, Signal } from '@angular/core';
import { Badge, BadgeCategory } from '@lfx-one/shared/interfaces';

import { ButtonComponent } from '@components/button/button.component';

/** Human-readable label for each badge category */
const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  certification: 'Certification',
  speaking: 'Speaking',
  'event-participation': 'Event Participation',
  'project-contribution': 'Project Contribution',
  maintainer: 'Maintainer',
  'program-committee': 'Program Committee',
};

@Component({
  selector: 'lfx-badge-card',
  imports: [ButtonComponent, DatePipe],
  templateUrl: './badge-card.component.html',
})
export class BadgeCardComponent {
  // ─── Inputs ────────────────────────────────────────────────────────────────
  public readonly badge = input.required<Badge>();

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly categoryLabel: Signal<string> = this.initCategoryLabel();
  protected readonly hasImage: Signal<boolean> = this.initHasImage();

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initCategoryLabel(): Signal<string> {
    return computed(() => CATEGORY_LABELS[this.badge().category]);
  }

  private initHasImage(): Signal<boolean> {
    return computed(() => !!this.badge().imageUrl);
  }
}
