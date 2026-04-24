// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { ProjectCounts } from '../interfaces';

/**
 * A project "has channels" when it has at least one mailing list OR a chat
 * channel configured on any committee. Used by the foundation projects page
 * to drive the Channels column icons and the presence filter pills — a
 * project with only a chat channel (no mailing lists) still counts as
 * "with channels".
 *
 * Returns `undefined` when neither the `mailingLists` nor the `hasChat` field
 * has resolved yet (i.e., both are still `undefined` / in-flight). This lets
 * callers distinguish "pending" from "confirmed no channels" and avoid
 * counting unresolved rows as absent in the "Without Channels" filter.
 */
export function hasAnyChannel(counts: ProjectCounts | undefined): boolean | undefined {
  if (!counts) return undefined;
  // If at least one channel field is confirmed present, short-circuit immediately.
  if ((counts.mailingLists ?? 0) > 0 || counts.hasChat === true) return true;
  // If both channel fields are still pending, the channel status is unknown.
  if (counts.mailingLists === undefined && counts.hasChat === undefined) return undefined;
  // Both fields have resolved (to 0 / false) — confirmed no channels.
  return false;
}
