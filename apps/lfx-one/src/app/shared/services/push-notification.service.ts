// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { PushPayload } from '@lfx-one/shared/interfaces';
import { firstValueFrom } from 'rxjs';

interface PublicKeyResponse {
  publicKey: string | null;
  enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly swPush = inject(SwPush, { optional: true });
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly permissionSignal: WritableSignal<NotificationPermission> = signal('default');
  private readonly subscribedSignal: WritableSignal<boolean> = signal(false);
  private readonly publicKeySignal: WritableSignal<string | null> = signal(null);
  private readonly initializedSignal: WritableSignal<boolean> = signal(false);

  public readonly permission: Signal<NotificationPermission> = this.permissionSignal.asReadonly();
  public readonly subscribed: Signal<boolean> = this.subscribedSignal.asReadonly();
  public readonly initialized: Signal<boolean> = this.initializedSignal.asReadonly();
  public readonly available: Signal<boolean> = computed(() => Boolean(this.swPush?.isEnabled) && this.publicKeySignal() !== null);

  public constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.refreshPermission();
    if (this.swPush?.isEnabled) {
      this.swPush.subscription.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((sub) => {
        this.subscribedSignal.set(sub !== null);
      });
      this.swPush.notificationClicks.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
        const url = (event.notification.data as { url?: string } | null)?.url;
        if (url) {
          this.router.navigateByUrl(url);
        }
      });
    }
  }

  /**
   * Fetch the server's VAPID public key and remember it. Cheap to call
   * multiple times — guarded by the initialized flag.
   */
  public async initialize(): Promise<void> {
    if (this.initializedSignal() || !isPlatformBrowser(this.platformId)) {
      return;
    }
    try {
      const response = await firstValueFrom(this.http.get<PublicKeyResponse>('/api/push/public-key'));
      this.publicKeySignal.set(response?.enabled ? (response.publicKey ?? null) : null);
    } catch (error) {
      console.warn('[PushNotificationService] failed to fetch public key', error);
      this.publicKeySignal.set(null);
    } finally {
      this.initializedSignal.set(true);
    }
  }

  public async subscribe(): Promise<boolean> {
    if (!this.swPush?.isEnabled) {
      return false;
    }
    await this.initialize();
    const publicKey = this.publicKeySignal();
    if (!publicKey) {
      return false;
    }
    try {
      const sub = await this.swPush.requestSubscription({ serverPublicKey: publicKey });
      await firstValueFrom(this.http.post('/api/push/subscribe', sub.toJSON()));
      this.subscribedSignal.set(true);
      this.refreshPermission();
      return true;
    } catch (error) {
      console.warn('[PushNotificationService] subscribe failed', error);
      this.refreshPermission();
      return false;
    }
  }

  public async unsubscribe(): Promise<void> {
    if (!this.swPush?.isEnabled) {
      return;
    }
    const current = await firstValueFrom(this.swPush.subscription);
    const endpoint = current?.endpoint;
    try {
      await this.swPush.unsubscribe();
    } catch {
      // Already unsubscribed — fall through to clear server-side state below.
    }
    if (endpoint) {
      try {
        await firstValueFrom(this.http.post('/api/push/unsubscribe', { endpoint }));
      } catch {
        // Server cleanup failure is non-fatal — the client state is correct.
      }
    }
    this.subscribedSignal.set(false);
  }

  public async sendTest(): Promise<{ delivered: number; failed: number } | null> {
    try {
      return await firstValueFrom(this.http.post<{ delivered: number; failed: number }>('/api/push/test', {}));
    } catch (error) {
      console.warn('[PushNotificationService] test push failed', error);
      return null;
    }
  }

  /**
   * Re-read the current Notification permission. Browsers don't fire an event
   * when permission changes, so call this after any user action that might
   * have updated it.
   */
  public refreshPermission(): void {
    if (typeof Notification === 'undefined') {
      return;
    }
    this.permissionSignal.set(Notification.permission);
  }

  /**
   * Render a payload locally. Used during dev to preview notification
   * styling without round-tripping through the push server.
   */
  public showLocal(payload: PushPayload): void {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }
    new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon ?? '/icons/icon-192.png',
      tag: payload.tag,
      data: { url: payload.url },
    });
  }
}
