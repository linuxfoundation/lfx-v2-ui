// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { LensSwitcherComponent } from '@components/lens-switcher/lens-switcher.component';
import { SidebarComponent } from '@components/sidebar/sidebar.component';
import { environment } from '@environments/environment';
import { COMMITTEE_LABEL, MAILING_LIST_LABEL, SURVEY_LABEL, VOTE_LABEL } from '@lfx-one/shared/constants';
import { SidebarMenuItem } from '@lfx-one/shared/interfaces';
import { AppService } from '@services/app.service';
import { FeatureFlagService } from '@services/feature-flag.service';
import { PersonaService } from '@services/persona.service';
import { DrawerModule } from 'primeng/drawer';
import { filter, map, startWith } from 'rxjs';

import { DevToolbarComponent } from '../dev-toolbar/dev-toolbar.component';

@Component({
  selector: 'lfx-main-layout',
  imports: [NgClass, RouterModule, SidebarComponent, LensSwitcherComponent, DrawerModule, DevToolbarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MainLayoutComponent {
  private readonly router = inject(Router);
  private readonly appService = inject(AppService);
  private readonly featureFlagService = inject(FeatureFlagService);
  private readonly personaService = inject(PersonaService);

  protected readonly showMobileSidebar = this.appService.showMobileSidebar;
  protected readonly activeLens = this.appService.activeLens;
  protected readonly isHome: Signal<boolean> = this.initIsHome();
  protected readonly projectSelectorOpen = this.appService.projectSelectorOpen;
  protected readonly showDevToolbar = this.appService.showDevToolbar;

  // Feature flags
  private readonly enableProfileClick = this.featureFlagService.getBooleanFlag('sidebar-profile', false);

  // ─── Me Lens ──────────────────────────────────────────────────────────────
  private readonly meLensItems: SidebarMenuItem[] = [
    {
      label: 'Overview',
      icon: 'fa-light fa-grid-2',
      routerLink: '/',
    },
    {
      label: 'My Engagement',
      isSection: true,
      expanded: true,
      items: [
        { label: 'My Actions', icon: 'fa-light fa-bolt', routerLink: '/me/actions' },
        { label: 'My Meetings', icon: 'fa-light fa-calendar', routerLink: '/meetings' },
        { label: `My ${COMMITTEE_LABEL.plural}`, icon: 'fa-light fa-users', routerLink: '/groups' },
        { label: 'My Events', icon: 'fa-light fa-ticket', routerLink: '/me/events' },
      ],
    },
    {
      label: 'My Growth',
      isSection: true,
      expanded: true,
      items: [
        { label: 'Trainings & Certifications', icon: 'fa-light fa-graduation-cap', routerLink: '/me/training' },
        { label: 'Badges', icon: 'fa-light fa-certificate', routerLink: '/me/badges' },
        { label: 'EasyCLA', icon: 'fa-light fa-file-signature', routerLink: '/me/easycla' },
      ],
    },
    {
      label: 'My Account',
      isSection: true,
      expanded: true,
      items: [
        { label: 'My Profile', icon: 'fa-light fa-user', routerLink: '/profile' },
        { label: 'Transactions', icon: 'fa-light fa-receipt', routerLink: '/me/transactions' },
        { label: 'Settings', icon: 'fa-light fa-gear', routerLink: '/settings' },
      ],
    },
  ];

  // ─── Foundation Lens ──────────────────────────────────────────────────────
  private readonly foundationLensItems = computed((): SidebarMenuItem[] => {
    const isBoardMember = this.personaService.currentPersona() === 'board-member' || this.personaService.currentPersona() === 'executive-director';

    const items: SidebarMenuItem[] = [
      {
        label: 'Overview',
        icon: 'fa-light fa-grid-2',
        routerLink: '/',
      },
      {
        label: 'Community',
        isSection: true,
        expanded: true,
        items: [
          { label: 'Projects', icon: 'fa-light fa-folder-open', routerLink: '/foundation/projects' },
          { label: 'Meetings', icon: 'fa-light fa-calendar', routerLink: '/meetings' },
          { label: MAILING_LIST_LABEL.plural, icon: 'fa-light fa-envelope', routerLink: '/mailing-lists' },
          { label: COMMITTEE_LABEL.plural, icon: 'fa-light fa-users', routerLink: '/groups' },
          { label: 'Events', icon: 'fa-light fa-ticket', routerLink: '/foundation/events' },
        ],
      },
    ];

    if (isBoardMember) {
      items.push({
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

    return items;
  });

  // ─── Org Lens ─────────────────────────────────────────────────────────────
  private readonly orgLensItems: SidebarMenuItem[] = [
    {
      label: 'Overview',
      icon: 'fa-light fa-grid-2',
      routerLink: '/org',
    },
    {
      label: 'Portfolio',
      isSection: true,
      expanded: true,
      items: [
        { label: 'Key Projects', icon: 'fa-light fa-diagram-project', routerLink: '/org/projects' },
        { label: 'Code Contributions', icon: 'fa-light fa-code', routerLink: '/org/code' },
      ],
    },
    {
      label: 'Membership',
      isSection: true,
      expanded: true,
      items: [
        { label: 'Membership', icon: 'fa-light fa-id-card', routerLink: '/org/membership' },
        { label: 'Benefits', icon: 'fa-light fa-gift', routerLink: '/org/benefits' },
      ],
    },
    {
      label: 'Administration',
      isSection: true,
      expanded: true,
      items: [
        { label: 'Groups', icon: 'fa-light fa-users', routerLink: '/org/groups' },
        { label: 'CLA Management', icon: 'fa-light fa-file-signature', routerLink: '/org/cla' },
        { label: 'Access & Permissions', icon: 'fa-light fa-key', routerLink: '/org/permissions' },
        { label: 'Org Profile', icon: 'fa-light fa-building', routerLink: '/org/profile' },
      ],
    },
  ];

  // ─── Active nav items based on lens ───────────────────────────────────────
  protected readonly sidebarItems = computed((): SidebarMenuItem[] => {
    switch (this.activeLens()) {
      case 'foundation':
        return this.foundationLensItems();
      case 'org':
        return this.orgLensItems;
      default:
        return this.meLensItems;
    }
  });

  // ─── Footer items ─────────────────────────────────────────────────────────
  protected readonly sidebarFooterItems = computed(() => [
    {
      label: 'Profile',
      icon: 'fa-light fa-user',
      routerLink: '/profile',
      disabled: !this.enableProfileClick(),
    },
    {
      label: 'Support',
      icon: 'fa-light fa-question-circle',
      url: environment.urls.support,
      target: '_blank',
      rel: 'noopener noreferrer',
    },
    {
      label: 'Logout',
      icon: 'fa-light fa-sign-out',
      url: '/logout',
      target: '_self',
      rel: '',
    },
  ]);

  public constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.appService.closeMobileSidebar();
        this.appService.setProjectSelectorOpen(false);
      });
  }

  private initIsHome(): Signal<boolean> {
    return toSignal(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects === '/home'),
        startWith(this.router.url === '/home')
      ),
      { initialValue: this.router.url === '/home' }
    );
  }

  public closeProjectSelector(): void {
    this.appService.setProjectSelectorOpen(false);
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
