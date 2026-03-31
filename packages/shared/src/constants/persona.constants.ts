// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { OrgUserType, PersonaOption } from '../interfaces';

/**
 * Persona options available for user selection
 */
/**
 * Organization lens user type options
 */
export const ORG_USER_TYPE_OPTIONS: { value: OrgUserType; label: string }[] = [
  { value: 'employee', label: 'Employee' },
  { value: 'admin-read-only', label: 'Admin (read only)' },
  { value: 'admin-edit', label: 'Admin (write access)' },
  { value: 'conglomerate-admin', label: 'Conglomerate admin' },
];

export const PERSONA_OPTIONS: PersonaOption[] = [
  // {
  //   value: 'core-developer',
  //   label: 'Core Developer',
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
