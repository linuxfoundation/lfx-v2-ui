// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { BADGE_FILTER_OPTIONS } from '../constants/badge.constants';
import { Badge, BadgeCategory } from '../interfaces/badge.interface';
import { CredlyBadgeEntry } from '../interfaces/credly.interface';

const CREDLY_EDIT_FRAGMENT = '/edit#credly';

/**
 * Map a raw Credly badge entry to the application Badge interface.
 * @param entry - Raw Credly API badge entry
 * @returns Mapped Badge object
 */
export function mapCredlyBadgeToBadge(entry: CredlyBadgeEntry): Badge {
  const category = inferBadgeCategory(entry);
  const primaryIssuer = entry.issuer?.entities?.find((e) => e.primary)?.entity;
  const expiresDate = entry.expires_at_date ?? entry.expires_at ?? undefined;
  const firstName = (entry.user?.first_name ?? entry.issued_to_first_name ?? '').trim();
  const middleName = (entry.user?.middle_name ?? entry.issued_to_middle_name ?? '').trim();
  const lastName = (entry.user?.last_name ?? entry.issued_to_last_name ?? '').trim();
  const credlyOrigin = getTrustedCredlyOrigin(entry.user?.url, entry.badge_url, entry.accept_badge_url);
  const credlyProfileSlug = getCredlyProfileSlug(entry.user?.url) ?? buildCredlyProfileSlug(firstName, middleName, lastName);
  const privateBadgeEditUrl = credlyProfileSlug && credlyOrigin ? `${credlyOrigin}/users/${credlyProfileSlug}${CREDLY_EDIT_FRAGMENT}` : undefined;
  const isPrivateBadge = !(entry.public ?? false);
  const acceptedBadgeUrl = isPrivateBadge ? (privateBadgeEditUrl ?? entry.badge_url ?? undefined) : (entry.badge_url ?? undefined);
  const credlyUrl = entry.state === 'pending' ? (entry.accept_badge_url ?? undefined) : acceptedBadgeUrl;

  return {
    id: entry.id,
    title: entry.badge_template?.name ?? 'Badge',
    description: entry.badge_template?.description ?? '',
    category,
    categoryLabel: getCategoryLabel(category),
    issuedDate: entry.issued_at_date ?? entry.issued_at ?? '',
    issuer: primaryIssuer?.name ?? 'The Linux Foundation',
    firstName,
    middleName: middleName || undefined,
    lastName,
    credentialId: entry.issuer_earner_id ?? entry.id,
    isVerified: entry.state === 'accepted',
    isExpired: false, // computed client-side from expiresDate to avoid cache staleness
    isPublic: entry.public ?? false,
    isPending: entry.state === 'pending',
    expiresDate,
    imageUrl: entry.badge_template?.image_url ?? entry.image_url,
    credlyUrl,
    shareUrl: entry.badge_url || undefined,
  };
}

function getTrustedCredlyOrigin(...candidates: Array<string | null | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsedUrl = new URL(candidate);
      const isTrustedHost = parsedUrl.hostname === 'credly.com' || parsedUrl.hostname.endsWith('.credly.com');
      if (isTrustedHost) {
        return parsedUrl.origin;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

/**
 * Extract the Credly profile slug from a URL like:
 * https://www.credly.com/users/audi-young
 */
function getCredlyProfileSlug(userUrl?: string): string | undefined {
  if (!userUrl) return undefined;
  try {
    const parsedUrl = new URL(userUrl);
    const match = parsedUrl.pathname.match(/^\/users\/([^/]+)$/);
    return match?.[1];
  } catch {
    return undefined;
  }
}

function buildCredlyProfileSlug(firstName: string, middleName: string, lastName: string): string | undefined {
  if (!firstName || !lastName) return undefined;
  const nameParts = [firstName];
  if (middleName) {
    nameParts.push(middleName);
  }
  nameParts.push(lastName);

  const normalizedSlug = collapseRepeatedHyphens(nameParts.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  const slug = trimHyphens(normalizedSlug);

  return slug || undefined;
}

function collapseRepeatedHyphens(value: string): string {
  let result = '';
  let previousWasHyphen = false;

  for (const char of value) {
    if (char === '-') {
      if (!previousWasHyphen) {
        result += char;
      }
      previousWasHyphen = true;
      continue;
    }

    result += char;
    previousWasHyphen = false;
  }

  return result;
}

function trimHyphens(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === '-') {
    start++;
  }

  while (end > start && value[end - 1] === '-') {
    end--;
  }

  return value.slice(start, end);
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
  if (name.includes('attendee') || name.includes('participant') || name.includes('participation')) return 'event-participation';
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
  return BADGE_FILTER_OPTIONS.find((opt) => opt.id === category)?.label ?? category;
}

/**
 * Returns true if a raw Credly badge entry has the minimum data needed to render a card.
 * Filters out malformed entries and non-accepted/pending states before mapping.
 * @param entry - Raw Credly API badge entry
 */
export function isValidBadge(entry: CredlyBadgeEntry): boolean {
  const firstName = (entry.user?.first_name ?? entry.issued_to_first_name ?? '').trim();
  const lastName = (entry.user?.last_name ?? entry.issued_to_last_name ?? '').trim();

  return !!(entry.id && entry.badge_template?.name && firstName && lastName && (entry.state === 'accepted' || entry.state === 'pending'));
}
