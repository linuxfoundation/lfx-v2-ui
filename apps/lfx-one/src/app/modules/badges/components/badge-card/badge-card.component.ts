// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, input, Signal } from '@angular/core';
import { Badge, BadgeCategory, TagProps } from '@lfx-one/shared/interfaces';

import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';

/** Human-readable label for each badge category */
const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  certification: 'Certification',
  speaking: 'Speaking',
  'event-participation': 'Event Participation',
  'project-contribution': 'Project Contribution',
  maintainer: 'Maintainer',
  'program-committee': 'Program Committee',
};

/** PrimeNG tag severity per badge category */
const CATEGORY_SEVERITIES: Record<BadgeCategory, TagProps['severity']> = {
  certification: 'info',
  speaking: 'warn',
  'event-participation': 'secondary',
  'project-contribution': 'contrast',
  maintainer: 'success',
  'program-committee': 'danger',
};

@Component({
  selector: 'lfx-badge-card',
  imports: [CardComponent, TagComponent, ButtonComponent, DatePipe],
  templateUrl: './badge-card.component.html',
})
export class BadgeCardComponent {
  // ─── Inputs ────────────────────────────────────────────────────────────────
  public readonly badge = input.required<Badge>();

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly categoryLabel: Signal<string> = this.initCategoryLabel();
  protected readonly categorySeverity: Signal<TagProps['severity']> = this.initCategorySeverity();

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initCategoryLabel(): Signal<string> {
    return computed(() => CATEGORY_LABELS[this.badge().category]);
  }

  private initCategorySeverity(): Signal<TagProps['severity']> {
    return computed(() => CATEGORY_SEVERITIES[this.badge().category]);
  }
}
