// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Security utility functions for cryptographic operations and secure comparisons
 */

/**
 * Performs a cryptographically secure constant-time string comparison to prevent timing attacks.
 *
 * This function uses Node.js's native crypto.timingSafeEqual which provides true constant-time
 * comparison at the native level, eliminating JavaScript engine and JIT optimization variance.
 *
 * The function normalizes input strings by hashing them to fixed-length values before comparison,
 * which prevents both timing side-channels and length-based information leakage.
 *
 * @param a - First string to compare (e.g., user input)
 * @param b - Second string to compare (e.g., stored secret)
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = constantTimeEquals(userPasscode, storedPasscode);
 * ```
 *
 * @security This function prevents timing attacks by:
 * - Using Node.js's native crypto.timingSafeEqual for guaranteed constant-time comparison
 * - Hashing inputs to fixed-length values to eliminate length-based side channels
 * - Operating at the native code level, immune to JavaScript JIT optimizations
 */
export function constantTimeEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  // Handle null/undefined cases - return false if either is null/undefined
  if (a == null || b == null) {
    return false;
  }

  // Convert to strings if not already (defensive programming)
  const strA = String(a);
  const strB = String(b);

  // Hash both strings to fixed-length values to eliminate length-based timing channels
  // This ensures both inputs are the same length for timingSafeEqual
  const hashA = createHash('sha256').update(strA, 'utf8').digest();
  const hashB = createHash('sha256').update(strB, 'utf8').digest();

  // Use Node.js's native constant-time comparison
  // This is implemented in native code and provides true timing-attack resistance
  return timingSafeEqual(hashA, hashB);
}

/**
 * Validates that a passcode matches the expected value using cryptographically secure constant-time comparison.
 *
 * This is a convenience wrapper around constantTimeEquals specifically for passcode validation.
 * Uses Node.js's native timing-safe primitives to provide true security guarantees.
 *
 * @param providedPasscode - The passcode provided by the user
 * @param expectedPasscode - The expected passcode value
 * @returns true if passcodes match, false otherwise
 */
export function validatePasscode(providedPasscode: string | null | undefined, expectedPasscode: string | null | undefined): boolean {
  return constantTimeEquals(providedPasscode, expectedPasscode);
}
