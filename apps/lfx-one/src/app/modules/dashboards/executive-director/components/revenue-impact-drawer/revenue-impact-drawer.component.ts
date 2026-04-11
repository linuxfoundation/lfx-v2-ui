// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'lfx-revenue-impact-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, DrawerModule],
  templateUrl: './revenue-impact-drawer.component.html',
  styleUrl: './revenue-impact-drawer.component.scss',
})
export class RevenueImpactDrawerComponent {
  public readonly visible = model<boolean>(false);

  // === Dummy Data ===
  protected readonly engagementTypes = [
    { type: 'Events', percentage: 24 },
    { type: 'Email Marketing', percentage: 19 },
    { type: 'Website / Organic Search', percentage: 16 },
    { type: 'Paid Social', percentage: 13 },
    { type: 'Organic Social', percentage: 10 },
    { type: 'Webinars', percentage: 8 },
    { type: 'Content / SEO', percentage: 6 },
    { type: 'Partner & Referral', percentage: 4 },
  ];

  protected onClose(): void {
    this.visible.set(false);
  }
}
