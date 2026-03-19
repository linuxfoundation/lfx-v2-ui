// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '@components/sidebar/sidebar.component';
import { environment } from '@environments/environment';
import { COMMITTEE_LABEL, MAILING_LIST_LABEL, SURVEY_LABEL, VOTE_LABEL } from '@lfx-one/shared/constants';
import { SidebarMenuItem } from '@lfx-one/shared/interfaces';
import { AppService } from '@services/app.service';
import { FeatureFlagService } from '@services/feature-flag.service';
import { PersonaService } from '@services/persona.service';
import { DrawerModule } from 'primeng/drawer';
import { filter } from 'rxjs';

import { DevToolbarComponent } from '../dev-toolbar/dev-toolbar.component';

@Component({
  selector: 'lfx-main-layout',
  imports: [NgClass, RouterModule, SidebarComponent, DrawerModule, DevToolbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly appService = inject(AppService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly personaService = inject(PersonaService);

  // Expose mobile sidebar state from service (writable for two-way binding with p-drawer)
  protected readonly showMobileSidebar = this.appService.showMobileSidebar;

  // Feature flags
  private readonly enableProfileClick = this.featureFlagService.getBooleanFlag('sidebar-profile', false);
  protected readonly showDevToolbar = this.featureFlagService.getBooleanFlag('dev-toolbar', true);

  // Active lens — drives rail selection and sidebar items
  protected readonly activeLens = signal<'me' | 'foundation' | 'organization'>('me');

  // Support URL for rail link
  protected readonly supportUrl = environment.urls.support;

  // ED persona — gets org picker in Org lens
  protected readonly isEDPersona = computed(() => this.personaService.currentPersona() === 'executive-director');

  // Foundation lens project picker — shown for all users in the Foundation lens
  // (every user needs to know which project/foundation context they're in)
  protected readonly showFoundationProjectSelector = computed(
    () => this.activeLens() === 'foundation'
  );

  // Org lens org picker — only for ED (manages multiple orgs/foundations)
  protected readonly showOrgSelector = computed(
    () => this.activeLens() === 'organization' && this.isEDPersona()
  );

  protected setActiveLens(lens: 'me' | 'foundation' | 'organization'): void {
    this.activeLens.set(lens);
  }

  // Sidebar items — per-lens structure per Manish v1 PDF.
  // Disabled items = page does not exist yet; lighter grey, not clickable.
  protected readonly sidebarItems = computed((): SidebarMenuItem[] => {
    // isTlfOnlyPersona proxies for multi-context: board members span multiple
    // foundations and get an Overview aggregation page. Maintainers also get
    // Overview so they can navigate back to the dashboard from sub-pages.
    const isTlfOnlyPersona = this.personaService.isTlfOnlyPersona();
    const isMaintainer = this.personaService.currentPersona() === 'maintainer';
    const isMultiContext = isTlfOnlyPersona || isMaintainer;

    switch (this.activeLens()) {
      // ── Me lens ──────────────────────────────────────────────────────────
      case 'me':
        return [
          { label: 'Overview', icon: 'fa-light fa-grid-2', routerLink: '/' },
          {
            label: 'My Engagement',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Actions', icon: 'fa-light fa-bolt', command: () => {}, disabled: true },
              { label: 'Meetings', icon: 'fa-light fa-calendar', routerLink: '/meetings' },
              { label: COMMITTEE_LABEL.plural, icon: 'fa-light fa-users', routerLink: '/groups' },
              { label: 'Events', icon: 'fa-light fa-ticket', routerLink: '/events' },
            ],
          },
          {
            label: 'My Account',
            isSection: true,
            expanded: true,
            items: [
              { label: 'My Profile', icon: 'fa-light fa-user', routerLink: '/profile', disabled: !this.enableProfileClick() },
              { label: 'Settings', icon: 'fa-light fa-gear', routerLink: '/settings' },
            ],
          },
        ];

      // ── Foundation / Projects lens ────────────────────────────────────────
      case 'foundation': {
        const sections: SidebarMenuItem[] = [];

        // Overview only for multi-context users (board members spanning multiple foundations).
        // Single-project contributors land here directly — no aggregation page needed.
        if (isMultiContext) {
          sections.push({ label: 'Overview', icon: 'fa-light fa-grid-2', routerLink: '/' });
        }

        sections.push({
          label: 'Community',
          isSection: true,
          expanded: true,
          items: [
            { label: 'Meetings', icon: 'fa-light fa-calendar', routerLink: '/meetings' },
            { label: MAILING_LIST_LABEL.plural, icon: 'fa-light fa-envelope', routerLink: '/mailing-lists' },
            { label: COMMITTEE_LABEL.plural, icon: 'fa-light fa-users', routerLink: '/groups' },
          ],
        });

        if (!isTlfOnlyPersona) {
          sections.push({
            label: 'Governance',
            isSection: true,
            expanded: true,
            items: [
              { label: VOTE_LABEL.plural, icon: 'fa-light fa-check-to-slot', routerLink: '/votes' },
              { label: SURVEY_LABEL.plural, icon: 'fa-light fa-clipboard-list', routerLink: '/surveys' },
              { label: 'Permissions', icon: 'fa-light fa-shield', routerLink: '/settings' },
            ],
          });
        }

        sections.push({
          label: 'Insights',
          icon: 'fa-light fa-chart-column',
          url: 'https://insights.linuxfoundation.org/',
          target: '_blank',
          rel: 'noopener noreferrer',
        });

        return sections;
      }

      // ── Organization lens ─────────────────────────────────────────────────
      // All pages are new — disabled until built.
      case 'organization':
      default:
        return [
          { label: 'Overview', icon: 'fa-light fa-grid-2', command: () => {}, disabled: true },
          {
            label: 'Org Details',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Membership', icon: 'fa-light fa-id-card', command: () => {}, disabled: true },
              { label: 'Employees', icon: 'fa-light fa-user-group', command: () => {}, disabled: true },
            ],
          },
          {
            label: 'Engagement',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Projects', icon: 'fa-light fa-diagram-project', command: () => {}, disabled: true },
              // Org Meetings is a different page from Foundation Meetings — not yet built
              { label: 'Meetings', icon: 'fa-light fa-calendar', command: () => {}, disabled: true },
              { label: 'Events', icon: 'fa-light fa-ticket', command: () => {}, disabled: true },
              { label: 'Reports', icon: 'fa-light fa-chart-bar', command: () => {}, disabled: true },
            ],
          },
        ];
    }
  });

  // Footer items moved to rail — sidebar footer is empty
  protected readonly sidebarFooterItems = computed((): SidebarMenuItem[] => []);

  public constructor() {
    // Close mobile sidebar on navigation
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.appService.closeMobileSidebar();
      });
  }

  public toggleMobileSidebar(): void {
    this.appService.toggleMobileSidebar();
  }

  public onDrawerVisibilityChange(visible: boolean): void {
    if (!visible) {
      this.appService.closeMobileSidebar();
    }
  }
}
