// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { computed, inject, Injectable, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { PersonaType } from '@lfx-one/shared/interfaces';

import { ProjectContextService } from './project-context.service';

@Injectable({
  providedIn: 'root',
})
export class PersonaService {
  private readonly router = inject(Router);
  private readonly projectContextService = inject(ProjectContextService);

  public readonly currentPersona: WritableSignal<PersonaType>;
  public readonly isAutoDetected: WritableSignal<boolean> = signal(false);

  // Centralized check for personas that require TLF-only context
  public readonly isTlfOnlyPersona = computed(() => {
    const persona = this.currentPersona();
    return persona === 'board-member' || persona === 'executive-director';
  });

  public constructor() {
    // Default persona - will be overridden by initializeFromAuth if backend provides one
    this.currentPersona = signal<PersonaType>('maintainer');
  }

  /**
   * Initialize persona from AuthContext (SSR state transfer)
   * If persona is provided from backend, it was auto-detected and cannot be changed
   */
  public initializeFromAuth(persona: PersonaType | null | undefined): void {
    if (persona) {
      this.currentPersona.set(persona);
      this.isAutoDetected.set(true);

      if (this.isBoardScopedPersona(persona)) {
        this.enforceTlfOnlyContext();
      }
    } else {
      // No auto-detected persona, allow manual selection
      this.isAutoDetected.set(false);
      this.setPersona('maintainer');
    }
  }

  /**
   * Set the current persona
   * When switching to a board-scoped persona, enforce TLF-only context
   * Cannot change persona if it was auto-detected from committee membership
   */
  public setPersona(persona: PersonaType): void {
    if (persona !== this.currentPersona()) {
      this.currentPersona.set(persona);

      if (this.isBoardScopedPersona(persona)) {
        this.enforceTlfOnlyContext();
      }
    }
  }

  /**
   * Check if a persona is board-scoped (requires TLF-only context)
   */
  public isBoardScopedPersona(persona: PersonaType): boolean {
    return persona === 'board-member' || persona === 'executive-director';
  }

  /**
   * Enforce TLF-only context for board-scoped personas
   * Clears child project selection and sets TLF as the active foundation
   */
  private enforceTlfOnlyContext(): void {
    this.projectContextService.clearProject();

    const tlfProject = this.projectContextService.availableProjects.find((p) => p.slug === 'tlf');
    if (tlfProject) {
      this.projectContextService.setFoundation(tlfProject);
    }

    this.router.navigate(['/']);
  }
}
