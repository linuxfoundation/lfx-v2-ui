// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

export const VOTE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./votes-dashboard/votes-dashboard.component').then((m) => m.VotesDashboardComponent),
    data: { preload: true, preloadDelay: 1500 },
  },
  {
    path: 'create',
    loadComponent: () => import('./vote-manage/vote-manage.component').then((m) => m.VoteManageComponent),
    data: { preload: false },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./vote-manage/vote-manage.component').then((m) => m.VoteManageComponent),
    data: { preload: false },
  },
];
