// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

interface SwQueueMessage {
  type: 'lfx-sync-queued' | 'lfx-sync-success' | 'lfx-sync-failure' | 'lfx-sync-status';
  queue: string;
  queued?: number;
  replayed?: number;
  failed?: number;
}

type LastSyncResult = 'idle' | 'queued' | 'success' | 'failure';

/**
 * Mirrors the offline write queue managed by the custom service worker
 * (apps/lfx-one/public/sw.js). Listens for postMessage broadcasts from the
 * SW and exposes signal-based queue state to the rest of the app.
 *
 * If the SW isn't installed (dev mode, unsupported browser), all signals
 * stay at their initial values — the rest of the UI degrades gracefully.
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly queuedSignal: WritableSignal<number> = signal(0);
  private readonly lastResultSignal: WritableSignal<LastSyncResult> = signal('idle');
  private readonly lastReplayedSignal: WritableSignal<number> = signal(0);

  public readonly queued: Signal<number> = this.queuedSignal.asReadonly();
  public readonly hasQueue: Signal<boolean> = computed(() => this.queuedSignal() > 0);
  public readonly lastResult: Signal<LastSyncResult> = this.lastResultSignal.asReadonly();
  public readonly lastReplayed: Signal<number> = this.lastReplayedSignal.asReadonly();

  public constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const win = this.document.defaultView;
    if (!win || !('serviceWorker' in win.navigator)) {
      return;
    }
    fromEvent<MessageEvent<SwQueueMessage>>(win.navigator.serviceWorker, 'message')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => this.handle(event.data));

    // Ask the SW for its current queue size on startup. The SW may not be
    // ready yet; ignore if it isn't.
    win.navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: 'lfx-sync-status' })).catch(() => undefined);
  }

  /** Manually re-poll the queue size (e.g. after the user reconnects). */
  public refresh(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const win = this.document.defaultView;
    if (!win || !('serviceWorker' in win.navigator)) {
      return;
    }
    win.navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: 'lfx-sync-status' })).catch(() => undefined);
  }

  private handle(message: SwQueueMessage | undefined): void {
    if (!message?.type) {
      return;
    }
    switch (message.type) {
      case 'lfx-sync-queued':
        if (typeof message.queued === 'number') {
          this.queuedSignal.set(message.queued);
        }
        this.lastResultSignal.set('queued');
        break;
      case 'lfx-sync-success':
        if (typeof message.queued === 'number') {
          this.queuedSignal.set(message.queued);
        }
        if (typeof message.replayed === 'number') {
          this.lastReplayedSignal.set(message.replayed);
        }
        this.lastResultSignal.set('success');
        break;
      case 'lfx-sync-failure':
        this.lastResultSignal.set('failure');
        break;
      case 'lfx-sync-status':
        if (typeof message.queued === 'number') {
          this.queuedSignal.set(message.queued);
        }
        break;
    }
  }
}
