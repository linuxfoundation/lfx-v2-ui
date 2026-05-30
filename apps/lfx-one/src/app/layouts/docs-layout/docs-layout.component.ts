// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { UserService } from '../../shared/services/user.service';

/**
 * Auth-aware shell for the public-facing user documentation portal (`/docs/**`).
 *
 * Phase 2 skeleton (T018): renders `<router-outlet>` inside a single content
 * column, reads `UserService.authenticated` so consuming templates can
 * branch, and is deliberately MINIMAL. The full split — render the existing
 * app chrome (lens switcher + sidebar + header) for signed-in users vs. a
 * dedicated public sidebar with docs icon, "What's new", and sign-in CTA for
 * unauthenticated visitors — lands in Phase 4 / US2 (T037, T038), and the
 * brand-styling / responsive polish lands in Phase 7 / US5.
 *
 * The component is intentionally route-tree-stable across auth states: the
 * URL is identical (FR-009c), only the rendered chrome changes. Keeping that
 * invariant in one component avoids the routing flicker that two parallel
 * route trees would introduce (research R6).
 */
@Component({
  selector: 'lfx-docs-layout',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './docs-layout.component.html',
  styleUrl: './docs-layout.component.scss',
})
export class DocsLayoutComponent {
  private readonly userService = inject(UserService);

  /**
   * Authentication signal — read at SSR or hydration time. Phase 4 / US2 wires
   * the conditional sidebar variants off this. Phase 2 just exposes it so the
   * template can pick a heading variant for visual continuity.
   */
  protected readonly isAuthenticated = computed(() => this.userService.authenticated());
}
