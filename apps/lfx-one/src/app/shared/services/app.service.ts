// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable, signal } from '@angular/core';

/**
 * Application-wide state management service
 * Handles global application state like mobile sidebar visibility
 */
@Injectable({
  providedIn: 'root',
})
export class AppService {
  // Mobile sidebar state
  public readonly showMobileSidebar = signal(false);

  /**
   * Toggle mobile sidebar visibility
   */
  public toggleMobileSidebar(): void {
    this.showMobileSidebar.update((value) => !value);
  }

  /**
   * Close mobile sidebar
   */
  public closeMobileSidebar(): void {
    this.showMobileSidebar.set(false);
  }

  /**
   * Open mobile sidebar
   */
  public openMobileSidebar(): void {
    this.showMobileSidebar.set(true);
  }
}
