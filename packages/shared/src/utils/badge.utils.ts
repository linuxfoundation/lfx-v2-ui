// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { BADGE_FILTER_OPTIONS } from '../constants/badge.constants';
import { Badge, BadgeCategory } from '../interfaces/badge.interface';
import { CredlyBadgeEntry } from '../interfaces/credly.interface';

/**
 * Map a raw Credly badge entry to the application Badge interface.
 * @param entry - Raw Credly API badge entry
 * @returns Mapped Badge object
 */
export function mapCredlyBadgeToBadge(entry: CredlyBadgeEntry): Badge {
  const category = inferBadgeCategory(entry);
  const primaryIssuer = entry.issuer?.entities?.find(e => e.primary)?.entity;
  const expiresDate = entry.expires_at_date ?? entry.expires_at ?? undefined;
  return {
    id: entry.id,
    title: entry.badge_template?.name ?? 'Badge',
    description: entry.badge_template?.description ?? '',
    category,
    categoryLabel: getCategoryLabel(category),
    issuedDate: entry.issued_at_date ?? entry.issued_at ?? '',
    issuer: primaryIssuer?.name ?? 'The Linux Foundation',
    credentialId: entry.issuer_earner_id ?? entry.id,
    isVerified: entry.state === 'accepted',
    isExpired: false, // computed client-side from expiresDate to avoid cache staleness
    isPublic: entry.public ?? false,
    isPending: entry.state === 'pending',
    expiresDate,
    imageUrl: entry.badge_template?.image_url ?? entry.image_url,
    credlyUrl: entry.badge_url || entry.accept_badge_url || undefined,
    shareUrl: entry.badge_url || undefined,
  };
}

/**
 * Infer a badge category from the Credly badge template.
 * Prefers the explicit type_category field from the API, falls back to name heuristics.
 * @param entry - Raw Credly API badge entry
 * @returns Inferred BadgeCategory
 */
export function inferBadgeCategory(entry: CredlyBadgeEntry): BadgeCategory {
  // Prefer the explicit type_category from the API when available
  const typeCategory = (entry.badge_template?.type_category ?? '').toLowerCase();
  if (typeCategory === 'certification') return 'certifications';
  if (typeCategory === 'membership') return 'memberships';

  // Fall back to name-based heuristics
  const name = (entry.badge_template?.name ?? '').toLowerCase();

  if (name.includes('speaker') || name.includes('keynote')) return 'speaking';
  if (name.includes('program committee')) return 'program-committee';
  if (name.includes('attendee') || name.includes('participant') || name.includes('participation'))
    return 'event-participation';
  if (name.includes('contributor') || name.includes('maintainer')) return 'contributors';
  if (name.includes('member') || name.includes('membership')) return 'memberships';

  // Default — most LF Credly badges are certifications
  return 'certifications';
}

/**
 * Get the human-readable display label for a badge category.
 * Derives from BADGE_FILTER_OPTIONS to keep a single source of truth.
 * @param category - Badge category key
 * @returns Display label string
 */
export function getCategoryLabel(category: BadgeCategory): string {
  return BADGE_FILTER_OPTIONS.find(opt => opt.id === category)?.label ?? category;
}

/**
 * Returns true if a raw Credly badge entry has the minimum data needed to render a card.
 * Filters out malformed entries and non-accepted/pending states before mapping.
 * @param entry - Raw Credly API badge entry
 */
export function isValidBadge(entry: CredlyBadgeEntry): boolean {
  return !!(
    entry.id &&
    entry.badge_template?.name &&
    (entry.state === 'accepted' || entry.state === 'pending')
  );
}
