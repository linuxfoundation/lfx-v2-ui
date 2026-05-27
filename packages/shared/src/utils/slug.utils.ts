// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/** Matches a single URL-safe slug segment: lowercase letters, digits, and hyphens. */
export const SLUG_SEGMENT_RE = /^[a-z0-9-]+$/;

/**
 * Returns true when every element of `parts` is a non-empty, URL-safe slug
 * segment (lowercase letters, digits, hyphens only).
 */
export function isValidSlugParts(parts: string[]): boolean {
  return parts.length > 0 && parts.every((p) => SLUG_SEGMENT_RE.test(p));
}

/**
 * Returns true when `value` is a non-empty, URL-safe slug segment
 * (lowercase letters, digits, hyphens only).
 */
export function isValidSlug(value: string): boolean {
  return SLUG_SEGMENT_RE.test(value);
}
