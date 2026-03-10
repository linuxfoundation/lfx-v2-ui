// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Committee, CommitteeActivity, CommitteeEvent, GroupMailingList, GroupChatChannel } from '@lfx-one/shared/interfaces';

const COMMITTEE_UID = 'cbf60a42-07db-4677-886c-2e51e9c82661';
const PROJECT_UID = 'a27394a3-7a6c-4d0f-9e0f-692d8753924f';

/**
 * Mock channel data for committees
 * Scoped to the AI Ethics & Governance Working Group
 */
export const mockMailingList: GroupMailingList = {
  name: 'ai-ethics-governance-wg',
  url: 'https://lists.lfx.linuxfoundation.org/g/ai-ethics-governance-wg',
  subscriber_count: 42,
};

export const mockChatChannel: GroupChatChannel = {
  platform: 'slack',
  name: '#ai-ethics-governance-wg',
  url: 'https://linuxfoundation.slack.com/archives/C08AIEGWG01',
};

/**
 * Partial committee data used to enrich real API responses with channel info
 */
export const mockCommitteeChannels: Pick<Committee, 'uid' | 'mailing_list' | 'chat_channel'> = {
  uid: COMMITTEE_UID,
  mailing_list: mockMailingList,
  chat_channel: mockChatChannel,
};

/**
 * Get channels data for a specific committee UID
 */
export function getMockCommitteeChannels(committeeUid: string): { mailing_list: GroupMailingList; chat_channel: GroupChatChannel } | undefined {
  if (committeeUid === COMMITTEE_UID) {
    return { mailing_list: mockMailingList, chat_channel: mockChatChannel };
  }
  return undefined;
}

/**
 * Mock recent-activity items for the AI Ethics & Governance Working Group.
 * Used by the dev-mock interceptor to populate the "Recent Activity" card.
 */
export const mockCommitteeActivity: CommitteeActivity[] = [
  {
    uid: 'act-001',
    type: 'pr_merged',
    title: 'Add bias-detection benchmarks to evaluation suite',
    author: 'Alice Chen',
    repo: 'lfx-governance/ai-ethics-framework',
    timestamp: '2026-03-09T22:15:00Z',
    icon: 'fa-light fa-code-pull-request',
    color: 'text-emerald-600',
  },
  {
    uid: 'act-002',
    type: 'discussion',
    title: 'RFC: Responsible-AI disclosure requirements for LLM providers',
    author: 'Bob Patel',
    repo: 'lfx-governance/ai-ethics-framework',
    timestamp: '2026-03-09T18:30:00Z',
    icon: 'fa-light fa-comments',
    color: 'text-blue-600',
  },
];

/**
 * Mock upcoming-event items for the AI Ethics & Governance Working Group.
 * Mirrors the two future-dated meetings in meetings.mock.ts.
 */
export const mockCommitteeEvents: CommitteeEvent[] = [
  {
    uid: 'evt-001',
    title: 'AI Ethics Framework Review',
    type: 'Virtual',
    date: '2026-03-20T21:00:00Z',
    speaker: 'Dr. Sarah Kim',
    attendees: 8,
  },
  {
    uid: 'evt-002',
    title: 'Monthly Governance Sync — April 2026',
    type: 'Virtual',
    date: '2026-04-18T17:00:00Z',
    speaker: 'Working Group Leads',
    attendees: 12,
  },
];

/**
 * Get mock activity for a specific committee UID
 */
export function getMockCommitteeActivity(committeeUid: string): CommitteeActivity[] {
  return committeeUid === COMMITTEE_UID ? mockCommitteeActivity : [];
}

/**
 * Get mock events for a specific committee UID
 */
export function getMockCommitteeEvents(committeeUid: string): CommitteeEvent[] {
  return committeeUid === COMMITTEE_UID ? mockCommitteeEvents : [];
}

/**
 * The api_client_service stores meetings with its own internal committee UUID
 * that differs from the external UID used by LFX_V2_SERVICE.
 * This constant is used by the dev-mock interceptor to correct the committee UID
 * in real meeting responses so the client-side committee filter can match.
 */
export const API_CLIENT_INTERNAL_COMMITTEE_UID = 'c1714f95-7361-4fcf-81a6-fdc289e7260b';

/**
 * Constants for use in tests
 */
export const MOCK_COMMITTEE_UID = COMMITTEE_UID;
export const MOCK_PROJECT_UID = PROJECT_UID;
