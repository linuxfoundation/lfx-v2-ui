// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DevPersonaPreset, PersonaOption, PersonaType } from '../interfaces';

/** Cookie key for persisting the active persona preset */
export const PERSONA_COOKIE_KEY = 'lfx-active-persona-preset';

/** Detection sources from the persona service that map to specific PersonaType values */
export const DETECTION_SOURCE_MAP: Readonly<Record<string, PersonaType>> = {
  board_member: 'board-member',
  executive_director: 'executive-director',
} as const;

/** Persona priority order (highest first) — used for sorting a user's collection of personas */
export const PERSONA_PRIORITY: readonly PersonaType[] = ['executive-director', 'board-member', 'maintainer', 'contributor'] as const;

/** TTL for PersonaDetectionService's per-user affiliated-project-UIDs cache, in ms */
export const AFFILIATED_PROJECT_UIDS_CACHE_TTL_MS = 15_000;

/** TTL for PersonaDetectionService's per-user full persona-API response cache, in ms */
export const PERSONAS_CACHE_TTL_MS = 15_000;

/**
 * Persona options available for user selection
 */
export const PERSONA_OPTIONS: PersonaOption[] = [
  // {
  //   value: 'contributor',
  //   label: 'Contributor',
  //   description: 'New streamlined developer experience',
  // },
  {
    value: 'maintainer',
    label: 'Maintainer',
    description: 'Project maintainer focused experience',
  },
  {
    value: 'board-member',
    label: 'Board Member',
    description: 'Board member focused experience',
  },
  {
    value: 'executive-director',
    label: 'Executive Director',
    description: 'Executive director focused experience',
  },
];

/**
 * Dev toolbar persona presets for testing different role/access scenarios
 */
export const DEV_PERSONA_PRESETS: DevPersonaPreset[] = [
  // Single-role presets
  { label: 'Contributor', value: 'contributor', personas: ['contributor'], primary: 'contributor' },
  {
    label: 'Contributor + Maint (multi proj)',
    value: 'contributor-maintainer-multi',
    personas: ['contributor', 'maintainer'],
    primary: 'maintainer',
  },
  { label: 'Maint (1 proj)', value: 'maintainer-single', personas: ['maintainer'], primary: 'maintainer' },
  { label: 'Maint (multi proj)', value: 'maintainer-multi', personas: ['maintainer'], primary: 'maintainer' },
  { label: 'Board (1 fdn)', value: 'board-single', personas: ['board-member'], primary: 'board-member' },
  { label: 'Board (multi fdn)', value: 'board-multi', personas: ['board-member'], primary: 'board-member' },
  { label: 'ED (1 fdn)', value: 'ed-single', personas: ['executive-director'], primary: 'executive-director' },
  { label: 'ED (multi fdn)', value: 'ed-multi', personas: ['executive-director'], primary: 'executive-director' },

  // Multi-role: Maintainer + Board
  { label: 'Maint(1) + Board(1)', value: 'maint1-board1', personas: ['maintainer', 'board-member'], primary: 'board-member' },
  { label: 'Maint(1) + Board(multi)', value: 'maint1-board-multi', personas: ['maintainer', 'board-member'], primary: 'board-member' },
  { label: 'Maint(multi) + Board(1)', value: 'maint-multi-board1', personas: ['maintainer', 'board-member'], primary: 'board-member' },
  {
    label: 'Maint(multi) + Board(multi)',
    value: 'maint-multi-board-multi',
    personas: ['maintainer', 'board-member'],
    primary: 'board-member',
  },

  // Multi-role: Maintainer + ED
  { label: 'Maint(1) + ED(1)', value: 'maint1-ed1', personas: ['maintainer', 'executive-director'], primary: 'executive-director' },
  {
    label: 'Maint(multi) + ED(multi)',
    value: 'maint-multi-ed-multi',
    personas: ['maintainer', 'executive-director'],
    primary: 'executive-director',
  },
];
