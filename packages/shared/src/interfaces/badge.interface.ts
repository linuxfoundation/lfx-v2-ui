// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/** Badge category types matching the filter tabs */
export type BadgeCategory = 'certifications' | 'memberships' | 'speaking' | 'event-participation' | 'contributors' | 'program-committee';

/** Badge status filter values */
export type BadgeStatusFilter = 'all' | 'active' | 'expired';

/** Badge visibility filter values */
export type BadgeVisibilityFilter = 'all' | 'public' | 'private';

/** Badge entity representing an earned achievement */
export interface Badge {
  /** Unique badge identifier */
  id: string;
  /** Badge display title */
  title: string;
  /** Badge description text */
  description: string;
  /** Category for filtering */
  category: BadgeCategory;
  /** Display label for the category (e.g., "Event Participation") */
  categoryLabel: string;
  /** Date the badge was issued (ISO string) */
  issuedDate: string;
  /** Issuing organization name */
  issuer: string;
  /** Credential ID from the issuer (e.g., issuer_earner_id) */
  credentialId: string;
  /** Whether the badge state is accepted/verified */
  isVerified: boolean;
  /** Whether the badge credential has expired */
  isExpired: boolean;
  /** Whether the earner has made the badge publicly visible on Credly */
  isPublic: boolean;
  /** Whether the badge is in pending state (awaiting acceptance by the earner) */
  isPending: boolean;
  /** Optional expiry date (ISO string) — present only for badges with an expiry */
  expiresDate?: string;
  /** Optional badge image URL */
  imageUrl?: string;
  /** Link to view the badge on Credly — badge_url for accepted, accept_badge_url for pending */
  credlyUrl?: string;
  /** Link to share the badge — only present for accepted badges (badge_url) */
  shareUrl?: string;
}

/** State container for badge data loading */
export interface BadgeState {
  loading: boolean;
  error: boolean;
  data: Badge[];
}
