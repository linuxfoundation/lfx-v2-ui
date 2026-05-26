// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/** Tab identifier for the Org Events page tab strip. */
export type OrgEventsTabId = 'upcoming' | 'past';

/** Stat-card filter identifier for the Org Events page. */
export type OrgEventStatFilterId = 'total' | 'past' | 'registered';

/** Tab definition for the Org Events page. */
export interface OrgEventsTabConfig {
  readonly id: OrgEventsTabId;
  readonly label: string;
  readonly icon: string;
}
