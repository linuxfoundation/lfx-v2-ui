// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LensSwitcherComponent } from '@components/lens-switcher/lens-switcher.component';

import { DocsSidebarNavComponent } from '../../modules/docs/components/docs-sidebar-nav/docs-sidebar-nav.component';
import { UserService } from '../../shared/services/user.service';

/**
 * Auth-aware shell for the public-facing user documentation portal (`/docs/**`).
 *
 * Renders one of two side-rails depending on `UserService.authenticated`:
 *
 *   - Authenticated → mounts the existing `LensSwitcherComponent` so the
 *     full LFX Self Serve chrome (lens icons, avatar, changelog, docs
 *     button) is preserved verbatim (FR-009a). The user can hop back to
 *     `/dashboard`, `/foundation`, etc. without leaving `/docs`.
 *   - Unauthenticated → mounts `DocsSidebarNavComponent` — the public
 *     minimal shell (docs icon + "What's new" + sign-in CTA), no lens
 *     switcher, no avatar (FR-009b).
 *
 * The URL stays identical across auth flips (FR-009c) — only the rendered
 * chrome swaps. Keeping the swap in one component avoids the routing
 * flicker that two parallel route trees would introduce (research R6).
 *
 * Note on chrome reuse: this component intentionally renders only the
 * lens-switcher column, not the full `MainLayoutComponent` left rail
 * (lens-switcher + lens-driven sidebar). The lens-driven sidebar's items
 * (My Meetings, My Committees, etc.) aren't useful inside the docs portal
 * and would compete with the docs taxonomy. Phase 7 / US5 (T048) revisits
 * this if user feedback diverges.
 */
@Component({
  selector: 'lfx-docs-layout',
  standalone: true,
  imports: [RouterModule, LensSwitcherComponent, DocsSidebarNavComponent],
  templateUrl: './docs-layout.component.html',
  styleUrl: './docs-layout.component.scss',
})
export class DocsLayoutComponent {
  protected readonly userService = inject(UserService);
  protected readonly isAuthenticated = computed(() => this.userService.authenticated());
}
