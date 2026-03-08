// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Committee, CommitteeMember, GroupInvite, GroupJoinApplication } from '@lfx-one/shared/interfaces';
import { CommitteeMemberRole, CommitteeMemberStatus, CommitteeMemberVotingStatus } from '@lfx-one/shared/enums';

// ── Committee Detail ────────────────────────────────────────────────────────

export const MOCK_COMMITTEE_ID = 'mock-committee-001';

export const mockCommittee: Committee = {
  uid: MOCK_COMMITTEE_ID,
  name: 'Technical Advisory Council',
  display_name: 'Technical Advisory Council',
  category: 'Technical',
  description: 'Provides technical oversight and guidance for all ASWF projects.',
  public: true,
  enable_voting: true,
  sso_group_enabled: false,
  total_members: 3,
  total_voting_reps: 2,
  project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
  project_name: 'Academy Software Foundation (ASWF)',
  join_mode: 'apply',
  writer: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-15T12:00:00Z',
};

// ── Committee Members ───────────────────────────────────────────────────────

export const mockCommitteeMembers: CommitteeMember[] = [
  {
    uid: 'mock-member-001',
    committee_uid: MOCK_COMMITTEE_ID,
    committee_name: 'Technical Advisory Council',
    email: 'alice@example.org',
    first_name: 'Alice',
    last_name: 'Smith',
    role: { name: CommitteeMemberRole.CHAIR },
    status: CommitteeMemberStatus.ACTIVE,
    voting: { status: CommitteeMemberVotingStatus.VOTING_REPRESENTATIVE },
    organization: { name: 'Acme Corp' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    uid: 'mock-member-002',
    committee_uid: MOCK_COMMITTEE_ID,
    committee_name: 'Technical Advisory Council',
    email: 'bob@example.org',
    first_name: 'Bob',
    last_name: 'Jones',
    role: { name: CommitteeMemberRole.NONE },
    status: CommitteeMemberStatus.ACTIVE,
    voting: { status: CommitteeMemberVotingStatus.VOTING_REPRESENTATIVE },
    organization: { name: 'Beta Inc' },
    created_at: '2024-02-15T00:00:00Z',
    updated_at: '2024-02-15T00:00:00Z',
  },
  {
    uid: 'mock-member-003',
    committee_uid: MOCK_COMMITTEE_ID,
    committee_name: 'Technical Advisory Council',
    email: 'carol@example.org',
    first_name: 'Carol',
    last_name: 'Williams',
    role: { name: CommitteeMemberRole.NONE },
    status: CommitteeMemberStatus.ACTIVE,
    voting: { status: CommitteeMemberVotingStatus.NONE },
    organization: { name: 'Gamma LLC' },
    created_at: '2024-03-10T00:00:00Z',
    updated_at: '2024-03-10T00:00:00Z',
  },
];

// ── Invites ─────────────────────────────────────────────────────────────────

export const mockPendingInvite: GroupInvite = {
  uid: 'mock-invite-001',
  committee_uid: MOCK_COMMITTEE_ID,
  invitee_email: 'dave@example.org',
  invitee_name: 'Dave Brown',
  invited_by_uid: 'mock-member-001',
  invited_by_name: 'Alice Smith',
  status: 'pending',
  message: 'We would love to have you on the TAC!',
  suggested_role: 'Member',
  created_at: '2024-06-01T00:00:00Z',
  expires_at: '2024-06-15T00:00:00Z',
};

// ── Join Applications ───────────────────────────────────────────────────────

export const mockPendingApplication: GroupJoinApplication = {
  uid: 'mock-application-001',
  committee_uid: MOCK_COMMITTEE_ID,
  applicant_email: 'eve@example.org',
  applicant_name: 'Eve Davis',
  applicant_uid: 'mock-user-eve',
  status: 'pending',
  reason: 'I have been contributing to ASWF projects for 2 years and would like to join the TAC.',
  created_at: '2024-06-10T00:00:00Z',
};

// Generated with [Claude Code](https://claude.ai/code)
