// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AppService, Lens } from '@services/app.service';
import { TooltipModule } from 'primeng/tooltip';
import { filter, map, startWith } from 'rxjs';

interface LensOption {
  id: Lens;
  label: string;
  icon: string;
  activeIcon: string;
  testId: string;
}

interface FooterAction {
  label: string;
  icon: string;
  url: string;
  target: string;
  testId: string;
  tooltipHtml: string;
}

const EXTERNAL_ICON = '<i class="fa-light fa-arrow-up-right-from-square" style="margin-left:5px;font-size:10px;vertical-align:middle;opacity:0.7"></i>';

function buildTooltip(label: string, external: boolean): string {
  return external ? `${label}${EXTERNAL_ICON}` : label;
}

const LENS_DEFAULT_ROUTES: Record<Lens, string> = {
  me: '/me/overview',
  foundation: '/foundation/overview',
  org: '/org',
};

@Component({
  selector: 'lfx-lens-switcher',
  imports: [NgClass, RouterModule, TooltipModule],
  templateUrl: './lens-switcher.component.html',
  styleUrl: './lens-switcher.component.scss',
})
export class LensSwitcherComponent {
  private readonly appService = inject(AppService);
  private readonly router = inject(Router);

  protected readonly activeLens = this.appService.activeLens;
  protected readonly isHome: Signal<boolean> = this.initIsHome();

  protected readonly lenses: LensOption[] = [
    { id: 'me', label: 'Me', icon: 'fa-light fa-circle-user', activeIcon: 'fa-solid fa-circle-user', testId: 'lens-me' },
    { id: 'foundation', label: 'Foundation', icon: 'fa-light fa-laptop-code', activeIcon: 'fa-solid fa-laptop-code', testId: 'lens-foundation' },
    { id: 'org', label: 'Organization', icon: 'fa-light fa-building', activeIcon: 'fa-solid fa-building', testId: 'lens-org' },
  ];

  protected readonly insightsTooltip = `<div style="max-width:200px"><strong>LFX Insights${EXTERNAL_ICON}</strong><br><span style="font-size:11px;opacity:0.85;line-height:1.4;display:block;margin-top:2px">Discover and evaluate the world's most critical open source projects at scale</span></div>`;

  protected readonly footerActions: FooterAction[] = [
    {
      label: 'Changelog',
      icon: 'fa-light fa-clock-rotate-left',
      url: 'https://changelog.lfx.dev/',
      target: '_blank',
      testId: 'lens-changelog',
      tooltipHtml: buildTooltip('Changelog', true),
    },
    {
      label: 'Support',
      icon: 'fa-light fa-question-circle',
      url: 'https://jira.linuxfoundation.org/servicedesk/customer/portal/4',
      target: '_blank',
      testId: 'lens-support',
      tooltipHtml: buildTooltip('Support', true),
    },
    {
      label: 'Logout',
      icon: 'fa-light fa-sign-out',
      url: '/logout',
      target: '_self',
      testId: 'lens-logout',
      tooltipHtml: buildTooltip('Logout', false),
    },
  ];

  protected setLens(lens: Lens): void {
    this.appService.setLens(lens);
    void this.router.navigate([LENS_DEFAULT_ROUTES[lens]]);
  }

  protected navigateHome(): void {
    void this.router.navigate(['/home']);
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
}
