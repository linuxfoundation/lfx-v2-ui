// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { IntercomBootOptions, IntercomFunction } from '@lfx-one/shared/interfaces';

/**
 * Service that wraps the Intercom Messenger widget.
 *
 * The script tag injection, `window.intercomSettings`, and `boot()` calls only
 * run in the browser — every public method is a no-op during SSR. Loading is
 * deferred to the first `boot()` call so we never inject the widget for
 * unauthenticated visitors.
 *
 * Logout: there's no explicit `shutdown()` consumer in LFX One because
 * `/logout` is a full server redirect that tears down the SPA, which naturally
 * clears `window.Intercom`.
 */
@Injectable({
  providedIn: 'root',
})
export class IntercomService {
  private isLoaded = false;
  private isBooted = false;
  private isLoading = false;

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

      // Load Intercom script on first boot (deferred to ensure authenticated users only)
      if (!this.isLoaded && !this.isLoading) {
        this.isLoading = true;
        this.loadIntercomScript(options.app_id, options.api_base);
      }

      // If JWT is provided, set it in window.intercomSettings before booting
      if (options.intercom_user_jwt) {
        window.intercomSettings = window.intercomSettings || {};
        window.intercomSettings.intercom_user_jwt = options.intercom_user_jwt;
      }

      // Wait for script to load (poll isLoaded to ensure real script loaded, not just stub)
      const checkLoaded = setInterval(() => {
        if (this.isLoaded && window.Intercom) {
          clearInterval(checkLoaded);
          clearTimeout(timeoutHandle);

          // Another concurrent boot() call may have already booted Intercom
          if (this.isBooted) {
            console.info('IntercomService: Already booted by concurrent call, updating instead');
            this.update(this.toUserAttributes(options));
            resolve();
            return;
          }

          // Set isBooted before calling boot() to prevent other intervals from booting
          this.isBooted = true;

          try {
            // JWT is already in intercomSettings; don't pass it in boot()
            window.Intercom('boot', this.stripJwt(options));

            // Force update to ensure user attributes are set; don't reset
            // isBooted on update failure since boot itself succeeded.
            try {
              window.Intercom('update', {
                user_id: options.user_id,
                name: options.name,
                email: options.email,
              });
            } catch (updateError) {
              console.warn('IntercomService: Update after boot failed', updateError);
            }

            resolve();
          } catch (error) {
            this.isBooted = false;
            console.error('IntercomService: Boot failed', error);
            reject(error);
          }
        }
      }, 100);

      // Timeout after 10 seconds
      const timeoutHandle = setTimeout(() => {
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

    // Clear the JWT before shutdown to prevent credential leakage across sessions.
    if (window.intercomSettings?.intercom_user_jwt) {
      delete window.intercomSettings.intercom_user_jwt;
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
  private loadIntercomScript(appId: string, apiBase?: string): void {
    if (this.isLoaded || typeof window === 'undefined') {
      return;
    }

    this.initializeIntercomFunction();

    // Set global Intercom settings (without JWT - will be added in boot())
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
      console.error('IntercomService: Failed to load script', error);
    };

    const firstScript = document.getElementsByTagName('script')[0];
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }

  /**
   * Strip the JWT (already set on `window.intercomSettings`) and return the
   * remaining boot payload.
   */
  private stripJwt(options: IntercomBootOptions): Omit<IntercomBootOptions, 'intercom_user_jwt'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { intercom_user_jwt: _jwt, ...rest } = options;
    return rest;
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
