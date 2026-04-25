// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

/**
 * Slow network effective types reported by the Network Information API.
 * Used to warn users or disable bandwidth-heavy operations (e.g. route preloading).
 */
const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g']);

interface NetworkInformationLike extends EventTarget {
  effectiveType?: string;
  type?: string;
  saveData?: boolean;
  downlink?: number;
}

type NavigatorWithConnection = Navigator & { connection?: NetworkInformationLike };

@Injectable({ providedIn: 'root' })
export class NetworkStatusService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  private readonly onlineSignal: WritableSignal<boolean> = signal(true);
  private readonly effectiveTypeSignal: WritableSignal<string | undefined> = signal(undefined);
  private readonly saveDataSignal: WritableSignal<boolean> = signal(false);

  public readonly online: Signal<boolean> = this.onlineSignal.asReadonly();
  public readonly offline: Signal<boolean> = computed(() => !this.onlineSignal());
  public readonly effectiveType: Signal<string | undefined> = this.effectiveTypeSignal.asReadonly();
  public readonly saveData: Signal<boolean> = this.saveDataSignal.asReadonly();
  public readonly slow: Signal<boolean> = computed(() => {
    const type = this.effectiveTypeSignal();
    return this.saveDataSignal() || (type !== undefined && SLOW_EFFECTIVE_TYPES.has(type));
  });

  public constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    this.onlineSignal.set(win.navigator.onLine);
    this.refreshConnection();

    fromEvent(win, 'online')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.onlineSignal.set(true);
        this.refreshConnection();
      });
    fromEvent(win, 'offline')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.onlineSignal.set(false));

    const connection = (win.navigator as NavigatorWithConnection).connection;
    if (connection) {
      fromEvent(connection, 'change')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.refreshConnection());
    }
  }

  private refreshConnection(): void {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    const connection = (win.navigator as NavigatorWithConnection).connection;
    this.effectiveTypeSignal.set(connection?.effectiveType);
    this.saveDataSignal.set(connection?.saveData === true);
  }
}
