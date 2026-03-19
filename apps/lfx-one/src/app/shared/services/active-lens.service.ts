// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable, signal, computed } from '@angular/core';

export type NavLens = 'me' | 'foundation' | 'organization';

/**
 * Tracks which navigation lens (Me, Foundation, Organization) is currently active.
 * Set by MainLayoutComponent when the user switches lenses.
 * Read by page components to adapt titles and data scope accordingly.
 *
 * Me lens pages show personally-scoped data (meetings I'm invited to, groups I'm in).
 * Foundation lens pages show all data visible for the selected project context.
 */
@Injectable({ providedIn: 'root' })
export class ActiveLensService {
  private readonly _activeLens = signal<NavLens>('me');

  public readonly activeLens = this._activeLens.asReadonly();
  public readonly isMeLens = computed(() => this._activeLens() === 'me');
  public readonly isFoundationLens = computed(() => this._activeLens() === 'foundation');
  public readonly isOrganizationLens = computed(() => this._activeLens() === 'organization');

  public setLens(lens: NavLens): void {
    this._activeLens.set(lens);
  }
}
