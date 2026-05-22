// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { MembershipDetailTab } from '../interfaces/org-memberships.interface';

/** FR-018b — single tunable constant for the simulated save latency window. */
export const MOCK_SAVE_LATENCY_MS = 400;

export const TAB_FRAGMENTS: readonly MembershipDetailTab[] = ['key-contacts', 'board', 'docs', 'governance'] as const;
export const DEFAULT_TAB: MembershipDetailTab = 'key-contacts';

export function fragmentToTab(fragment: string | null | undefined): MembershipDetailTab {
  const candidate = (fragment ?? '').toLowerCase().trim();
  return (TAB_FRAGMENTS as readonly string[]).includes(candidate) ? (candidate as MembershipDetailTab) : DEFAULT_TAB;
}
