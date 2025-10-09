// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';

import { authGuard } from './shared/guards/auth.guard';
import { PersonaService } from './shared/services/persona.service';

/**
 * Guard to check if new UI persona is selected
 */
const newUIGuard: CanActivateFn = () => {
  const personaService = inject(PersonaService);
  const router = inject(Router);

  if (personaService.isNewUI()) {
    return true;
  }

  // If old UI is selected, redirect to old UI route
  router.navigate(['/old-ui']);
  return false;
};

/**
 * Guard to check if old UI persona is selected
 */
const oldUIGuard: CanActivateFn = () => {
  const personaService = inject(PersonaService);
  const router = inject(Router);

  if (personaService.isOldUI()) {
    return true;
  }

  // If new UI is selected, redirect to new UI route
  router.navigate(['/']);
  return false;
};

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard, newUIGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./modules/pages/home-new/home-new.component').then((m) => m.HomeNewComponent),
      },
      {
        path: 'projects',
        loadComponent: () => import('./modules/pages/home/home.component').then((m) => m.HomeComponent),
      },
    ],
  },
  // Old UI route - shows when "Old UI" persona is selected
  {
    path: 'old-ui',
    canActivate: [authGuard, oldUIGuard],
    loadComponent: () => import('./modules/pages/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'meetings',
    loadChildren: () => import('./modules/meeting/meeting.routes').then((m) => m.MEETING_ROUTES),
  },
  {
    path: 'project/:slug',
    loadComponent: () => import('./layouts/project-layout/project-layout.component').then((m) => m.ProjectLayoutComponent),
    loadChildren: () => import('./modules/project/project.routes').then((m) => m.PROJECT_ROUTES),
    canActivate: [authGuard],
    data: { preload: true, preloadDelay: 1000 }, // Preload after 1 second for likely navigation
  },
  {
    path: 'profile',
    loadComponent: () => import('./layouts/profile-layout/profile-layout.component').then((m) => m.ProfileLayoutComponent),
    loadChildren: () => import('./modules/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
    canActivate: [authGuard],
  },
];
