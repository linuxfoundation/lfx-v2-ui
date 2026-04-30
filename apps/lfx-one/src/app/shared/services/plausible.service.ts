// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { afterNextRender, DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from '@environments/environment';
import { filter } from 'rxjs';

declare global {
  interface Window {
    plausible?: ((eventName: string, options?: { u?: string; props?: Record<string, unknown> }) => void) & {
      q?: unknown[];
      init?: (options?: Record<string, unknown>) => void;
      o?: Record<string, unknown>;
    };
  }
}

/**
 * Plausible analytics service for privacy-friendly page and event tracking.
 * Uses Angular's afterNextRender for SSR-safe script loading.
 */
@Injectable({
  providedIn: 'root',
})
export class PlausibleService {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private scriptLoaded = false;
  private analyticsReady = false;
  private impersonating = false;

  public setImpersonating(isImpersonating: boolean): void {
    this.impersonating = isImpersonating;
  }

  /**
   * Initialize the analytics service - should be called from app component
   */
  public initialize(): void {
    afterNextRender(() => {
      this.loadPlausibleScript();
      this.setupRouteTracking();
    });
  }

  /**
   * Track a page view
   * @param properties Optional page properties
   */
  public trackPage(properties?: Record<string, unknown>): void {
    if (this.impersonating || !this.analyticsReady || !window.plausible) {
      return;
    }

    try {
      window.plausible('pageview', { u: window.location.href, props: properties });
    } catch (error) {
      console.error('Error tracking page with Plausible:', error);
    }
  }

  /**
   * Track a custom event
   * @param eventName Event name
   * @param properties Event properties
   */
  public trackEvent(eventName: string, properties?: Record<string, unknown>): void {
    if (this.impersonating || !this.analyticsReady || !window.plausible) {
      return;
    }

    try {
      window.plausible(eventName, { props: properties });
    } catch (error) {
      console.error('Error tracking event with Plausible:', error);
    }
  }

  /**
   * Load Plausible script from CDN
   */
  private loadPlausibleScript(): void {
    if (!environment.plausible?.enabled || this.scriptLoaded) {
      return;
    }

    try {
      // Stub queues events fired before the real script finishes loading
      window.plausible =
        window.plausible ||
        ((...args: unknown[]) => {
          (window.plausible!.q = window.plausible!.q || []).push(args);
        });
      window.plausible.init =
        window.plausible.init ||
        ((options?: Record<string, unknown>) => {
          window.plausible!.o = options || {};
        });

      const script = document.createElement('script');
      script.src = environment.plausible.src;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.scriptLoaded = true;
        this.waitForPlausible();
      };

      script.onerror = (error) => {
        console.error('Failed to load Plausible analytics script:', error);
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error initializing Plausible:', error);
    }
  }

  /**
   * Wait for Plausible to be available and initialize it
   */
  private async waitForPlausible(): Promise<void> {
    const maxAttempts = 100; // 10 seconds max wait
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (typeof window?.plausible === 'function') {
        try {
          window.plausible.init?.();
          this.analyticsReady = true;
        } catch (error) {
          console.error('Error initializing Plausible:', error);
        }
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    console.error('Plausible not available after timeout');
  }

  /**
   * Set up automatic page tracking on route navigation
   */
  private setupRouteTracking(): void {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        this.trackPage({
          path: event.urlAfterRedirects,
          url: window.location.href,
          title: document.title,
        });
      });
  }
}
