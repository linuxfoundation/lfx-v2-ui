// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { IntercomBootOptions, IntercomFunction } from '@lfx-one/shared/interfaces';

// Browser-only widget; every method is a no-op during SSR.
@Injectable({
  providedIn: 'root',
})
export class IntercomService {
  // Read by OpenIntercomDirective to decide whether to open Intercom or fall back to JIRA.
  public isBooted = false;

  private isLoaded = false;

  /**
   * Boot Intercom with user data. Loads the widget script on first call.
   * Calls made before the script finishes loading are queued by the Intercom
   * stub (see initializeIntercomFunction) and replayed once the real SDK
   * loads — so this method is fire-and-forget.
   */
  public boot(options: IntercomBootOptions): void {
    if (typeof window === 'undefined' || !options.app_id || this.isBooted) {
      return;
    }

    this.loadIntercomScript(options.app_id, options.api_base);
    window.Intercom!('boot', options);
    this.isBooted = true;
  }

  /**
   * Show the Intercom messenger. No-op when not booted (the directive falls
   * back to the JIRA support URL in that case).
   */
  public show(): void {
    if (typeof window === 'undefined' || !window.Intercom || !this.isBooted) {
      return;
    }
    window.Intercom('show');
  }

  /**
   * Shutdown Intercom and clear identity.
   * Call before re-booting with a different user (e.g. start/end impersonation).
   */
  public shutdown(): void {
    if (typeof window === 'undefined') {
      return;
    }
    if (window.Intercom && this.isBooted) {
      window.Intercom('shutdown');
      this.isBooted = false;
    }
  }

  private loadIntercomScript(appId: string, apiBase?: string): void {
    if (this.isLoaded || typeof window === 'undefined') {
      return;
    }

    this.initializeIntercomFunction();

    window.intercomSettings = {
      api_base: apiBase || 'https://api-iam.intercom.io',
      app_id: appId,
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    script.src = `https://widget.intercom.io/widget/${appId}`;

    script.onload = () => {
      this.isLoaded = true;
    };

    script.onerror = (error) => {
      console.error('IntercomService: Failed to load script', error);
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  private initializeIntercomFunction(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const ic = window.Intercom;

    if (typeof ic === 'function') {
      ic('reattach_activator');
      ic('update', window.intercomSettings);
    } else {
      const stub: IntercomFunction = Object.assign(
        (...args: unknown[]) => {
          stub.c?.(args);
        },
        { q: [] as unknown[][], c: (args: unknown[]) => stub.q!.push(args) },
      );
      window.Intercom = stub;
    }
  }
}
