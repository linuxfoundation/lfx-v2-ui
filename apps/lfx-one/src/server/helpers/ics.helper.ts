// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Meeting, PaginatedResponse } from '@lfx-one/shared/interfaces';

/**
 * Formats an ISO date string to ICS DTSTART/DTEND format (e.g., 20230115T140000Z).
 */
export function formatICSDate(isoDate: string): string {
  return new Date(isoDate).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escapes ICS text values per RFC 5545 (backslash, semicolons, commas, newlines).
 */
export function escapeICSText(value: string): string {
  return (value ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Builds a single VEVENT block from meeting fields.
 * Uses nullish coalescing for duration so a valid 0-minute meeting is preserved.
 */
export function buildVEvent(uid: string, title: string, startIso: string, durationMinutes: number | null | undefined): string {
  const dtstart = formatICSDate(startIso);
  const endDate = new Date(startIso);
  endDate.setMinutes(endDate.getMinutes() + (durationMinutes ?? 60));
  const dtend = formatICSDate(endDate.toISOString());
  const dtstamp = formatICSDate(new Date().toISOString());

  return [
    'BEGIN:VEVENT',
    `UID:${uid}@lfx.linuxfoundation.org`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${escapeICSText(title)}`,
    'END:VEVENT',
  ].join('\r\n');
}

/**
 * Converts an array of meetings into VEVENT strings.
 * Recurring meetings are expanded per occurrence; cancelled occurrences are excluded.
 * Per-occurrence duration takes precedence over the parent meeting duration.
 */
export function meetingsToVEvents(meetings: Meeting[]): string[] {
  const events: string[] = [];

  for (const meeting of meetings) {
    if (meeting.occurrences && meeting.occurrences.length > 0) {
      for (const occ of meeting.occurrences) {
        if (occ.status === 'cancel') continue;
        events.push(buildVEvent(`${meeting.id}-${occ.occurrence_id}`, occ.title || meeting.title, occ.start_time, occ.duration ?? meeting.duration));
      }
    } else if (meeting.start_time) {
      events.push(buildVEvent(meeting.id, meeting.title, meeting.start_time, meeting.duration));
    }
  }

  return events;
}

/**
 * Wraps VEVENT strings in a VCALENDAR envelope and returns the complete ICS string.
 */
export function buildVCalendar(events: string[]): string {
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LFX//Committee Calendar//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...events, 'END:VCALENDAR'].join(
    '\r\n'
  );
}

/**
 * Fetches all pages of meetings by following page_token pagination.
 * Accepts a callback so the caller controls which service method and query params are used.
 */
export async function fetchAllMeetingPages(fetchPage: (pageToken?: string) => Promise<PaginatedResponse<Meeting>>): Promise<Meeting[]> {
  const results: Meeting[] = [];
  let pageToken: string | undefined = undefined;

  do {
    const result = await fetchPage(pageToken);
    results.push(...result.data);
    pageToken = result.page_token;
  } while (pageToken);

  return results;
}
