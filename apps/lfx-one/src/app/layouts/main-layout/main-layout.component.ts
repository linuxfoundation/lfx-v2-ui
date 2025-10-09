// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from '@components/sidebar/sidebar.component';
import { SidebarMenuItem } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
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
}
