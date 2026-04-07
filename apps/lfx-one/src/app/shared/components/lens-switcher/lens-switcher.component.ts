// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AppService, Lens } from '@services/app.service';
import { PersonaService } from '@services/persona.service';
import { UserService } from '@services/user.service';
import { TooltipModule } from 'primeng/tooltip';

interface LensOption {
  id: Lens;
  label: string;
  switcherLabel: string;
  icon: string;
  activeIcon: string;
  testId: string;
}

const EXTERNAL_ICON = '<i class="fa-light fa-arrow-up-right-from-square" style="margin-left:5px;font-size:10px;vertical-align:middle;opacity:0.7"></i>';

const LENS_DEFAULT_ROUTES: Record<Lens, string> = {
  me: '/home',
  project: '/project/overview',
  foundation: '/foundation/overview',
  org: '/org',
};

/** All possible lens definitions — visibility is controlled by persona */
const ALL_LENSES: Record<Lens, LensOption> = {
  me: { id: 'me', label: 'Me', switcherLabel: 'Me', icon: 'fa-light fa-circle-user', activeIcon: 'fa-solid fa-circle-user', testId: 'lens-me' },
  foundation: {
    id: 'foundation',
    label: 'Foundation',
    switcherLabel: 'Foundation',
    icon: 'fa-light fa-landmark',
    activeIcon: 'fa-solid fa-landmark',
    testId: 'lens-foundation',
  },
  project: {
    id: 'project',
    label: 'Project',
    switcherLabel: 'Project',
    icon: 'fa-light fa-laptop-code',
    activeIcon: 'fa-solid fa-laptop-code',
    testId: 'lens-project',
  },
  org: { id: 'org', label: 'Organization', switcherLabel: 'Organiz.', icon: 'fa-light fa-building', activeIcon: 'fa-solid fa-building', testId: 'lens-org' },
};

@Component({
  selector: 'lfx-lens-switcher',
  imports: [NgClass, RouterModule, TooltipModule],
  templateUrl: './lens-switcher.component.html',
  styleUrl: './lens-switcher.component.scss',
})
export class LensSwitcherComponent {
  private readonly appService = inject(AppService);
  private readonly personaService = inject(PersonaService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  protected readonly activeLens = this.appService.activeLens;
  protected readonly user = this.userService.user;
  protected readonly showDropdown = signal(false);

  protected readonly userInitials = computed(() => {
    const name = this.user()?.name ?? '';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  /**
   * Visible lenses based on current persona.
   * Order: ME · FDN (governance only) · PROJ (all except new-contributor) · ORG
   */
  protected readonly lenses = computed((): LensOption[] => {
    const showFoundation = this.personaService.showFoundationLens();
    const showProject = this.personaService.showProjectLens();

    const visible: LensOption[] = [ALL_LENSES.me];
    if (showFoundation) visible.push(ALL_LENSES.foundation);
    if (showProject) visible.push(ALL_LENSES.project);
    visible.push(ALL_LENSES.org);
    return visible;
  });

  protected readonly insightsTooltip = `<div style="max-width:200px"><strong>LFX Insights${EXTERNAL_ICON}</strong><br><span style="font-size:11px;opacity:0.85;line-height:1.4;display:block;margin-top:2px">Discover and evaluate the world's most critical open source projects at scale</span></div>`;

  protected setLens(lens: Lens): void {
    this.appService.setLens(lens);
    void this.router.navigate([LENS_DEFAULT_ROUTES[lens]]);
  }

  protected toggleDropdown(): void {
    this.showDropdown.update((v) => !v);
  }

  protected closeDropdown(): void {
    this.showDropdown.set(false);
  }

  protected navigateToProfile(): void {
    this.closeDropdown();
    this.appService.setLens('me');
    void this.router.navigate(['/profile']);
  }
}
