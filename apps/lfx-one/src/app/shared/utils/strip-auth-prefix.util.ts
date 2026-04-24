// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

const LEGACY_USERNAME_MAX_LENGTH = 60;

export function stripAuthPrefix(value: string | null | undefined): string {
  if (!value) return 'N/A';
  const stripped = value.startsWith('auth0|') ? value.slice(6) : value;
  return stripped.length > LEGACY_USERNAME_MAX_LENGTH ? 'N/A' : stripped;
}
