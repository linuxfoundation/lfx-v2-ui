// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject } from '@angular/core';

import { DocsManifestService } from '../../services/docs-manifest.service';

/**
 * Phase 2 stub. Phase 3 / US1 (T024) replaces the template with the
 * topic-tile landing page that satisfies FR-006/FR-008/FR-027 and SC-001.
 */
@Component({
  selector: 'lfx-docs-landing',
  standalone: true,
  template: `
    <h1 class="text-2xl font-semibold">LFX Self Serve Documentation</h1>
    <p class="mt-2 text-gray-600">
      {{ topicsCount() }} topic{{ topicsCount() === 1 ? '' : 's' }} available. Full landing page lands in Phase 3.
    </p>
  `,
})
export class DocsLandingComponent {
  private readonly docsManifest = inject(DocsManifestService);

  protected topicsCount(): number {
    return this.docsManifest.getTopics().length;
  }
}
