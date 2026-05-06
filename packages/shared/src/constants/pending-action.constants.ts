// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { PendingActionType, TagSeverity } from '../interfaces/components.interface';

/**
 * Per-type tag severity for pending action rows in the dashboard "My Pending Actions" card.
 *
 * Single source of truth for both the server-side producers
 * (user.service `transformVotesToActions` / `createMeetingAction` / `createRsvpAction`,
 *  project.service `getPendingActionSurveys`) and the client-side committee-overview producer.
 * Mirrors the established `COMMITTEE_CATEGORY_SEVERITY` / `SURVEY_STATUS_SEVERITY` pattern so a
 * future tone tweak is a one-line edit.
 *
 * Producers should read entries directly (e.g. `PENDING_ACTION_SEVERITY.Vote`) — the typed
 * `Record<PendingActionType, …>` makes a missing key a compile error, which is exactly the
 * producer-drift signal we want. Avoid wrapping this in a `(type: string) => TagSeverity` helper:
 * accepting `string` would re-introduce the silent-fallback footgun the union type was added to
 * eliminate.
 *
 * Tones map to PrimeNG design tokens — no raw hex / Tailwind defaults — so theming changes flow
 * through automatically.
 */
export const PENDING_ACTION_SEVERITY: Record<PendingActionType, TagSeverity> = {
  RSVP: 'warn', // amber — most common row + matches the row's amber background tint
  Vote: 'info', // blue
  Survey: 'success', // green
  Agenda: 'secondary', // gray — informational read-before-meeting cue
};
