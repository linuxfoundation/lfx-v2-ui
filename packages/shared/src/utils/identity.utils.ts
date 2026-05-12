// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Strict `local@host.tld` shape detection. Used to distinguish email vs
 * username CDP identity values when the platform doesn't carry that
 * information (legacy CDP rows without a `type` field). The platform
 * default (e.g. CDP_PLATFORM_TO_TYPE_MAP) is intentionally not consulted
 * here — POST defaults reflect what Auth0 gives us, not a guarantee about
 * what is stored in any given row.
 */
export const EMAIL_SHAPE_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns true if the value matches a strict `local@host.tld` email shape
 * after trimming surrounding whitespace.
 */
export function isEmailShape(value: string): boolean {
  return EMAIL_SHAPE_REGEX.test(value.trim());
}
