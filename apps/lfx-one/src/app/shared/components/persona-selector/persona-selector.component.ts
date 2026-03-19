// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SelectComponent } from '@components/select/select.component';
import { PERSONA_OPTIONS } from '@lfx-one/shared/constants';
import { PersonaType } from '@lfx-one/shared/interfaces';
import { FeatureFlagService } from '@services/feature-flag.service';
import { PersonaService } from '@services/persona.service';
import { ProjectContextService } from '@services/project-context.service';

@Component({
  selector: 'lfx-persona-selector',
  imports: [ReactiveFormsModule, SelectComponent],
  templateUrl: './persona-selector.component.html',
})
export class PersonaSelectorComponent {
  private readonly personaService = inject(PersonaService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly featureFlagService = inject(FeatureFlagService);

  // Persona options available for selection
  protected readonly personaOptions = PERSONA_OPTIONS;
  // Whether persona is auto-detected (read-only)
  protected readonly isAutoDetected = this.personaService.isAutoDetected;
  // Feature flag for role selector
  protected readonly showRoleSelector = this.featureFlagService.getBooleanFlag('role-selector', false);
  // Show selector if not autodetected OR feature flag is enabled
  protected readonly shouldShowSelector = computed(() => !this.isAutoDetected() || this.showRoleSelector());

  public form: FormGroup;

  public constructor() {
    this.form = new FormGroup({
      persona: new FormControl<PersonaType>(this.personaService.currentPersona(), [Validators.required]),
    });

    this.form
      .get('persona')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((value: PersonaType) => {
        // TODO: DEMO - Remove when proper permissions are implemented
        // Set project/foundation before persona so navigation in setPersona() has correct context
        if (value === 'board-member') {
          // TODO: DEMO - Remove when proper permissions are implemented
          // Board member: foundation = TLF (home context), project = LFX One Dev (overview page)
          const tlfProject = this.projectContextService.availableProjects.find((p) => p.slug === 'tlf');
          const lfxOneDevProject = this.projectContextService.availableProjects.find((p) => p.slug === 'lfx-one-dev');
          if (tlfProject) {
            this.projectContextService.setFoundation({ uid: tlfProject.uid, name: tlfProject.name, slug: tlfProject.slug });
          }
          if (lfxOneDevProject) {
            this.projectContextService.setProject({ uid: lfxOneDevProject.uid, name: lfxOneDevProject.name, slug: lfxOneDevProject.slug });
          }
        } else if (value === 'executive-director') {
          const tlfProject = this.projectContextService.availableProjects.find((p) => p.slug === 'tlf');
          if (tlfProject) {
            this.projectContextService.setFoundation({
              uid: tlfProject.uid,
              name: tlfProject.name,
              slug: tlfProject.slug,
            });
          }
        }

        this.personaService.setPersona(value);
      });
  }
}
