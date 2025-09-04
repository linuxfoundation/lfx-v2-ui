// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Security utility functions for cryptographic operations and secure comparisons
 */

/**
 * Performs a constant-time string comparison to prevent timing attacks.
 *
 * This function ensures that the comparison takes the same amount of time
 * regardless of where the strings differ, preventing attackers from using
 * timing information to guess the correct value character by character.
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
 * - Always processing every character of both strings
 * - Using bitwise operations instead of conditional branches
 * - Taking the same execution time regardless of input differences
 */
export function constantTimeEquals(a: string | null | undefined, b: string | null | undefined): boolean {
  // Handle null/undefined cases - return false if either is null/undefined
  if (a == null || b == null) {
    return false;
  }

  // Convert to strings if not already (defensive programming)
  const strA = String(a);
  const strB = String(b);

  // If lengths are different, we still need to do work to prevent timing attacks
  const lengthA = strA.length;
  const lengthB = strB.length;
  const maxLength = Math.max(lengthA, lengthB);

  // Initialize result - will be 0 if strings match, non-zero if different
  let result = lengthA ^ lengthB; // XOR lengths - will be non-zero if lengths differ

  // Compare each character position up to the maximum length
  for (let i = 0; i < maxLength; i++) {
    // Get character codes, using 0 for positions beyond string length
    const charA = i < lengthA ? strA.charCodeAt(i) : 0;
    const charB = i < lengthB ? strB.charCodeAt(i) : 0;

    // XOR the characters and accumulate the result
    result |= charA ^ charB;
  }

  // Return true only if result is 0 (all characters and lengths matched)
  return result === 0;
}

/**
 * Validates that a passcode matches the expected value using constant-time comparison.
 *
 * This is a convenience wrapper around constantTimeEquals specifically for passcode validation.
 *
 * @param providedPasscode - The passcode provided by the user
 * @param expectedPasscode - The expected passcode value
 * @returns true if passcodes match, false otherwise
 */
export function validatePasscode(providedPasscode: string | null | undefined, expectedPasscode: string | null | undefined): boolean {
  return constantTimeEquals(providedPasscode, expectedPasscode);
}
