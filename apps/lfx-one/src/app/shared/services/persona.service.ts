// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable, signal, WritableSignal } from '@angular/core';
import { PersonaType } from '@lfx-one/shared/interfaces';

@Injectable({
  providedIn: 'root',
})
export class PersonaService {
  private readonly storageKey = 'lfx-persona';
  public readonly currentPersona: WritableSignal<PersonaType>;

  public constructor() {
    // Initialize from localStorage or default to 'core-developer'
    const stored = this.getStoredPersona();
    this.currentPersona = signal(stored);
  }

  /**
   * Set the current persona and persist to storage
   */
  public setPersona(persona: PersonaType): void {
    this.currentPersona.set(persona);
    this.persistPersona(persona);
  }

  /**
   * Check if current persona is the new UI
   */
  public isNewUI(): boolean {
    return this.currentPersona() === 'core-developer';
  }

  /**
   * Check if current persona is the old UI
   */
  public isOldUI(): boolean {
    return this.currentPersona() === 'old-ui';
  }

  private getStoredPersona(): PersonaType {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.storageKey) as PersonaType;
      return stored || 'core-developer';
    }
    return 'core-developer';
  }

  private persistPersona(persona: PersonaType): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.storageKey, persona);
    }
  }
}
