// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'lfx-brand-reach-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, DrawerModule],
  templateUrl: './brand-reach-drawer.component.html',
  styleUrl: './brand-reach-drawer.component.scss',
})
export class BrandReachDrawerComponent {
  public readonly visible = model<boolean>(false);

  protected onClose(): void {
    this.visible.set(false);
  }
}
