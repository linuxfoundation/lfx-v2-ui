// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { inject, Injectable, signal } from '@angular/core';
import { FeatureFlagService } from './feature-flag.service';

export type Lens = 'me' | 'foundation' | 'project' | 'org';

/**
 * Application-wide state management service
 * Handles global application state like mobile sidebar visibility and active lens
 */
@Injectable({
  providedIn: 'root',
})
export class AppService {
  private readonly featureFlagService = inject(FeatureFlagService);

  // Dev toolbar visibility — single source of truth for all layout offsets
  public readonly showDevToolbar = this.featureFlagService.getBooleanFlag('dev-toolbar', true);

  // Mobile sidebar state
  private readonly showMobileSidebarSignal = signal(false);
  public readonly showMobileSidebar = this.showMobileSidebarSignal.asReadonly();

  // Active lens state — defaults to 'me' (user at the center)
  private readonly activeLensSignal = signal<Lens>('me');
  public readonly activeLens = this.activeLensSignal.asReadonly();

  // Project selector panel state
  private readonly projectSelectorOpenSignal = signal(false);
  public readonly projectSelectorOpen = this.projectSelectorOpenSignal.asReadonly();

  /**
   * Open or close the project selector panel
   */
  public setProjectSelectorOpen(open: boolean): void {
    this.projectSelectorOpenSignal.set(open);
  }

  /**
   * Switch to a different lens
   */
  public setLens(lens: Lens): void {
    this.activeLensSignal.set(lens);
  }

  /**
   * Toggle mobile sidebar visibility
   */
  public toggleMobileSidebar(): void {
    this.showMobileSidebarSignal.update((value) => !value);
  }

  /**
   * Close mobile sidebar
   */
  public closeMobileSidebar(): void {
    this.showMobileSidebarSignal.set(false);
  }

  /**
   * Open mobile sidebar
   */
  public openMobileSidebar(): void {
    this.showMobileSidebarSignal.set(true);
  }
}
