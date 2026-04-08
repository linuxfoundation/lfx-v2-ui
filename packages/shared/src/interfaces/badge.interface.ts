// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Badge category types
 * @description Represents the different kinds of recognition a user can earn
 */
export type BadgeCategory = 'certification' | 'speaking' | 'event-participation' | 'project-contribution' | 'maintainer' | 'program-committee';

/**
 * Badge data model
 * @description Represents a digital badge/credential earned by a user, powered by Credly
 */
export interface Badge {
  /** Unique badge instance identifier */
  id: string;
  /** Display name of the badge */
  name: string;
  /** Short description of what this badge represents */
  description: string;
  /** Badge image URL (Credly-hosted or placeholder) */
  imageUrl: string;
  /** Organization that issued this badge */
  issuedBy: string;
  /** ISO date string for when the badge was issued */
  issuedDate: string;
  /** Unique credential identifier string */
  credentialId: string;
  /** Related technology or topic tags */
  topics: string[];
  /** Description of what was required to earn this badge */
  earningCriteria: string;
  /** Classification of the badge type */
  category: BadgeCategory;
  /** External Credly URL for the specific earned credential (verification) */
  verifyUrl: string;
  /** External Credly URL for the badge type/program page (know more) */
  credlyBadgeUrl: string;
  /** Whether the credential has been externally verified via Credly */
  isVerified?: boolean;
}
