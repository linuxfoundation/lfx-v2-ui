// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '@components/sidebar/sidebar.component';
import { environment } from '@environments/environment';
import { COMMITTEE_LABEL, MAILING_LIST_LABEL, MY_ACTIVITY_LABEL, SURVEY_LABEL, VOTE_LABEL } from '@lfx-one/shared/constants';
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

  // Computed sidebar items — three-lens nav structure (v1)
  // Me: personal activity context
  // Foundation: project/community context
  // Organization: employer/org context (placeholder)
  protected readonly sidebarItems = computed(() => {
    const items: SidebarMenuItem[] = [];
    const isTlfOnlyPersona = this.personaService.isTlfOnlyPersona();

    // Me Lens
    items.push({
      label: 'Me',
      isSection: true,
      expanded: true,
      items: [
        {
          label: 'Overview',
          icon: 'fa-light fa-grid-2',
          routerLink: '/',
        },
        {
          label: 'Meetings',
          icon: 'fa-light fa-calendar',
          routerLink: '/meetings',
        },
        {
          label: COMMITTEE_LABEL.plural,
          icon: 'fa-light fa-users',
          routerLink: '/groups',
        },
        {
          label: MY_ACTIVITY_LABEL.singular,
          icon: 'fa-light fa-clipboard-list',
          routerLink: '/my-activity',
        },
        {
          label: 'My Profile',
          icon: 'fa-light fa-user',
          routerLink: '/profile',
          disabled: !this.enableProfileClick(),
        },
      ],
    });

    // Foundation Lens
    const foundationItems: SidebarMenuItem[] = [
      {
        label: 'Overview',
        icon: 'fa-light fa-grid-2',
        routerLink: '/',
      },
      {
        label: 'Meetings',
        icon: 'fa-light fa-calendar',
        routerLink: '/meetings',
      },
      {
        label: MAILING_LIST_LABEL.plural,
        icon: 'fa-light fa-envelope',
        routerLink: '/mailing-lists',
      },
      {
        label: COMMITTEE_LABEL.plural,
        icon: 'fa-light fa-users',
        routerLink: '/groups',
      },
      {
        label: 'Insights',
        icon: 'fa-light fa-chart-column',
        url: 'https://insights.linuxfoundation.org/',
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    ];

    // Governance items — only for non-board-member personas
    if (!isTlfOnlyPersona) {
      foundationItems.push(
        {
          label: VOTE_LABEL.plural,
          icon: 'fa-light fa-check-to-slot',
          routerLink: '/votes',
        },
        {
          label: SURVEY_LABEL.plural,
          icon: 'fa-light fa-clipboard-list',
          routerLink: '/surveys',
        },
        {
          label: 'Permissions',
          icon: 'fa-light fa-shield',
          routerLink: '/settings',
        }
      );
    }

    items.push({
      label: 'Foundation',
      isSection: true,
      expanded: true,
      items: foundationItems,
    });

    // Organization Lens (placeholder — collapsed by default)
    items.push({
      label: 'Organization',
      isSection: true,
      expanded: false,
      items: [],
    });

    return items;
  });

  // Sidebar footer items — Profile moved into Me section
  protected readonly sidebarFooterItems = computed(() => [
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
