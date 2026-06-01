// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable, signal } from '@angular/core';
import { ToastMessageOptions } from 'primeng/api';

/**
 * Holds a single toast message across a navigation boundary.
 * Guards and utilities call set() before redirecting; AppComponent
 * calls consume() on NavigationEnd and forwards to MessageService.
 */
@Injectable({ providedIn: 'root' })
export class PendingToastService {
  private readonly pending = signal<ToastMessageOptions | null>(null);

  public set(message: ToastMessageOptions): void {
    this.pending.set(message);
  }

  public consume(): ToastMessageOptions | null {
    const message = this.pending();
    this.pending.set(null);
    return message;
  }
}
