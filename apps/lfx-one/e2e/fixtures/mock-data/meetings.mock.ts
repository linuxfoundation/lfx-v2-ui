// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ArtifactVisibility, MeetingType, MeetingVisibility, RecurrenceType } from '@lfx-one/shared/enums';
import { Meeting } from '@lfx-one/shared/interfaces';

const COMMITTEE_UID = 'cbf60a42-07db-4677-886c-2e51e9c82661';
const COMMITTEE_NAME = 'AI Ethics & Governance Working Group';
const PROJECT_UID = 'a27394a3-7a6c-4d0f-9e0f-692d8753924f';
const PROJECT_NAME = 'LFX Governance';
const PROJECT_SLUG = 'lfx-governance';

/**
 * Mock meeting data for Playwright tests
 * Scoped to the AI Ethics & Governance Working Group
 */
export const mockMeetings: Record<string, Meeting> = {
  'monthly-governance-sync': {
    id: 'mtg-001-monthly-governance-sync',
    created_at: '2026-01-15T10:00:00Z',
    modified_at: '2026-03-01T10:00:00Z',
    organizer: true,
    project_uid: PROJECT_UID,
    start_time: '2026-04-18T17:00:00Z', // April 18, 2026 10:00 AM PT
    duration: 60,
    timezone: 'America/Los_Angeles',
    title: 'Monthly Governance Sync \u2014 April 2026',
    description:
      'Monthly governance sync for the AI Ethics & Governance Working Group. Review progress on ethical AI guidelines, discuss open action items, and align on next steps.',
    platform: 'Zoom',
    recurrence: {
      type: RecurrenceType.MONTHLY,
      repeat_interval: 1,
      end_date_time: '2026-12-31T18:00:00Z',
    },
    committees: [{ uid: COMMITTEE_UID, name: COMMITTEE_NAME }],
    meeting_type: MeetingType.MAINTAINERS,
    visibility: MeetingVisibility.PRIVATE,
    restricted: false,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    artifact_visibility: ArtifactVisibility.MEETING_PARTICIPANTS,
    early_join_time_minutes: 5,
    organizers: ['admin-user'],
    password: null,
    zoom_config: null,
    invited: false,
    registrant_count: 12,
    individual_registrants_count: 3,
    committee_members_count: 9,
    registrants_accepted_count: 12,
    registrants_declined_count: 0,
    registrants_pending_count: 0,
    occurrences: [],
    project_name: PROJECT_NAME,
    project_slug: PROJECT_SLUG,
  },
  'ai-ethics-framework-review': {
    id: 'mtg-002-ai-ethics-framework-review',
    created_at: '2026-02-20T14:00:00Z',
    modified_at: '2026-03-05T14:00:00Z',
    organizer: true,
    project_uid: PROJECT_UID,
    start_time: '2026-03-20T21:00:00Z', // March 20, 2026 2:00 PM PT
    duration: 90,
    timezone: 'America/Los_Angeles',
    title: 'AI Ethics Framework Review',
    description: 'One-time deep-dive session to review and finalize the AI Ethics Framework v2 draft. All working group members are encouraged to attend.',
    platform: 'Zoom',
    recurrence: null,
    committees: [{ uid: COMMITTEE_UID, name: COMMITTEE_NAME }],
    meeting_type: MeetingType.MAINTAINERS,
    visibility: MeetingVisibility.PRIVATE,
    restricted: false,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    artifact_visibility: ArtifactVisibility.MEETING_PARTICIPANTS,
    early_join_time_minutes: 5,
    organizers: ['admin-user'],
    password: null,
    zoom_config: null,
    invited: false,
    registrant_count: 8,
    individual_registrants_count: 2,
    committee_members_count: 6,
    registrants_accepted_count: 8,
    registrants_declined_count: 1,
    registrants_pending_count: 0,
    occurrences: [],
    project_name: PROJECT_NAME,
    project_slug: PROJECT_SLUG,
  },
  'q1-retrospective': {
    id: 'mtg-003-q1-retrospective',
    created_at: '2026-02-01T11:00:00Z',
    modified_at: '2026-03-05T19:00:00Z',
    organizer: true,
    project_uid: PROJECT_UID,
    start_time: '2026-03-05T19:00:00Z', // March 5, 2026 11:00 AM PT
    duration: 60,
    timezone: 'America/Los_Angeles',
    title: 'Q1 2026 Retrospective',
    description: 'End-of-quarter retrospective for the AI Ethics & Governance Working Group. Review accomplishments, blockers, and plan improvements for Q2.',
    platform: 'Zoom',
    recurrence: null,
    committees: [{ uid: COMMITTEE_UID, name: COMMITTEE_NAME }],
    meeting_type: MeetingType.MAINTAINERS,
    visibility: MeetingVisibility.PRIVATE,
    restricted: false,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    artifact_visibility: ArtifactVisibility.MEETING_PARTICIPANTS,
    early_join_time_minutes: 5,
    organizers: ['admin-user'],
    password: null,
    zoom_config: null,
    invited: false,
    participant_count: 10,
    attended_count: 8,
    registrant_count: 11,
    individual_registrants_count: 3,
    committee_members_count: 8,
    registrants_accepted_count: 11,
    registrants_declined_count: 0,
    registrants_pending_count: 0,
    occurrences: [],
    project_name: PROJECT_NAME,
    project_slug: PROJECT_SLUG,
  },
};

/**
 * Get all mock meetings as an array
 */
export function getAllMockMeetings(): Meeting[] {
  return Object.values(mockMeetings);
}

/**
 * Get mock meetings filtered by project UID
 */
export function getMockMeetingsByProject(projectUid: string): Meeting[] {
  return getAllMockMeetings().filter((m) => m.project_uid === projectUid);
}

/**
 * Get mock meetings filtered by committee UID
 */
export function getMockMeetingsByCommittee(committeeUid: string): Meeting[] {
  return getAllMockMeetings().filter((m) => m.committees?.some((c) => c.uid === committeeUid));
}
