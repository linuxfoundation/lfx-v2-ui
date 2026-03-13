// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

const FORMULA_PREFIXES = ['=', '+', '-', '@'];

/**
 * Escape a value for CSV output per RFC 4180.
 * Wraps in double quotes if the value contains commas, double quotes, or newlines.
 * Doubles internal double quotes.
 * Neutralizes formula injection by prefixing dangerous values with a single quote.
 */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Neutralize CSV formula injection
  const trimmed = str.trimStart();
  if (FORMULA_PREFIXES.some((p) => trimmed.startsWith(p))) {
    str = "'" + str;
  }

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate a CSV string from column definitions and data.
 * Returns a BOM-prefixed UTF-8 string for Excel compatibility.
 * Formatter receives the full row for type-safe access to any field.
 */
export function generateCsv<T>(columns: { key: keyof T; label: string; formatter?: (row: T) => string }[], data: T[]): string {
  const header = columns.map((col) => escapeCsvValue(col.label)).join(',');

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const formatted = col.formatter ? col.formatter(row) : row[col.key];
        return escapeCsvValue(formatted);
      })
      .join(',')
  );

  return '\uFEFF' + [header, ...rows].join('\r\n');
}
