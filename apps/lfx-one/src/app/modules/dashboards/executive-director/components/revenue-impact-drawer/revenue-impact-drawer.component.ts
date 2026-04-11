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

  protected onClose(): void {
    this.visible.set(false);
  }
}
