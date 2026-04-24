// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { ProjectCounts } from '../interfaces';

/**
 * A project "has channels" when it has at least one mailing list OR a chat
 * channel configured on any committee. Used by the foundation projects page
 * to drive the Channels column icons and the presence filter pills — a
 * project with only a chat channel (no mailing lists) still counts as
 * "with channels".
 */
export function hasAnyChannel(counts: ProjectCounts | undefined): boolean {
  return !!counts && (counts.mailingLists > 0 || counts.hasChat);
}
