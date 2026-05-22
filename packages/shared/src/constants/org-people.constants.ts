// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { PeopleTabConfig, PeopleTabId } from '../interfaces/org-people.interface';

/**
 * Tab definitions for the Org Lens People page in their visible order.
 *
 * The first entry (`all`) is the implicit default — see
 * {@link DEFAULT_PEOPLE_TAB_ID}.
 */
export const PEOPLE_TABS: readonly PeopleTabConfig[] = [
  { id: 'all', label: 'All Employees', icon: 'fa-light fa-users', noun: 'all employees' },
  { id: 'board', label: 'Board', icon: 'fa-light fa-user-tie', noun: 'board members' },
  { id: 'committee', label: 'Committee', icon: 'fa-light fa-users-rectangle', noun: 'committee members' },
  { id: 'contacts', label: 'Key Contacts', icon: 'fa-light fa-address-card', noun: 'key contacts' },
  { id: 'contributors', label: 'Contributors', icon: 'fa-light fa-code', noun: 'contributors' },
  { id: 'events', label: 'Event Attendees', icon: 'fa-light fa-calendar', noun: 'event attendees' },
  { id: 'training', label: 'Trainees', icon: 'fa-light fa-graduation-cap', noun: 'trainees' },
] as const;

/**
 * Default tab id for the Org Lens People page. The URL drops `?tab=` when
 * the active tab matches this value so deep-link URLs stay clean.
 */
export const DEFAULT_PEOPLE_TAB_ID: PeopleTabId = 'all';

/**
 * Set of valid {@link PeopleTabId} values, derived from {@link PEOPLE_TABS}.
 * Used to validate `?tab=<id>` query-param input.
 */
export const VALID_PEOPLE_TAB_IDS: ReadonlySet<PeopleTabId> = new Set(PEOPLE_TABS.map((t) => t.id));
