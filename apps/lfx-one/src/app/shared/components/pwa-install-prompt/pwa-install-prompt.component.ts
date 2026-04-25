// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { PersonaService } from '@services/persona.service';
import { PwaInstallService } from '@services/pwa-install.service';

const ELIGIBLE_PERSONAS = new Set<string>(['executive-director', 'board-member']);

@Component({
  selector: 'lfx-pwa-install-prompt',
  imports: [ButtonComponent],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrl: './pwa-install-prompt.component.scss',
})
export class PwaInstallPromptComponent {
  private readonly pwaInstall = inject(PwaInstallService);
  private readonly personaService = inject(PersonaService);

  protected readonly iosHintOpen = signal(false);

  protected readonly shouldRender: Signal<boolean> = computed(() => {
    const persona = this.personaService.currentPersona();
    if (!ELIGIBLE_PERSONAS.has(persona)) {
      return false;
    }
    return this.pwaInstall.canInstall() || this.pwaInstall.canShowIosHint();
  });

  protected readonly platform = this.pwaInstall.platform;
  protected readonly canInstall = this.pwaInstall.canInstall;
  protected readonly canShowIosHint = this.pwaInstall.canShowIosHint;

  protected async onInstallClick(): Promise<void> {
    if (this.canShowIosHint()) {
      this.iosHintOpen.set(true);
      return;
    }
    await this.pwaInstall.promptInstall();
  }

  protected onDismiss(): void {
    this.iosHintOpen.set(false);
    this.pwaInstall.dismiss();
  }

  protected onIosHintClose(): void {
    this.iosHintOpen.set(false);
  }
}
