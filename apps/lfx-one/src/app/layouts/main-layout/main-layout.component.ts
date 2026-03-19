// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
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

  // Active lens — drives rail selection and sidebar items
  protected readonly activeLens = signal<'me' | 'foundation' | 'organization'>('me');

  // Support URL for rail link
  protected readonly supportUrl = environment.urls.support;

  protected setActiveLens(lens: 'me' | 'foundation' | 'organization'): void {
    this.activeLens.set(lens);
  }

  // Sidebar items — per-lens structure with section headers per spec
  protected readonly sidebarItems = computed((): SidebarMenuItem[] => {
    const isTlfOnlyPersona = this.personaService.isTlfOnlyPersona();

    switch (this.activeLens()) {
      case 'me':
        return [
          { label: 'Overview', icon: 'fa-light fa-grid-2', routerLink: '/' },
          {
            label: MY_ACTIVITY_LABEL.singular,
            isSection: true,
            expanded: true,
            items: [
              { label: 'Meetings', icon: 'fa-light fa-calendar', routerLink: '/meetings' },
              { label: 'Events', icon: 'fa-light fa-ticket', command: () => {} },
              { label: 'Trainings & Certifications', icon: 'fa-light fa-certificate', command: () => {} },
              { label: 'Mentorships', icon: 'fa-light fa-graduation-cap', command: () => {} },
              { label: 'Badges', icon: 'fa-light fa-medal', command: () => {} },
              { label: 'Crowdfunding', icon: 'fa-light fa-hand-holding-heart', command: () => {} },
              { label: 'Transactions', icon: 'fa-light fa-receipt', command: () => {} },
            ],
          },
          {
            label: 'My Account',
            isSection: true,
            expanded: true,
            items: [
              { label: 'My Profile', icon: 'fa-light fa-user', routerLink: '/profile', disabled: !this.enableProfileClick() },
              { label: 'Contributor Agreements', icon: 'fa-light fa-file-signature', command: () => {} },
              { label: 'Subscription Preferences', icon: 'fa-light fa-bell', command: () => {} },
              { label: 'Settings', icon: 'fa-light fa-gear', routerLink: '/settings' },
            ],
          },
        ];

      case 'foundation': {
        const sections: SidebarMenuItem[] = [
          { label: 'Overview', icon: 'fa-light fa-grid-2', routerLink: '/' },
          {
            label: 'Community',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Meetings', icon: 'fa-light fa-calendar', routerLink: '/meetings' },
              { label: MAILING_LIST_LABEL.plural, icon: 'fa-light fa-envelope', routerLink: '/mailing-lists' },
              { label: COMMITTEE_LABEL.plural, icon: 'fa-light fa-users', routerLink: '/groups' },
              { label: 'Events', icon: 'fa-light fa-ticket', command: () => {} },
              { label: 'Drive', icon: 'fa-light fa-folder-open', command: () => {} },
              { label: 'Crowdfunding', icon: 'fa-light fa-hand-holding-heart', command: () => {} },
            ],
          },
          {
            label: 'Data Intelligence',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Engineering Health', icon: 'fa-light fa-heart-pulse', url: 'https://insights.linuxfoundation.org/', target: '_blank', rel: 'noopener noreferrer' },
              { label: 'Community Engagement', icon: 'fa-light fa-comments', command: () => {} },
              { label: 'Contributor Health', icon: 'fa-light fa-user-check', command: () => {} },
              { label: 'Participating Organizations', icon: 'fa-light fa-building-columns', command: () => {} },
              { label: 'Community Sentiment', icon: 'fa-light fa-face-smile', command: () => {} },
              { label: 'Contributing Individuals', icon: 'fa-light fa-person-circle-check', command: () => {} },
              { label: 'Events Analytics', icon: 'fa-light fa-chart-bar', command: () => {} },
              { label: 'Trainings & Certifications', icon: 'fa-light fa-certificate', command: () => {} },
            ],
          },
        ];

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

        return sections;
      }

      case 'organization':
      default:
        return [
          { label: 'Overview', icon: 'fa-light fa-grid-2', command: () => {} },
          {
            label: 'Portfolio',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Key Projects', icon: 'fa-light fa-star', command: () => {} },
              { label: 'Code Contributions', icon: 'fa-light fa-code', command: () => {} },
            ],
          },
          {
            label: 'Community',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Events', icon: 'fa-light fa-ticket', command: () => {} },
              { label: 'Training & Certifications', icon: 'fa-light fa-certificate', command: () => {} },
              { label: 'Crowdfunding', icon: 'fa-light fa-hand-holding-heart', command: () => {} },
            ],
          },
          {
            label: 'Membership',
            isSection: true,
            expanded: true,
            items: [
              { label: 'Membership', icon: 'fa-light fa-id-card', command: () => {} },
              { label: 'Member Benefits', icon: 'fa-light fa-gift', command: () => {} },
              { label: 'OSPO Resources', icon: 'fa-light fa-book', command: () => {} },
            ],
          },
          {
            label: 'Administration',
            isSection: true,
            expanded: true,
            items: [
              { label: COMMITTEE_LABEL.plural, icon: 'fa-light fa-users', routerLink: '/groups' },
              { label: 'CLA Management', icon: 'fa-light fa-file-signature', command: () => {} },
              { label: 'Software Inventory', icon: 'fa-light fa-boxes-stacked', command: () => {} },
              { label: 'Access', icon: 'fa-light fa-key', command: () => {} },
              { label: 'Profile', icon: 'fa-light fa-building', routerLink: '/profile' },
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
