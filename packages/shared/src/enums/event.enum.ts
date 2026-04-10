// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export enum FoundationEventStatus {
  PLANNED = 'Planned',
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  ACTIVE = 'Active',
  /** Display label for Active events (registration is open) */
  REGISTRATION_OPEN = 'Registration Open',
  /** Display label for Pending/Planned events (not yet open) */
  COMING_SOON = 'Coming Soon',
}
