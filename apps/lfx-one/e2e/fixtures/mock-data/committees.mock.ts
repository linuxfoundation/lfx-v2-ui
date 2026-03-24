// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Committee, MyCommittee } from '@lfx-one/shared/interfaces';

/**
 * Mock committee data for Playwright tests
 * Covers various committee configurations: public/private, voting/no-voting, different join modes
 */

export const mockCommittees: Committee[] = [
  {
    uid: 'comm-001-tac',
    name: 'Technical Advisory Council',
    display_name: 'TAC',
    category: 'Oversight Committee',
    description: 'The TAC is responsible for technical oversight of all ASWF projects and working groups.',
    parent_uid: '',
    enable_voting: true,
    public: true,
    sso_group_enabled: false,
    website: 'https://tac.aswf.io',
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2026-03-20T00:00:00Z',
    total_members: 12,
    total_voting_repos: 8,
    project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
    project_name: 'Academy Software Foundation (ASWF)',
    join_mode: 'application',
    mailing_list: 'tac@lists.aswf.io',
    chat_channel: 'https://slack.aswf.io/tac',
    member_visibility: 'all' as never,
  },
  {
    uid: 'comm-002-board',
    name: 'Governing Board',
    category: 'Board',
    description: 'The Governing Board provides overall policy direction for the foundation.',
    parent_uid: '',
    enable_voting: true,
    public: false,
    sso_group_enabled: false,
    created_at: '2022-06-01T00:00:00Z',
    updated_at: '2026-03-18T00:00:00Z',
    total_members: 25,
    total_voting_repos: 20,
    project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
    project_name: 'Academy Software Foundation (ASWF)',
    join_mode: 'invite_only',
    mailing_list: 'board@lists.aswf.io',
    chat_channel: null,
    member_visibility: 'members_only' as never,
  },
  {
    uid: 'comm-003-wg-ci',
    name: 'CI Working Group',
    category: 'Working Group',
    description: 'Focused on continuous integration and build infrastructure for ASWF projects.',
    parent_uid: 'comm-001-tac',
    enable_voting: false,
    public: true,
    sso_group_enabled: false,
    website: 'https://github.com/AcademySoftwareFoundation/wg-ci',
    created_at: '2023-06-10T00:00:00Z',
    updated_at: '2026-03-15T00:00:00Z',
    total_members: 8,
    total_voting_repos: 0,
    project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
    project_name: 'Academy Software Foundation (ASWF)',
    join_mode: 'open',
    mailing_list: 'wg-ci@lists.aswf.io',
    chat_channel: 'https://slack.aswf.io/wg-ci',
  },
  {
    uid: 'comm-004-sig-docs',
    name: 'Documentation SIG',
    category: 'Special Interest Group',
    description: 'Special interest group for improving documentation across all projects.',
    parent_uid: '',
    enable_voting: false,
    public: true,
    sso_group_enabled: false,
    created_at: '2024-01-20T00:00:00Z',
    updated_at: '2026-02-28T00:00:00Z',
    total_members: 15,
    total_voting_repos: 0,
    project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
    project_name: 'Academy Software Foundation (ASWF)',
    join_mode: 'open',
    mailing_list: null,
    chat_channel: null,
  },
  {
    uid: 'comm-005-closed',
    name: 'Legal Committee',
    category: 'Oversight Committee',
    description: 'Handles legal review and IP compliance for the foundation.',
    parent_uid: '',
    enable_voting: true,
    public: false,
    sso_group_enabled: false,
    created_at: '2023-03-01T00:00:00Z',
    updated_at: '2026-03-10T00:00:00Z',
    total_members: 6,
    total_voting_repos: 6,
    project_uid: 'a09f1234-f567-4abc-b890-1234567890ab',
    project_name: 'Academy Software Foundation (ASWF)',
    join_mode: 'closed',
    mailing_list: 'legal@lists.aswf.io',
    chat_channel: null,
  },
];

export const mockMyCommittees: MyCommittee[] = [
  {
    ...mockCommittees[0],
    my_role: 'Chair',
    my_member_uid: 'member-001',
  },
  {
    ...mockCommittees[2],
    my_role: 'Member',
    my_member_uid: 'member-002',
  },
];

/**
 * Get a mock committee by UID
 */
export function getMockCommittee(uid: string): Committee | undefined {
  return mockCommittees.find((c) => c.uid === uid);
}

/**
 * Get all mock committees
 */
export function getAllMockCommittees(): Committee[] {
  return mockCommittees;
}

/**
 * Get user's committees
 */
export function getMyMockCommittees(): MyCommittee[] {
  return mockMyCommittees;
}

// Generated with [Claude Code](https://claude.ai/code)
