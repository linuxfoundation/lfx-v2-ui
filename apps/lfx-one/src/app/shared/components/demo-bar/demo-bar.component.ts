// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PersonaType } from '@lfx-one/shared/interfaces';
import { SelectButtonModule } from 'primeng/selectbutton';

import { CookieRegistryService } from '../../services/cookie-registry.service';
import { PersonaService } from '../../services/persona.service';

@Component({
  selector: 'lfx-demo-bar',
  standalone: true,
  imports: [ReactiveFormsModule, SelectButtonModule],
  templateUrl: './demo-bar.component.html',
  styleUrl: './demo-bar.component.scss',
})
export class DemoBarComponent {
  private readonly personaService = inject(PersonaService);
  private readonly cookieRegistry = inject(CookieRegistryService);

  public readonly roleOptions = [
    { label: 'Core Developer', value: 'core-developer' as PersonaType },
    { label: 'Maintainer', value: 'maintainer' as PersonaType },
    { label: 'Board Member', value: 'board-member' as PersonaType },
  ];

  public readonly roleForm = new FormGroup({
    role: new FormControl<PersonaType>(this.personaService.currentPersona()),
  });

  public readonly currentRole = computed(() => this.personaService.currentPersona());

  public constructor() {
    // Sync form with persona service
    this.roleForm.get('role')?.valueChanges.subscribe((value) => {
      if (value) {
        this.personaService.setPersona(value);
      }
    });
  }

  protected clearCache(): void {
    this.cookieRegistry.clearAllCookies();

    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
}

