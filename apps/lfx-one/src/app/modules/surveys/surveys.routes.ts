// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

export const SURVEY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./surveys-dashboard/surveys-dashboard.component').then((m) => m.SurveysDashboardComponent),
    data: { preload: true, preloadDelay: 1500 },
  },
  {
    path: 'create',
    loadComponent: () => import('./survey-manage/survey-manage.component').then((m) => m.SurveyManageComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./survey-manage/survey-manage.component').then((m) => m.SurveyManageComponent),
  },
];
