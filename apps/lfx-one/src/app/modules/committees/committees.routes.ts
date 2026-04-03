// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

export const COMMITTEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./committee-dashboard/committee-dashboard.component').then((m) => m.CommitteeDashboardComponent),
    data: { preload: true, preloadDelay: 1500 },
  },
  {
    path: 'create',
    loadComponent: () => import('./committee-manage/committee-manage.component').then((m) => m.CommitteeManageComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./committee-view/committee-view.component').then((m) => m.CommitteeViewComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./committee-manage/committee-manage.component').then((m) => m.CommitteeManageComponent),
  },
];
