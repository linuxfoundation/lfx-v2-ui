// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

export const DOCS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./docs-landing/docs-landing.component').then((m) => m.DocsLandingComponent),
  },
  {
    path: ':section',
    loadComponent: () => import('./docs-article/docs-article.component').then((m) => m.DocsArticleComponent),
  },
  {
    path: ':section/:topic',
    loadComponent: () => import('./docs-article/docs-article.component').then((m) => m.DocsArticleComponent),
  },
];
