// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { afterNextRender, DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { environment } from '@environments/environment';
import { PLAUSIBLE_DOMAIN, PLAUSIBLE_SRC } from '@lfx-one/shared/constants';
import { PlausibleCall, PlausiblePageviewContext } from '@lfx-one/shared/interfaces';
import { filter } from 'rxjs';

import { LensService } from './lens.service';
import { ProjectContextService } from './project-context.service';

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
  private readonly projectContextService = inject(ProjectContextService);
  private readonly lensService = inject(LensService);

  // Paths where context resolves asynchronously (public meeting page loads
  // project data from the API after navigation). The auto-pageview is skipped
  // for these and the owning component fires `trackPage()` once data settles,
  // so we record one enriched event per visit instead of a context-free hit.
  // Matches both upcoming-meeting URLs (`/meetings/<id>`) and past-meeting
  // occurrence URLs (`/meetings/<id>-<13-digit-timestamp>`); both forms route
  // to MeetingJoinComponent — see isPastMeetingOccurrenceId in that file.
  private static readonly deferredPageviewPattern = /^\/meetings\/\d+(-\d{13})?$/;

  private scriptLoaded = false;
  private analyticsReady = false;
  private impersonating = false;

  /**
   * Enable or disable analytics suppression for the current session.
   * Pass `true` while the user is impersonating another account so their
   * activity does not pollute the impersonated user's analytics.
   * @param isImpersonating Whether the current session is impersonated
   */
  public setImpersonating(isImpersonating: boolean): void {
    this.impersonating = isImpersonating;
  }

  /**
   * Initialize the analytics service - should be called from app component
   */
  public initialize(): void {
    if (!environment.plausible?.enabled) {
      return;
    }
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
    if (typeof window === 'undefined' || this.impersonating || !this.analyticsReady || !window.plausible) {
      return;
    }

    try {
      window.plausible('pageview', { u: this.getSanitizedUrl(), props: properties });
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
    if (typeof window === 'undefined' || this.impersonating || !this.analyticsReady || !window.plausible) {
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
      // Stub queues events fired before the real script finishes loading;
      // the real Plausible script drains q and o on first run.
      window.plausible =
        window.plausible ||
        ((...args: PlausibleCall) => {
          (window.plausible!.q = window.plausible!.q || []).push(args);
        });
      window.plausible.init =
        window.plausible.init ||
        ((options?: Record<string, unknown>) => {
          window.plausible!.o = options || {};
        });
      // Disable the SDK's automatic initial pageview so impersonated sessions
      // (where setImpersonating(true) lands after initialize()) cannot leak a
      // hit. We fire the first pageview manually from onload, gated on
      // `impersonating`, and subsequent navigations go through trackPage().
      window.plausible.init({ autoCapturePageviews: false });

      const script = document.createElement('script');
      script.src = PLAUSIBLE_SRC;
      script.setAttribute('data-domain', PLAUSIBLE_DOMAIN);
      script.async = true;
      script.defer = true;

      // analyticsReady is gated on the real script loading — onload fires
      // only after the bundle has executed and replaced the queue stub.
      script.onload = () => {
        this.analyticsReady = true;
        // Skip the initial pageview on deferred paths so a refresh on a
        // public meeting URL doesn't leak a context-free hit before the
        // component fires its enriched pageview.
        if (PlausibleService.deferredPageviewPattern.test(window.location.pathname)) {
          return;
        }
        this.trackPage(this.buildContextProps());
      };

      script.onerror = (error) => {
        // Reset so a future initialize() can retry after a transient failure.
        this.scriptLoaded = false;
        console.error('Failed to load Plausible analytics script:', error);
      };

      // Mark scriptLoaded BEFORE appending so any re-entry into
      // loadPlausibleScript() short-circuits and we never inject a duplicate
      // <script> tag.
      this.scriptLoaded = true;
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error initializing Plausible:', error);
    }
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
        if (typeof document === 'undefined') {
          return;
        }
        const path = this.getSanitizedPath(event.urlAfterRedirects);
        if (PlausibleService.deferredPageviewPattern.test(path)) {
          return;
        }
        this.trackPage({
          path,
          url: this.getSanitizedUrl(),
          title: document.title,
          ...this.buildContextProps(),
        });
      });
  }

  /**
   * Build the foundation / project / lens custom-props for the current
   * pageview from the active app state. Keys with empty values are omitted
   * so Plausible doesn't store empty strings as a distinct dimension value.
   * Returned as a Record so callers can spread into the broader pageview
   * props payload that `trackPage` forwards to Plausible.
   */
  private buildContextProps(): Record<string, unknown> {
    const context: PlausiblePageviewContext = {};
    // Read foundation and project independently so the project lens emits
    // both keys — letting the dashboard filter by either dimension.
    const foundation = this.projectContextService.selectedFoundation();
    if (foundation?.slug) {
      context.foundation = foundation.slug;
    }
    if (foundation?.name) {
      context.foundation_name = foundation.name;
    }
    const project = this.projectContextService.selectedProject();
    if (project?.slug) {
      context.project = project.slug;
    }
    if (project?.name) {
      context.project_name = project.name;
    }
    const lens = this.lensService.activeLens();
    if (lens) {
      context.lens = lens;
    }
    return { ...context };
  }

  /**
   * Build a privacy-safe URL string for Plausible.
   * Strips query params and hash to avoid leaking auth tokens, OTPs, or
   * password-reset codes that callbacks sometimes carry in the URL.
   * Returns an empty string when called outside the browser (SSR).
   */
  private getSanitizedUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}${window.location.pathname}`;
  }

  /**
   * Strip query params and hash from a router-emitted URL so we never
   * forward sensitive segments through the `path` prop. Both the SSR
   * fallback and the URL-parse-failure fallback also strip `?` and `#` so
   * sanitization is guaranteed regardless of which path runs.
   */
  private getSanitizedPath(rawPath: string): string {
    if (typeof window === 'undefined') {
      return rawPath.split('#')[0].split('?')[0];
    }
    try {
      return new URL(rawPath, window.location.origin).pathname;
    } catch {
      return rawPath.split('#')[0].split('?')[0];
    }
  }
}
