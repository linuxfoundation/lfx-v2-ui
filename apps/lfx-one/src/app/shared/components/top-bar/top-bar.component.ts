// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { AppService, Lens } from '@services/app.service';
import { filter, map, startWith } from 'rxjs';

interface LensConfig {
  id: Lens | 'home';
  label: string;
  icon: string;
}

interface BreadcrumbState {
  lens: LensConfig;
  page: string | null;
}

// Ordered longest-first so prefix matching picks the most specific path
const ROUTE_LABELS: Array<{ path: string; label: string }> = [
  { path: '/me/overview', label: 'Overview' },
  { path: '/me/actions', label: 'My Actions' },
  { path: '/me/events', label: 'My Events' },
  { path: '/me/training', label: 'Trainings & Certifications' },
  { path: '/me/badges', label: 'Badges' },
  { path: '/me/easycla', label: 'EasyCLA' },
  { path: '/me/transactions', label: 'Transactions' },
  { path: '/foundation/overview', label: 'Overview' },
  { path: '/foundation/projects', label: 'Projects' },
  { path: '/foundation/events', label: 'Events' },
  { path: '/org/projects', label: 'Key Projects' },
  { path: '/org/code', label: 'Code Contributions' },
  { path: '/org/membership', label: 'Membership' },
  { path: '/org/benefits', label: 'Benefits' },
  { path: '/org/groups', label: 'Groups' },
  { path: '/org/cla', label: 'CLA Management' },
  { path: '/org/permissions', label: 'Access & Permissions' },
  { path: '/org/profile', label: 'Org Profile' },
  { path: '/org', label: 'Overview' },
  { path: '/mailing-lists', label: 'Mailing Lists' },
  { path: '/meetings', label: 'Meetings' },
  { path: '/groups', label: 'Groups' },
  { path: '/votes', label: 'Votes' },
  { path: '/surveys', label: 'Surveys' },
  { path: '/settings', label: 'Settings' },
  { path: '/profile', label: 'My Profile' },
];

const LENS_CONFIGS: Record<Lens, LensConfig> = {
  me: { id: 'me', label: 'Me', icon: 'fa-light fa-circle-user' },
  foundation: { id: 'foundation', label: 'Foundation', icon: 'fa-light fa-laptop-code' },
  org: { id: 'org', label: 'Organization', icon: 'fa-light fa-building' },
};

const HOME_CONFIG: LensConfig = { id: 'home', label: 'Home', icon: 'fa-light fa-objects-column' };

@Component({
  selector: 'lfx-top-bar',
  imports: [NgClass],
  templateUrl: './top-bar.component.html',
})
export class TopBarComponent {
  private readonly appService = inject(AppService);
  private readonly router = inject(Router);

  protected readonly showDevToolbar = this.appService.showDevToolbar;

  private readonly currentUrl: Signal<string> = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly breadcrumb: Signal<BreadcrumbState> = computed(() => {
    const url = this.currentUrl().split('?')[0];
    const isHome = url === '/home' || url === '/';

    if (isHome) {
      return { lens: HOME_CONFIG, page: null };
    }

    const lens = LENS_CONFIGS[this.appService.activeLens()];
    const page = this.resolvePageLabel(url);

    return { lens, page };
  });

  private resolvePageLabel(url: string): string | null {
    // Exact match first
    const exact = ROUTE_LABELS.find((r) => r.path === url);
    if (exact) return exact.label;

    // Prefix match — longest wins
    const prefix = ROUTE_LABELS.filter((r) => url.startsWith(r.path)).sort((a, b) => b.path.length - a.path.length)[0];
    return prefix?.label ?? null;
  }
}
