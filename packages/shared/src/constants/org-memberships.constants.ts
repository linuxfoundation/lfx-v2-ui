// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { MembershipDetailTab } from '../interfaces/org-memberships.interface';

/** FR-018b — single tunable constant for the simulated save latency window. */
export const MOCK_SAVE_LATENCY_MS = 400;

export const TAB_FRAGMENTS: readonly MembershipDetailTab[] = ['key-contacts', 'board', 'docs', 'governance'] as const;
export const DEFAULT_TAB: MembershipDetailTab = 'key-contacts';

/**
 * Map a URL-fragment string to a {@link MembershipDetailTab}.
 *
 * Accepts the canonical tab ids (`key-contacts`, `board`, `docs`, `governance`)
 * AND the longer aliases used in the PR description / external deep links
 * (`board-committee` → `board`, `documentation` → `docs`).
 */
const TAB_FRAGMENT_ALIASES: Readonly<Record<string, MembershipDetailTab>> = {
  'board-committee': 'board',
  documentation: 'docs',
};

export function fragmentToTab(fragment: string | null | undefined): MembershipDetailTab {
  const candidate = (fragment ?? '').toLowerCase().trim();
  if ((TAB_FRAGMENTS as readonly string[]).includes(candidate)) {
    return candidate as MembershipDetailTab;
  }
  return TAB_FRAGMENT_ALIASES[candidate] ?? DEFAULT_TAB;
}
