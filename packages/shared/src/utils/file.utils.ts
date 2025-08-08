// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
}
