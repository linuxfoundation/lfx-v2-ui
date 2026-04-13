// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { EnrichedPersonaProject, ProjectContext } from '../interfaces';

/**
 * Convert an EnrichedPersonaProject to a ProjectContext
 */
export function toProjectContext(project: EnrichedPersonaProject): ProjectContext {
  return {
    uid: project.projectUid,
    name: project.projectName || project.projectSlug,
    slug: project.projectSlug,
  };
}

/**
 * Determine if a project is a foundation (top-level).
 * Uses the `isFoundation` field from the upstream project service.
 */
export function isFoundationProject(project: EnrichedPersonaProject): boolean {
  return project.isFoundation;
}
