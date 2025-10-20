// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, effect, inject, signal, WritableSignal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SidebarComponent } from '@components/sidebar/sidebar.component';
import { SidebarMenuItem } from '@lfx-one/shared/interfaces';
import { filter } from 'rxjs';

@Component({
  selector: 'lfx-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly router = inject(Router);

  // Mobile sidebar state
  public showMobileSidebar: WritableSignal<boolean> = signal(false);

  // Sidebar navigation items
  protected readonly sidebarItems: SidebarMenuItem[] = [
    {
      label: 'Home',
      icon: 'fa-light fa-house',
      routerLink: '/',
    },
    {
      label: 'My Meetings',
      icon: 'fa-light fa-video',
      routerLink: '/my-meetings',
      disabled: true,
    },
    {
      label: 'Project Health',
      icon: 'fa-light fa-heart-pulse',
      routerLink: '/project-health',
      disabled: true,
    },
    {
      label: 'Events & Community',
      icon: 'fa-light fa-calendar',
      routerLink: '/events-community',
      disabled: true,
    },
    {
      label: 'Training & Certification',
      icon: 'fa-light fa-book-open',
      routerLink: '/training-certification',
      disabled: true,
    },
  ];

  // Sidebar footer items
  protected readonly sidebarFooterItems: SidebarMenuItem[] = [
    {
      label: 'Documentation',
      icon: 'fa-light fa-file-lines',
      url: 'https://docs.lfx.linuxfoundation.org',
    },
    {
      label: 'Submit a Ticket',
      icon: 'fa-light fa-circle-question',
      url: 'https://jira.linuxfoundation.org/plugins/servlet/theme/portal/4',
    },
    {
      label: 'Changelog',
      icon: 'fa-light fa-rectangle-history',
      routerLink: '/changelog',
      disabled: true,
    },
    {
      label: 'Settings',
      icon: 'fa-light fa-gear',
      routerLink: '/settings',
      disabled: true,
    },
    {
      label: 'Profile',
      icon: 'fa-light fa-user',
      routerLink: '/profile',
    },
  ];

  public constructor() {
    // Close mobile sidebar on navigation
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      this.closeMobileSidebar();
    });

    // Listen for custom event from header
    effect(() => {
      const handleToggle = () => {
        this.showMobileSidebar.set(!this.showMobileSidebar());
      };

      window.addEventListener('toggleMobileSidebar', handleToggle);

      return () => {
        window.removeEventListener('toggleMobileSidebar', handleToggle);
      };
    });
  }

  public closeMobileSidebar(): void {
    this.showMobileSidebar.set(false);
  }
}
