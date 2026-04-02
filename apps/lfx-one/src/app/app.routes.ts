// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Routes } from '@angular/router';

import { PlaceholderPageComponent } from './shared/components/placeholder-page/placeholder-page.component';
import { authGuard } from './shared/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      // Me Lens dashboard (root route)
      {
        path: '',
        pathMatch: 'full',
        data: { lens: 'me' },
        loadComponent: () => import('./modules/dashboards/dashboard.component').then((m) => m.DashboardComponent),
      },
      // Foundation Lens dashboard (placeholder — reuses DashboardComponent for now)
      {
        path: 'foundation/overview',
        data: { lens: 'foundation' },
        loadComponent: () => import('./modules/dashboards/dashboard.component').then((m) => m.DashboardComponent),
      },
      // Project Lens dashboard (placeholder — reuses DashboardComponent for now)
      {
        path: 'project/overview',
        data: { lens: 'project' },
        loadComponent: () => import('./modules/dashboards/dashboard.component').then((m) => m.DashboardComponent),
      },
      // Org Lens dashboard (placeholder — reuses DashboardComponent for now)
      {
        path: 'org',
        data: { lens: 'org' },
        loadComponent: () => import('./modules/dashboards/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'home',
        loadComponent: () => import('./modules/dashboards/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'meetings',
        loadChildren: () => import('./modules/meetings/meetings.routes').then((m) => m.MEETING_ROUTES),
      },
      {
        path: 'groups',
        loadChildren: () => import('./modules/committees/committees.routes').then((m) => m.COMMITTEE_ROUTES),
      },
      {
        path: 'mailing-lists',
        loadChildren: () => import('./modules/mailing-lists/mailing-lists.routes').then((m) => m.MAILING_LIST_ROUTES),
      },
      {
        path: 'my-activity',
        loadChildren: () => import('./modules/my-activity/my-activity.routes').then((m) => m.MY_ACTIVITY_ROUTES),
      },
      {
        path: 'votes',
        loadChildren: () => import('./modules/votes/votes.routes').then((m) => m.VOTE_ROUTES),
      },
      {
        path: 'surveys',
        loadChildren: () => import('./modules/surveys/surveys.routes').then((m) => m.SURVEY_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () => import('./modules/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'profile',
        loadChildren: () => import('./modules/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      // Me lens — overview + real implementations + placeholder pages
      { path: 'me/overview', component: PlaceholderPageComponent, data: { title: 'Overview', description: 'Me lens index page' } },
      {
        path: 'me/events',
        loadChildren: () => import('./modules/events/events.routes').then((m) => m.EVENTS_ROUTES),
      },
      {
        path: 'me/training',
        loadChildren: () => import('./modules/trainings/trainings.routes').then((m) => m.TRAINING_ROUTES),
      },
      { path: 'me/actions', component: PlaceholderPageComponent, data: { title: 'My Actions' } },
      { path: 'me/badges', component: PlaceholderPageComponent, data: { title: 'Badges' } },
      { path: 'me/easycla', component: PlaceholderPageComponent, data: { title: 'EasyCLA' } },
      { path: 'me/transactions', component: PlaceholderPageComponent, data: { title: 'Transactions' } },
      // Foundation lens — overview + real implementation + placeholder pages
      { path: 'foundation/overview', component: PlaceholderPageComponent, data: { title: 'Overview', description: 'Foundation lens index page' } },
      {
        path: 'events',
        data: { lens: 'foundation' },
        loadChildren: () => import('./modules/events/events.routes').then((m) => m.FOUNDATION_EVENTS_ROUTES),
      },
      { path: 'foundation/projects', component: PlaceholderPageComponent, data: { title: 'Projects' } },
      { path: 'foundation/events', component: PlaceholderPageComponent, data: { title: 'Events' } },
      // Org lens — placeholder pages (overview is handled by org DashboardComponent route above)
      { path: 'org/projects', component: PlaceholderPageComponent, data: { title: 'Key Projects' } },
      { path: 'org/code', component: PlaceholderPageComponent, data: { title: 'Code Contributions' } },
      { path: 'org/membership', component: PlaceholderPageComponent, data: { title: 'Membership' } },
      { path: 'org/benefits', component: PlaceholderPageComponent, data: { title: 'Benefits' } },
      { path: 'org/groups', component: PlaceholderPageComponent, data: { title: 'Groups' } },
      { path: 'org/cla', component: PlaceholderPageComponent, data: { title: 'CLA Management' } },
      { path: 'org/permissions', component: PlaceholderPageComponent, data: { title: 'Access & Permissions' } },
      { path: 'org/profile', component: PlaceholderPageComponent, data: { title: 'Org Profile' } },
    ],
  },
  {
    path: 'meetings/not-found',
    loadComponent: () => import('./modules/meetings/meeting-not-found/meeting-not-found.component').then((m) => m.MeetingNotFoundComponent),
  },
  {
    path: 'meetings/:id',
    loadComponent: () => import('./modules/meetings/meeting-join/meeting-join.component').then((m) => m.MeetingJoinComponent),
  },
];
