// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Recursively replaces empty / whitespace-only strings with `null` throughout a
 * value. Useful when sending payloads to APIs that reject `""` on validated
 * fields but accept `null`. Non-string primitives, arrays, and nested objects
 * are walked; the original value is not mutated.
 *
 * @param value - The value to sanitize (object, array, or primitive)
 * @returns A new value with empty strings replaced by `null`
 */
export function nullifyEmptyStrings<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return (value.trim() === '' ? null : value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => nullifyEmptyStrings(item)) as T;
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = nullifyEmptyStrings(val);
    }
    return result as T;
  }
  return value;
}
