// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Phase 2 stub. Phase 3 / US1 (T026) replaces this with a brand-styled 404
 * variant that includes a topic list and a search prompt per FR-008 / FR-016.
 * The minimum viable version returns a recognizable 404 with a link back to
 * the landing page so the SSR response carries `404` (FR-007) and crawlers
 * see the canonical recovery path.
 */
@Component({
  selector: 'lfx-docs-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <h1 class="text-2xl font-semibold">Page not found</h1>
    <p class="mt-2 text-gray-600">
      We couldn't find the documentation page you were looking for.
      <a class="text-primary underline" routerLink="/docs">Return to the documentation landing page</a>.
    </p>
  `,
})
export class DocsNotFoundComponent {}
