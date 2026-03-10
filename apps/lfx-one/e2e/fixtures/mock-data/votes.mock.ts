// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommitteeVote } from '@lfx-one/shared/interfaces';

const COMMITTEE_UID = 'cbf60a42-07db-4677-886c-2e51e9c82661';

/**
 * Mock committee votes for the AI Ethics & Governance Working Group.
 * Used by the dev-mock interceptor to populate the Votes tab.
 */
export const mockCommitteeVotes: CommitteeVote[] = [
  {
    uid: 'vote-001',
    title: 'Adopt AI Transparency Reporting Standard v1.2',
    status: 'open',
    deadline: '2026-04-05T23:59:59Z',
    votesFor: 5,
    votesAgainst: 1,
    votesAbstain: 0,
    totalEligible: 10,
    created_by: 'Alice Chen',
  },
  {
    uid: 'vote-002',
    title: 'Approve Q1 2026 AI Ethics WG Charter Amendment',
    status: 'closed',
    deadline: '2026-03-01T23:59:59Z',
    votesFor: 8,
    votesAgainst: 1,
    votesAbstain: 1,
    totalEligible: 10,
    created_by: 'Bob Patel',
  },
];

/**
 * Get mock votes for a specific committee UID
 */
export function getMockCommitteeVotes(committeeUid: string): CommitteeVote[] {
  return committeeUid === COMMITTEE_UID ? mockCommitteeVotes : [];
}
