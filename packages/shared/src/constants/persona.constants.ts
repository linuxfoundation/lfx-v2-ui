// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DevPersonaPreset, PersonaOption } from '../interfaces';

/** Cookie key for persisting the active persona preset */
export const PERSONA_COOKIE_KEY = 'lfx-active-persona-preset';

/**
 * Persona options available for user selection in the dev toolbar
 */
export const PERSONA_OPTIONS: PersonaOption[] = [
  // ── Project personas ──────────────────────────────────────────────────────
  {
    value: 'contributor',
    label: 'Contributor',
    description: 'General contributor to a project',
  },
  {
    value: 'maintainer',
    label: 'Maintainer',
    description: 'Project maintainer (1 project)',
  },
  {
    value: 'maintainer-admin',
    label: 'Maint+Admin',
    description: 'Maintainer with governance access (votes, surveys, permissions)',
  },
  {
    value: 'maintainer-board',
    label: 'Maint+Board',
    description: 'Maintainer who is also a board member — sees both Project and Foundation lenses',
  },
  // ── Governance personas ───────────────────────────────────────────────────
  {
    value: 'board-1',
    label: 'Board (1)',
    description: 'Board member scoped to a single foundation',
  },
  {
    value: 'board-multi',
    label: 'Board (multi)',
    description: 'Board member across multiple foundations',
  },
  {
    value: 'ed-1',
    label: 'ED (1)',
    description: 'Executive director scoped to a single foundation',
  },
  {
    value: 'ed-multi',
    label: 'ED (multi)',
    description: 'Executive director across multiple foundations',
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
    multiProject: true,
  },
  { label: 'Maint (1 proj)', value: 'maintainer-single', personas: ['maintainer'], primary: 'maintainer' },
  { label: 'Maint (multi proj)', value: 'maintainer-multi', personas: ['maintainer'], primary: 'maintainer', multiProject: true },
  { label: 'Board (1 fdn)', value: 'board-single', personas: ['board-member'], primary: 'board-member' },
  { label: 'Board (multi fdn)', value: 'board-multi', personas: ['board-member'], primary: 'board-member', multiFoundation: true },
  { label: 'ED (1 fdn)', value: 'ed-single', personas: ['executive-director'], primary: 'executive-director' },
  { label: 'ED (multi fdn)', value: 'ed-multi', personas: ['executive-director'], primary: 'executive-director', multiFoundation: true },

  // Multi-role: Maintainer + Board
  { label: 'Maint(1) + Board(1)', value: 'maint1-board1', personas: ['maintainer', 'board-member'], primary: 'board-member' },
  { label: 'Maint(1) + Board(multi)', value: 'maint1-board-multi', personas: ['maintainer', 'board-member'], primary: 'board-member', multiFoundation: true },
  { label: 'Maint(multi) + Board(1)', value: 'maint-multi-board1', personas: ['maintainer', 'board-member'], primary: 'board-member', multiProject: true },
  {
    label: 'Maint(multi) + Board(multi)',
    value: 'maint-multi-board-multi',
    personas: ['maintainer', 'board-member'],
    primary: 'board-member',
    multiProject: true,
    multiFoundation: true,
  },

  // Multi-role: Maintainer + ED
  { label: 'Maint(1) + ED(1)', value: 'maint1-ed1', personas: ['maintainer', 'executive-director'], primary: 'executive-director' },
  {
    label: 'Maint(multi) + ED(multi)',
    value: 'maint-multi-ed-multi',
    personas: ['maintainer', 'executive-director'],
    primary: 'executive-director',
    multiProject: true,
    multiFoundation: true,
  },
];
