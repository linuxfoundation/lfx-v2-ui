// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PersonaOption, PersonaType } from '@lfx-one/shared/interfaces';
import { PersonaService } from '@services/persona.service';

@Component({
  selector: 'lfx-persona-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './persona-selector.component.html',
})
export class PersonaSelectorComponent {
  private readonly router = inject(Router);
  private readonly personaService = inject(PersonaService);

  // Persona options available for selection
  protected readonly personaOptions: PersonaOption[] = [
    {
      value: 'core-developer',
      label: 'Core Developer Persona',
      description: 'New streamlined developer experience',
    },
    {
      value: 'old-ui',
      label: 'Old UI',
      description: 'Classic LFX interface',
    },
  ];

  // Current selected persona from service
  protected readonly selectedPersona = computed(() => this.personaService.currentPersona());

  protected onPersonaChange(event: { value: PersonaType }): void {
    const newPersona = event.value;

    // Update persona in service
    this.personaService.setPersona(newPersona);

    // Navigate to appropriate route
    if (newPersona === 'core-developer') {
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/old-ui']);
    }
  }
}
