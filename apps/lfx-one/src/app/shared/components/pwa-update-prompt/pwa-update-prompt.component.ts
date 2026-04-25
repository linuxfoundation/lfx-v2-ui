// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { PwaInstallService } from '@services/pwa-install.service';

@Component({
  selector: 'lfx-pwa-update-prompt',
  imports: [ButtonComponent],
  templateUrl: './pwa-update-prompt.component.html',
  styleUrl: './pwa-update-prompt.component.scss',
})
export class PwaUpdatePromptComponent {
  private readonly pwaInstall = inject(PwaInstallService);

  protected readonly updateReady = this.pwaInstall.updateReady;

  protected onReload(): void {
    this.pwaInstall.applyUpdate();
  }
}
