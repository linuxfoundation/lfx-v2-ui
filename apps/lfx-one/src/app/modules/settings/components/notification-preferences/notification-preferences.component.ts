// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, OnInit, signal, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { PersonaService } from '@services/persona.service';
import { PushNotificationService } from '@services/push-notification.service';

const ELIGIBLE_PERSONAS = new Set<string>(['executive-director', 'board-member']);

@Component({
  selector: 'lfx-notification-preferences',
  imports: [ButtonComponent],
  templateUrl: './notification-preferences.component.html',
})
export class NotificationPreferencesComponent implements OnInit {
  private readonly pushService = inject(PushNotificationService);
  private readonly personaService = inject(PersonaService);

  protected readonly visible: Signal<boolean> = computed(() => ELIGIBLE_PERSONAS.has(this.personaService.currentPersona()));
  protected readonly subscribed = this.pushService.subscribed;
  protected readonly available = this.pushService.available;
  protected readonly permission = this.pushService.permission;

  protected readonly working = signal(false);
  protected readonly testFeedback = signal<string | null>(null);

  public ngOnInit(): void {
    this.pushService.initialize();
  }

  protected async onToggle(): Promise<void> {
    if (this.working()) {
      return;
    }
    this.testFeedback.set(null);
    this.working.set(true);
    try {
      if (this.subscribed()) {
        await this.pushService.unsubscribe();
      } else {
        await this.pushService.subscribe();
      }
    } finally {
      this.working.set(false);
    }
  }

  protected async onSendTest(): Promise<void> {
    this.testFeedback.set(null);
    this.working.set(true);
    try {
      const result = await this.pushService.sendTest();
      if (result === null) {
        this.testFeedback.set('Could not reach the push server.');
      } else if (result.delivered === 0) {
        this.testFeedback.set('No active subscriptions on this device.');
      } else {
        this.testFeedback.set(`Sent — delivered to ${result.delivered} device(s).`);
      }
    } finally {
      this.working.set(false);
    }
  }
}
