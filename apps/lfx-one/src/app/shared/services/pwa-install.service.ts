// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, inject, Injectable, PLATFORM_ID, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { Capacitor } from '@capacitor/core';
import { BeforeInstallPromptEvent, PwaDisplayMode, PwaPlatform } from '@lfx-one/shared/interfaces';
import { fromEvent } from 'rxjs';

import { isPlatformBrowser } from '@angular/common';

const DISMISSED_STORAGE_KEY = 'lfx-pwa-install-dismissed-at';
const DISMISS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swUpdate = inject(SwUpdate, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private readonly deferredPromptSignal: WritableSignal<BeforeInstallPromptEvent | null> = signal(null);
  private readonly installedSignal: WritableSignal<boolean> = signal(false);
  private readonly updateReadySignal: WritableSignal<boolean> = signal(false);

  public readonly platform: Signal<PwaPlatform> = computed(() => this.detectPlatform());
  public readonly displayMode: Signal<PwaDisplayMode> = computed(() => this.detectDisplayMode());
  public readonly isStandalone: Signal<boolean> = computed(() => this.displayMode() === 'standalone' || this.displayMode() === 'fullscreen');
  public readonly installed: Signal<boolean> = this.installedSignal.asReadonly();
  public readonly updateReady: Signal<boolean> = this.updateReadySignal.asReadonly();

  /**
   * True when the app is installable via the browser's native prompt (Android / desktop Chrome).
   * iOS does not fire beforeinstallprompt — use {@link canShowIosHint} for the manual-add flow.
   * Always false inside the Capacitor native shell, where the user already has the app.
   */
  public readonly canInstall: Signal<boolean> = computed(
    () => !Capacitor.isNativePlatform() && !this.isStandalone() && !this.isDismissed() && this.deferredPromptSignal() !== null
  );

  /** iOS Safari has no programmatic install — show the "Add to Home Screen" hint instead. */
  public readonly canShowIosHint: Signal<boolean> = computed(
    () => !Capacitor.isNativePlatform() && !this.isStandalone() && !this.isDismissed() && this.platform() === 'ios'
  );

  public constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.listenForInstallPrompt();
    this.listenForAppInstalled();
    this.listenForSwUpdate();
  }

  /**
   * Trigger the captured install prompt. Resolves with the user's choice, or 'dismissed' if no
   * prompt is available.
   */
  public async promptInstall(): Promise<'accepted' | 'dismissed'> {
    const deferred = this.deferredPromptSignal();
    if (!deferred) {
      return 'dismissed';
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    this.deferredPromptSignal.set(null);
    if (choice.outcome === 'dismissed') {
      this.markDismissed();
    }
    return choice.outcome;
  }

  /** Persist the dismissal so the banner doesn't nag for {@link DISMISS_TTL_MS}. */
  public dismiss(): void {
    this.markDismissed();
  }

  /** Reload the page to activate a newly-installed service worker. */
  public applyUpdate(): void {
    this.document.defaultView?.location.reload();
  }

  private listenForInstallPrompt(): void {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    fromEvent<BeforeInstallPromptEvent>(win, 'beforeinstallprompt')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        event.preventDefault();
        this.deferredPromptSignal.set(event);
      });
  }

  private listenForAppInstalled(): void {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    fromEvent(win, 'appinstalled')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.installedSignal.set(true);
        this.deferredPromptSignal.set(null);
      });
  }

  private listenForSwUpdate(): void {
    if (!this.swUpdate?.isEnabled) {
      return;
    }
    this.swUpdate.versionUpdates.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateReadySignal.set(true);
      }
    });
  }

  private detectDisplayMode(): PwaDisplayMode {
    const win = this.document.defaultView;
    if (!win) {
      return 'unknown';
    }
    if (win.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    if (win.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    }
    if (win.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    }
    // iOS Safari exposes navigator.standalone on its own
    if ((win.navigator as Navigator & { standalone?: boolean }).standalone) {
      return 'standalone';
    }
    return 'browser';
  }

  private detectPlatform(): PwaPlatform {
    const win = this.document.defaultView;
    if (!win) {
      return 'unknown';
    }
    const ua = win.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      return 'ios';
    }
    if (/android/.test(ua)) {
      return 'android';
    }
    return 'desktop';
  }

  private isDismissed(): boolean {
    const win = this.document.defaultView;
    if (!win) {
      return false;
    }
    try {
      const stored = win.localStorage.getItem(DISMISSED_STORAGE_KEY);
      if (!stored) {
        return false;
      }
      const dismissedAt = Number(stored);
      if (!Number.isFinite(dismissedAt)) {
        return false;
      }
      return Date.now() - dismissedAt < DISMISS_TTL_MS;
    } catch {
      return false;
    }
  }

  private markDismissed(): void {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    try {
      win.localStorage.setItem(DISMISSED_STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage may be unavailable (private mode, storage full) — silent fail is fine.
    }
  }
}
