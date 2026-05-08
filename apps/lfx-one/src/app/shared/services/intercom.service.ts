// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { IntercomBootOptions, IntercomFunction } from '@lfx-one/shared/interfaces';

// Browser-only widget; every method is a no-op during SSR.
@Injectable({
  providedIn: 'root',
})
export class IntercomService {
  private isLoaded = false;
  private isBooted = false;
  private isLoading = false;
  private scriptLoadError: Error | null = null;

  /**
   * Boot Intercom with user data. Loads the widget script on first call.
   */
  public boot(options: IntercomBootOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      if (!options.app_id) {
        reject(new Error('No Intercom App ID configured'));
        return;
      }

      if (this.isBooted) {
        console.info('IntercomService: Already booted, updating instead');
        this.update(this.toUserAttributes(options));
        resolve();
        return;
      }

      // Snapshot options immediately to prevent concurrent boot() calls from mixing profiles/JWTs
      const snapshot = { ...options };

      // Declared with let so the onerror callback (via loadIntercomScript) can clear them
      let checkLoaded: ReturnType<typeof setInterval>;
      let timeoutHandle: ReturnType<typeof setTimeout>;

      // Load Intercom script on first boot (deferred to ensure authenticated users only)
      if (!this.isLoaded && !this.isLoading) {
        this.isLoading = true;
        this.scriptLoadError = null;
        this.loadIntercomScript(snapshot.app_id, snapshot.api_base, () => {
          clearInterval(checkLoaded);
          clearTimeout(timeoutHandle);
          const err = this.scriptLoadError ?? new Error('Intercom script failed to load');
          this.scriptLoadError = null;
          reject(err);
        });
      }

      // Wait for script to load (poll isLoaded to ensure real script loaded, not just stub)
      checkLoaded = setInterval(() => {
        // Fail fast if the script failed to load
        if (this.scriptLoadError) {
          clearInterval(checkLoaded);
          clearTimeout(timeoutHandle);
          const err = this.scriptLoadError;
          this.scriptLoadError = null;
          reject(err);
          return;
        }

        if (this.isLoaded && window.Intercom) {
          clearInterval(checkLoaded);
          clearTimeout(timeoutHandle);

          // Another concurrent boot() call may have already booted Intercom
          if (this.isBooted) {
            console.info('IntercomService: Already booted by concurrent call, updating instead');
            this.update(this.toUserAttributes(snapshot));
            resolve();
            return;
          }

          // Set isBooted before calling boot() to prevent other intervals from booting
          this.isBooted = true;

          try {
            // JWT is passed directly in the boot payload (Intercom SDK supports this)
            window.Intercom('boot', snapshot);
            resolve();
          } catch (error) {
            this.isBooted = false;
            console.error('IntercomService: Boot failed', error);
            reject(error);
          }
        }
      }, 100);

      // Timeout after 10 seconds
      timeoutHandle = setTimeout(() => {
        clearInterval(checkLoaded);
        if (!this.isBooted) {
          this.isLoading = false;
          const error = new Error('Intercom script failed to load (timeout or network error)');
          console.error('IntercomService: Script load timeout - check network, CSP, or ad blockers', error);
          reject(error);
        }
      }, 10000);
    });
  }

  /**
   * Update Intercom with new user data
   */
  public update(data?: Partial<IntercomBootOptions>): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('update', data || {});
      } catch (error) {
        console.error('IntercomService: Update failed', error);
      }
    }
  }

  /**
   * Show the Intercom messenger
   */
  public show(): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('show');
      } catch (error) {
        console.error('IntercomService: Show failed', error);
      }
    }
  }

  /**
   * Hide the Intercom messenger
   */
  public hide(): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('hide');
      } catch (error) {
        console.error('IntercomService: Hide failed', error);
      }
    }
  }

  /**
   * Shutdown Intercom and clear identity. Not currently invoked by the app
   * (the /logout server redirect tears the SPA down) but kept for parity and
   * future error/teardown flows.
   */
  public shutdown(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.Intercom && this.isBooted) {
      try {
        window.Intercom('shutdown');
        this.isBooted = false;
      } catch (error) {
        console.error('IntercomService: Shutdown failed', error);
      }
    }
  }

  /**
   * Track an event in Intercom
   */
  public trackEvent(eventName: string, metadata?: Record<string, unknown>): void {
    if (typeof window !== 'undefined' && window.Intercom && this.isBooted) {
      try {
        window.Intercom('trackEvent', eventName, metadata);
      } catch (error) {
        console.error('IntercomService: Track event failed', error);
      }
    }
  }

  /**
   * Get the current boot status
   */
  public isIntercomBooted(): boolean {
    return this.isBooted;
  }

  /**
   * Load the Intercom widget script dynamically.
   */
  private loadIntercomScript(appId: string, apiBase?: string, onError?: () => void): void {
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
      this.isLoading = false;
      console.info('IntercomService: Script loaded successfully');
    };

    script.onerror = (error) => {
      this.isLoading = false;
      this.scriptLoadError = new Error('Intercom script failed to load (network error or CSP block)');
      console.error('IntercomService: Failed to load script', error);
      onError?.();
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  /**
   * Build a user-attributes-only payload for `update()` calls, dropping
   * system fields (JWT, app_id, api_base) that don't belong in updates.
   */
  private toUserAttributes(options: IntercomBootOptions): Partial<IntercomBootOptions> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { intercom_user_jwt: _jwt, app_id: _appId, api_base: _apiBase, ...rest } = options;
    return rest;
  }

  /**
   * Initialize the Intercom stub function on the window object so calls made
   * before the real script loads are queued and replayed.
   */
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
