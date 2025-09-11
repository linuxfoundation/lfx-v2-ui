// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { CombinedProfile } from '@lfx-pcc/shared/interfaces';
import { UserService } from '@services/user.service';
import { AvatarComponent } from '@shared/components/avatar/avatar.component';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { MenuItem } from 'primeng/api';
import { ChipModule } from 'primeng/chip';
import { finalize } from 'rxjs';

@Component({
  selector: 'lfx-profile-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, AvatarComponent, BreadcrumbComponent, ChipModule],
  templateUrl: './profile-layout.component.html',
  styleUrl: './profile-layout.component.scss',
})
export class ProfileLayoutComponent {
  private readonly userService = inject(UserService);

  // Load current user profile data
  public loading = signal<boolean>(true);

  public profile = this.initializeProfile();
  // Computed profile data
  public readonly profileTitle = this.initializeProfileTitle();
  public readonly profileSubtitle = this.initializeProfileSubtitle();
  public readonly profileLocation = this.initializeProfileLocation();
  public readonly userInitials = this.initializeUserInitials();
  // Loading state

  public readonly breadcrumbItems = input<MenuItem[]>([
    {
      label: 'Home',
      routerLink: '/',
      icon: 'fa-light fa-chevron-left',
      routerLinkActiveOptions: { exact: false },
    },
  ]);

  // Menu items for profile sections
  public readonly menuItems: Signal<MenuItem[]> = this.initializeMenuItems();

  private initializeProfile(): Signal<CombinedProfile | null> {
    return toSignal(this.userService.getCurrentUserProfile().pipe(finalize(() => this.loading.set(false))), { initialValue: null });
  }

  private initializeUserInitials(): Signal<string> {
    return computed(() => {
      const profile = this.profile();
      if (!profile?.user) return '';

      const user = profile.user;
      const firstName = user.first_name;
      const lastName = user.last_name;
      const email = user.email;
      const username = user.username;

      // Priority: first/last name > username > email
      if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
      }

      if (firstName) {
        return firstName.charAt(0).toUpperCase();
      }

      if (username) {
        return username.charAt(0).toUpperCase();
      }

      return email.charAt(0).toUpperCase();
    });
  }

  private initializeMenuItems(): Signal<MenuItem[]> {
    return computed(() => [
      {
        label: 'Edit Profile',
        icon: 'fa-light fa-user-edit text-blue-500',
        routerLink: '/profile',
        routerLinkActiveOptions: { exact: true },
      },
      {
        label: 'Password',
        icon: 'fa-light fa-key text-amber-500',
        routerLink: '/profile/password',
        routerLinkActiveOptions: { exact: true },
      },
      {
        label: 'Email Settings',
        icon: 'fa-light fa-envelope text-green-500',
        routerLink: '/profile/email',
        routerLinkActiveOptions: { exact: true },
      },
    ]);
  }

  private initializeProfileTitle(): Signal<string> {
    return computed(() => {
      const profile = this.profile();
      if (!profile?.user) return '';

      const user = profile.user;
      const firstName = user.first_name;
      const lastName = user.last_name;

      // If the user has a first name and last name, use it
      if (firstName && lastName) {
        return `${firstName} ${lastName}`;
      }

      // If the user has a first name, use it
      if (firstName) {
        return firstName;
      }

      // If the user has a username, use it
      if (user.username) {
        return user.username;
      }

      // If the user has an email, use it
      return user.email;
    });
  }

  private initializeProfileSubtitle(): Signal<string> {
    return computed(() => {
      const profile = this.profile();
      if (!profile?.profile) return '';

      return profile.profile.title || '';
    });
  }

  private initializeProfileLocation(): Signal<string> {
    return computed(() => {
      const profile = this.profile();
      if (!profile?.profile) return '';

      const parts = [];
      if (profile.profile.city) parts.push(profile.profile.city);
      if (profile.profile.state) parts.push(profile.profile.state);
      if (profile.profile.country) parts.push(profile.profile.country);

      return parts.join(', ');
    });
  }
}
