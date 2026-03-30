// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Mock data for committee E2E tests.
 * Fields that the component doesn't read are omitted via type assertion.
 */

export const MOCK_COMMITTEE_UID = 'c0ffee00-1234-5678-abcd-000000000001';

export const mockCommittee = {
  uid: MOCK_COMMITTEE_UID,
  name: 'Technical Steering Committee',
  description: 'Technical governance body for the project.',
  slug: 'tsc',
  type: 'technical',
  meeting_type: 'technical',
  project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
  mailing_list: 'tsc@lists.example.org',
  chat_channel: 'https://slack.example.org/tsc',
  website: 'https://github.com/example/tsc',
  visibility: 'public',
  writer: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: new Date().toISOString(),
};

/**
 * Minimal meeting fixture — includes only fields the committee-meetings component reads.
 */
const makeMeeting = (id: string, title: string, daysFromNow: number, durationMinutes: number) => ({
  id,
  title,
  description: `${title} description`,
  start_time: new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString(),
  duration: durationMinutes,
  meeting_type: 'technical',
  visibility: 'public',
  occurrences: [],
  project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
  project_name: 'Academy Software Foundation',
  project_slug: 'aswf',
  timezone: 'UTC',
  recurrence: null,
  committees: [],
  restricted: false,
  recording_enabled: false,
  transcript_enabled: false,
  youtube_upload_enabled: false,
  artifact_visibility: null,
  organizers: [],
  password: null,
  invited: false,
  individual_registrants_count: 0,
  committee_members_count: 0,
  registrants_accepted_count: 0,
  registrants_declined_count: 0,
  registrants_pending_count: 0,
  created_at: '2024-01-01T00:00:00Z',
  modified_at: '2024-01-01T00:00:00Z',
});

export const mockMeetings = [
  makeMeeting('mtg-001', 'TSC Weekly Sync', 7, 60),
  makeMeeting('mtg-002', 'TSC Roadmap Review', 14, 90),
];

export const mockMeetingsResponse = {
  data: mockMeetings,
  metadata: { total_size: 2 },
  page_token: undefined,
};

// Generated with [Claude Code](https://claude.ai/code)
