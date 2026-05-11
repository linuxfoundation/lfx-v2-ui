// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Maps a type so that every nested `string` becomes `string | null`. Arrays
 * map elementwise; plain objects map each property; tuples and known non-plain
 * object types (Date, Map, Set, URL, RegExp) are preserved as-is so the helper
 * does not falsely widen them.
 */
export type NullifyEmptyStrings<T> = T extends string
  ? string | null
  : T extends Date | Map<unknown, unknown> | Set<unknown> | URL | RegExp
    ? T
    : T extends readonly (infer U)[]
      ? NullifyEmptyStrings<U>[]
      : T extends object
        ? { [K in keyof T]: NullifyEmptyStrings<T[K]> }
        : T;

/**
 * Recursively replaces empty / whitespace-only strings with `null` throughout a
 * value. Useful when sending payloads to APIs that reject `""` on validated
 * fields but accept `null`. Non-string primitives, arrays, and plain objects are
 * walked; non-plain objects (Date, Map, Set, class instances, etc.) are returned
 * unchanged so their prototype is preserved. The original value is not mutated.
 *
 * @param value - The value to sanitize (object, array, or primitive)
 * @returns A new value with empty strings replaced by `null`
 */
export function nullifyEmptyStrings<T>(value: T): NullifyEmptyStrings<T> {
  if (value === null || value === undefined) return value as NullifyEmptyStrings<T>;
  if (typeof value === 'string') {
    return (value.trim() === '' ? null : value) as NullifyEmptyStrings<T>;
  }
  if (Array.isArray(value)) {
    return value.map((item) => nullifyEmptyStrings(item)) as NullifyEmptyStrings<T>;
  }
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      return value as NullifyEmptyStrings<T>;
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = nullifyEmptyStrings(val);
    }
    return result as NullifyEmptyStrings<T>;
  }
  return value as NullifyEmptyStrings<T>;
}
