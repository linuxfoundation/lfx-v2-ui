// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { formatNumber } from '@lfx-one/shared/utils';
import { DrawerModule } from 'primeng/drawer';

import type { BrandHealthResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-brand-health-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, DrawerModule],
  templateUrl: './brand-health-drawer.component.html',
  styleUrl: './brand-health-drawer.component.scss',
})
export class BrandHealthDrawerComponent {
  public readonly visible = model<boolean>(false);

  public readonly data = input<BrandHealthResponse>({
    totalMentions: 0,
    sentiment: { positive: 0, neutral: 0, negative: 0 },
    sentimentMomChangePp: 0,
    trend: 'up',
    monthlyMentions: [],
    topProjects: [],
  });

  protected readonly formatNumber = formatNumber;

  protected onClose(): void {
    this.visible.set(false);
  }
}
