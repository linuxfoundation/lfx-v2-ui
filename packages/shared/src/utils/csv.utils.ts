// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Escape a value for CSV output per RFC 4180.
 * Wraps in double quotes if the value contains commas, double quotes, or newlines.
 * Doubles internal double quotes.
 */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate a CSV string from column definitions and data.
 * Returns a BOM-prefixed UTF-8 string for Excel compatibility.
 */
export function generateCsv<T>(columns: { key: keyof T; label: string; formatter?: (val: T[keyof T]) => string }[], data: T[]): string {
  const header = columns.map((col) => escapeCsvValue(col.label)).join(',');

  const rows = data.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const formatted = col.formatter ? col.formatter(raw) : raw;
        return escapeCsvValue(formatted);
      })
      .join(',')
  );

  return '\uFEFF' + [header, ...rows].join('\r\n');
}
