// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '@environments/environment';
import { LENS_DEFAULT_ROUTES } from '@lfx-one/shared/constants';
import { Lens } from '@lfx-one/shared/interfaces';
import { LensService } from '@services/lens.service';
import { UserService } from '@services/user.service';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'lfx-lens-switcher',
  imports: [NgClass, RouterLink, TooltipModule],
  templateUrl: './lens-switcher.component.html',
  styleUrl: './lens-switcher.component.scss',
  host: {
    '(document:keydown.escape)': 'closeDropdown()',
  },
})
export class LensSwitcherComponent {
  private readonly lensService = inject(LensService);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);

  public readonly mobile = input<boolean>(false);

  protected readonly activeLens = this.lensService.activeLens;
  protected readonly lenses = this.lensService.availableLenses;
  protected readonly user = this.userService.user;
  protected readonly changelogUrl = environment.urls.changelog;
  protected readonly showDropdown = signal(false);

  protected readonly userInitials = this.userService.userInitials;

  protected setLens(lens: Lens): void {
    this.closeDropdown();
    this.lensService.setLens(lens);
    this.router.navigate([LENS_DEFAULT_ROUTES[lens]]);
  }

  protected toggleDropdown(): void {
    this.showDropdown.update((v) => !v);
  }

  protected closeDropdown(): void {
    this.showDropdown.set(false);
  }

  protected navigateToProfile(): void {
    this.closeDropdown();
    this.lensService.setLens('me');
    this.router.navigate(['/profile']);
  }
}
