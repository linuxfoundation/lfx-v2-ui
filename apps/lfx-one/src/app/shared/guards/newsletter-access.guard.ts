// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { PersonaService } from '../services/persona.service';
import { ProjectContextService } from '../services/project-context.service';
import { ProjectService } from '../services/project.service';

/**
 * Route guard for the newsletters feature.
 *
 * Grants access to:
 *   - Executive Director persona (fast path, synchronous), OR
 *   - Users with writer (or owner-equivalent) permission on the currently
 *     active foundation/project — `project.writer === true` set by the
 *     backend's FGA-driven role check.
 *
 * The newsletter routes do not carry a `:slug` path param, so writer
 * resolution reads the active context from ProjectContextService rather
 * than the route. Falls back to `/foundation/overview` on denial to match
 * the existing executiveDirectorGuard's redirect behavior.
 */
export const newsletterAccessGuard: CanActivateFn = () => {
  const personaService = inject(PersonaService);
  const projectContextService = inject(ProjectContextService);
  const projectService = inject(ProjectService);
  const router = inject(Router);

  // Fast path: ED persona. Synchronous (cookie-seeded) so SSR + first-paint
  // navigations don't need to await an HTTP round-trip.
  if (personaService.currentPersona() === 'executive-director') {
    return true;
  }

  const ctx = projectContextService.activeContext();
  if (!ctx?.slug) {
    return router.parseUrl('/foundation/overview');
  }

  // Writer / owner check on the active context. project.writer is set
  // server-side by the FGA-driven authorization check and is true for both
  // explicit writer grants and owner-equivalent roles.
  return projectService.getProject(ctx.slug, false).pipe(
    map((project) => (project?.writer === true ? true : router.parseUrl('/foundation/overview'))),
    catchError(() => of(router.parseUrl('/foundation/overview')))
  );
};
