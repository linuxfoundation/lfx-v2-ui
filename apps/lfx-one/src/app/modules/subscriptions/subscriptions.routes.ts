// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

export const SUBSCRIPTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./subscriptions-dashboard/subscriptions-dashboard.component').then((m) => m.SubscriptionsDashboardComponent),
    data: { preload: true, preloadDelay: 1500 },
  },
];
