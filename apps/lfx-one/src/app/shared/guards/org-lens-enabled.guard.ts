// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';

import { FeatureFlagService } from '../services/feature-flag.service';

/**
 * Route guard that dark-launches the Org Lens behind the `org-lens-enabled`
 * LaunchDarkly flag. Defaults to false so the lens is invisible to all users
 * until the flag is turned on. When the flag is off, deep links into `/org/*`
 * (and the `/org` → `/org/overview` redirect) bounce back to the Me Lens
 * root. Implemented as a CanMatchFn so the lazy `loadComponent` import is
 * never even resolved while the flag is off.
 */
export const orgLensEnabledGuard: CanMatchFn = () => {
  const featureFlagService = inject(FeatureFlagService);
  const router = inject(Router);

  if (featureFlagService.getBooleanFlag('org-lens-enabled', false)()) {
    return true;
  }

  return router.parseUrl('/');
};
