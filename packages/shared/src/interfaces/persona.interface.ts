// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Account } from './account.interface';

/**
 * Available persona types for UI customization
 * @description Defines the different user personas that can be selected.
 * New 9-persona taxonomy from the V2 lens navigation spec.
 * Legacy types (core-developer, projects, board-member, executive-director) retained for backwards compatibility.
 */
export type PersonaType =
  // V2 personas
  | 'contributor'
  | 'maintainer'
  | 'maintainer-admin'
  | 'board-1'
  | 'board-multi'
  | 'ed-1'
  | 'ed-multi'
  | 'maintainer-board'
  | 'new-contributor'
  // Legacy personas (backwards compat)
  | 'core-developer'
  | 'projects'
  | 'board-member'
  | 'executive-director';

/** All valid persona type values — used for runtime validation (e.g., cookie deserialization) */
export const VALID_PERSONAS: ReadonlySet<string> = new Set<string>([
  'contributor', 'maintainer', 'maintainer-admin', 'board-1', 'board-multi',
  'ed-1', 'ed-multi', 'maintainer-board', 'new-contributor',
  'core-developer', 'projects', 'board-member', 'executive-director',
]);

/** Governance personas — see Foundation lens (FDN in L1 rail) */
export const GOVERNANCE_PERSONAS: ReadonlySet<PersonaType> = new Set([
  'board-1',
  'board-multi',
  'ed-1',
  'ed-multi',
  'maintainer-board',
  // Legacy
  'board-member',
  'executive-director',
]);

/** Multi-foundation personas — have foundation selector/filter */
export const MULTI_FOUNDATION_PERSONAS: ReadonlySet<PersonaType> = new Set(['board-multi', 'ed-multi']);

/** Board-scoped personas that see foundation-level dashboards */
export const BOARD_SCOPED_PERSONAS: ReadonlySet<PersonaType> = GOVERNANCE_PERSONAS;

/** Check if a persona value is board-scoped (sees foundation-level dashboards) */
export function isBoardScopedPersona(persona: PersonaType): boolean {
  return BOARD_SCOPED_PERSONAS.has(persona);
}

/** Project-scoped personas that see project-level dashboards */
export const PROJECT_SCOPED_PERSONAS: ReadonlySet<PersonaType> = new Set(['maintainer', 'contributor']);

/** Check if a persona value is project-scoped (sees project-level dashboards) */
export function isProjectScopedPersona(persona: PersonaType): boolean {
  return PROJECT_SCOPED_PERSONAS.has(persona);
}

/** Check if a persona value should see the Foundation Lens (FDN) in the L1 rail */
export function hasFoundationLens(persona: PersonaType): boolean {
  return GOVERNANCE_PERSONAS.has(persona);
}

/** Check if a persona value should see the Project Lens (PROJ) in the L1 rail */
export function hasProjectLens(persona: PersonaType): boolean {
  if (persona === 'maintainer-board') return true;
  return persona !== 'new-contributor' && !GOVERNANCE_PERSONAS.has(persona);
}

/**
 * Persisted persona state for cookie storage
 * @description Structure for serializing/deserializing persona selection across page reloads
 */
export interface PersistedPersonaState {
  /** Primary active persona */
  primary: PersonaType;
  /** All active persona types */
  all: PersonaType[];
  /** Whether the user has access to multiple projects */
  multiProject?: boolean;
  /** Whether the user has access to multiple foundations */
  multiFoundation?: boolean;
  /** User's organizations from board member detections */
  organizations?: Account[];
}

/**
 * Dev toolbar persona preset configuration
 * @description Defines a persona combination for testing different role/access scenarios
 */
export interface DevPersonaPreset {
  /** Display label in the dropdown */
  label: string;
  /** Unique preset identifier */
  value: string;
  /** All persona types active in this preset */
  personas: PersonaType[];
  /** Primary persona type (determines lens behavior) */
  primary: PersonaType;
  /** Whether this preset simulates multiple project access */
  multiProject?: boolean;
  /** Whether this preset simulates multiple foundation access */
  multiFoundation?: boolean;
}

/**
 * Persona option configuration
 * @description Structure for persona selection dropdown options
 */
export interface PersonaOption {
  /** Unique identifier for the persona */
  value: PersonaType;
  /** Display label for the persona */
  label: string;
  /** Optional description of the persona */
  description?: string;
  /** Optional icon class for visual representation */
  icon?: string;
}
