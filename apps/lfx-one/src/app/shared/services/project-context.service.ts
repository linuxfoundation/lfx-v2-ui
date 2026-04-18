// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { computed, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { BOARD_SCOPED_PERSONAS, EnrichedPersonaProject, isBoardScopedPersona, PROJECT_SCOPED_PERSONAS, ProjectContext } from '@lfx-one/shared/interfaces';
import { isFoundationProject, isSameProjectContext, toProjectContext } from '@lfx-one/shared/utils';
import { SsrCookieService } from 'ngx-cookie-service-ssr';

import { LensService } from './lens.service';
import { PersonaService } from './persona.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectContextService {
  private readonly cookieService = inject(SsrCookieService);
  private readonly lensService = inject(LensService);
  private readonly personaService = inject(PersonaService);

  private readonly foundationStorageKey = 'lfx-selected-foundation';
  private readonly projectStorageKey = 'lfx-selected-project';

  private readonly foundationSelection: WritableSignal<ProjectContext | null> = signal<ProjectContext | null>(null);
  private readonly projectSelection: WritableSignal<ProjectContext | null> = signal<ProjectContext | null>(null);

  public readonly activeContext: Signal<ProjectContext | null> = this.initActiveContext();
  public readonly isFoundationContext: Signal<boolean> = this.initIsFoundationContext();
  public readonly activeContextUid: Signal<string> = computed(() => this.activeContext()?.uid || '');

  public readonly selectedFoundation: Signal<ProjectContext | null> = computed(() => this.foundationSelection());
  public readonly selectedProject: Signal<ProjectContext | null> = computed(() => this.projectSelection());

  public readonly availableProjects: Signal<ProjectContext[]> = this.initAvailableProjects();

  public constructor() {
    // Clean up legacy cookies from the previous cookie-hydrated design.
    this.cookieService.delete(this.foundationStorageKey, '/');
    this.cookieService.delete(this.projectStorageKey, '/');
  }

  public setFoundation(foundation: ProjectContext): void {
    if (isSameProjectContext(this.foundationSelection(), foundation)) {
      return;
    }
    this.foundationSelection.set(foundation);
  }

  public setProject(project: ProjectContext): void {
    if (isSameProjectContext(this.projectSelection(), project)) {
      return;
    }
    this.projectSelection.set(project);
  }

  public clearFoundation(): void {
    this.foundationSelection.set(null);
  }

  public clearProject(): void {
    this.projectSelection.set(null);
  }

  public ensureDefaultSelection(detectedProjects: EnrichedPersonaProject[]): void {
    const personaProjects = this.personaService.personaProjects();

    if (!this.foundationSelection() || !detectedProjects.some((p) => p.projectUid === this.foundationSelection()?.uid)) {
      const boardUids = this.getPersonaProjectUids(personaProjects, BOARD_SCOPED_PERSONAS);
      const defaultFoundation =
        detectedProjects.find((p) => boardUids.has(p.projectUid) && isFoundationProject(p)) ?? detectedProjects.find((p) => isFoundationProject(p));
      if (defaultFoundation) {
        this.setFoundation(toProjectContext(defaultFoundation));
      }
    }

    // Prefer child projects over foundations for the project slot.
    if (!this.projectSelection() || !detectedProjects.some((p) => p.projectUid === this.projectSelection()?.uid)) {
      const projectUids = this.getPersonaProjectUids(personaProjects, PROJECT_SCOPED_PERSONAS);
      const defaultProject =
        detectedProjects.find((p) => projectUids.has(p.projectUid) && !isFoundationProject(p)) ??
        detectedProjects.find((p) => projectUids.has(p.projectUid)) ??
        detectedProjects[0];
      if (defaultProject) {
        this.setProject(toProjectContext(defaultProject));
      }
    }
  }

  private initActiveContext(): Signal<ProjectContext | null> {
    return computed(() => {
      const lens = this.lensService.activeLens();

      switch (lens) {
        case 'foundation':
          return this.foundationSelection();
        case 'project':
          return this.projectSelection();
        case 'me':
        case 'org':
          return isBoardScopedPersona(this.personaService.currentPersona()) ? this.foundationSelection() : this.projectSelection();
        default:
          return null;
      }
    });
  }

  private initIsFoundationContext(): Signal<boolean> {
    return computed(() => {
      const lens = this.lensService.activeLens();

      switch (lens) {
        case 'foundation':
          return true;
        case 'project':
          return false;
        case 'me':
        case 'org':
          return isBoardScopedPersona(this.personaService.currentPersona());
        default:
          return false;
      }
    });
  }

  private initAvailableProjects(): Signal<ProjectContext[]> {
    return computed(() => {
      const all = this.personaService.detectedProjects();
      if (all.length === 0) {
        return [];
      }

      const lens = this.lensService.activeLens();
      if (lens === 'me' || lens === 'org') {
        return all.map(toProjectContext);
      }

      const personaProjects = this.personaService.personaProjects();
      const relevantPersonas = lens === 'foundation' ? BOARD_SCOPED_PERSONAS : PROJECT_SCOPED_PERSONAS;
      const allowedUids = this.getPersonaProjectUids(personaProjects, relevantPersonas);

      const filtered = allowedUids.size > 0 ? all.filter((p) => allowedUids.has(p.projectUid)) : all;
      return filtered.map(toProjectContext);
    });
  }

  private getPersonaProjectUids(personaProjects: Partial<Record<string, { projectUid: string }[]>>, relevantPersonas: ReadonlySet<string>): Set<string> {
    const uids = new Set<string>();
    for (const [persona, projects] of Object.entries(personaProjects)) {
      if (relevantPersonas.has(persona) && projects) {
        for (const p of projects) {
          uids.add(p.projectUid);
        }
      }
    }
    return uids;
  }
}
