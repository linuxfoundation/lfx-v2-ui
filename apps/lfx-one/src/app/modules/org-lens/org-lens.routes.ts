// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

export const ORG_LENS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./overview/org-overview.component').then((m) => m.OrgOverviewComponent),
  },
  {
    path: 'projects',
    loadComponent: () => import('./projects/org-projects.component').then((m) => m.OrgProjectsComponent),
  },
  {
    path: 'code',
    loadComponent: () => import('./code/org-code.component').then((m) => m.OrgCodeComponent),
  },
  {
    path: 'membership',
    loadComponent: () => import('./membership/org-membership.component').then((m) => m.OrgMembershipComponent),
  },
  {
    path: 'benefits',
    loadComponent: () => import('./benefits/org-benefits.component').then((m) => m.OrgBenefitsComponent),
  },
  {
    path: 'groups',
    loadComponent: () => import('./groups/org-groups.component').then((m) => m.OrgGroupsComponent),
  },
  {
    path: 'cla',
    loadComponent: () => import('./cla/org-cla.component').then((m) => m.OrgClaComponent),
  },
  {
    path: 'permissions',
    loadComponent: () => import('./permissions/org-permissions.component').then((m) => m.OrgPermissionsComponent),
  },
  {
    path: 'profile',
    loadComponent: () => import('./profile/org-profile.component').then((m) => m.OrgProfileComponent),
  },
];
