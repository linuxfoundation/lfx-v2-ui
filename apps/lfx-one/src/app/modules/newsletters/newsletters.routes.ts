// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';
import { executiveDirectorGuard } from '@shared/guards/executive-director.guard';

export const NEWSLETTER_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'compose',
  },
  {
    path: 'compose',
    canActivate: [executiveDirectorGuard],
    loadComponent: () => import('./newsletter-compose/newsletter-compose.component').then((m) => m.NewsletterComposeComponent),
    data: { preload: false },
  },
];
