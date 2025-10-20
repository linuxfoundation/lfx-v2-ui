// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { BadgeComponent } from '@components/badge/badge.component';
import { SidebarMenuItem } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, BadgeComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  // Input properties
  public readonly items = input.required<SidebarMenuItem[]>();
  public readonly footerItems = input<SidebarMenuItem[]>([]);
  public readonly collapsed = input<boolean>(false);
  public readonly styleClass = input<string>('');

  /**
   * Generate test ID from label
   */
  protected getTestId(label: string): string {
    return `sidebar-item-${label.toLowerCase().replace(/\s+/g, '-')}`;
  }
}
