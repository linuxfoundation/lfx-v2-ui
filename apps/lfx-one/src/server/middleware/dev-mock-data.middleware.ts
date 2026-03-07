// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * DEV-ONLY: Mock data fallback for when upstream API is unreachable.
 *
 * Usage in server.ts:
 *   import { wrapWithMockFallback } from './middleware/dev-mock-data.middleware';
 *
 *   // Before mounting routes:
 *   wrapWithMockFallback(app);
 *
 * This adds fallback routes BEFORE the real routes for /api/projects and
 * /api/committees that first test if the upstream API is reachable. If it's
 * not, they serve mock data. If it is, they call next() to let the real
 * routes handle the request.
 */

import { Express, NextFunction, Request, Response } from 'express';

const isDev = process.env['ENV'] === 'development' || process.env['NODE_ENV'] === 'development';

// ── Mock Projects ──────────────────────────────────────────────────
const MOCK_PROJECTS = [
  {
    uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    name: 'The Linux Foundation',
    slug: 'the-linux-foundation',
    type: 'foundation',
    description: 'The Linux Foundation is a nonprofit organization enabling mass innovation through open source.',
    status: 'active',
  },
  {
    uid: 'a0941e50-3455-11ea-978f-2e728ce88125',
    name: 'Cloud Native Computing Foundation',
    slug: 'cloud-native-computing-foundation',
    type: 'foundation',
    description: 'CNCF hosts critical components of the global technology infrastructure.',
    status: 'active',
  },
  {
    uid: 'lfx-one-project-uid',
    name: 'LFX One',
    slug: 'lfx-one',
    type: 'project',
    description: 'Unified platform for open source project governance and collaboration.',
    status: 'active',
  },
];

// ── Mock Committees (diverse data to exercise all UI states) ───────
const MOCK_COMMITTEES = [
  {
    uid: 'mock-committee-001',
    name: 'Gold Member Voting Class',
    slug: 'gold-member-voting-class',
    description: 'Voting class for Gold-level member organizations with governance participation rights.',
    category: 'Board',
    status: 'active',
    public: true,
    enable_voting: true,
    total_members: 24,
    join_mode: 'invite-only',
    mailing_list: { name: 'gold-voting-class', url: 'https://lists.aaif.dev/g/gold-voting-class', subscriber_count: 24 },
    chat_channel: { platform: 'slack', name: '#gold-voting-class', url: 'https://aaif.slack.com/archives/C01GOLD' },
    created_at: '2023-06-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
    writer: true,
    // Chair/Co-Chair leadership data
    chair: {
      uid: 'mem-001',
      first_name: 'Sarah',
      last_name: 'Chen',
      email: 'sarah.chen@techcorp.com',
      organization: 'TechCorp',
      avatar_url: '',
      elected_date: '2024-01-15T00:00:00Z',
    },
    co_chair: {
      uid: 'mem-002',
      first_name: 'James',
      last_name: 'Rodriguez',
      email: 'jrodriguez@cloudio.dev',
      organization: 'Cloud.io',
      avatar_url: '',
      elected_date: '2024-01-15T00:00:00Z',
    },
  },
  {
    uid: 'mock-committee-002',
    name: 'Technical Advisory Council',
    slug: 'technical-advisory-council',
    description: 'Provides technical guidance and oversight for foundation projects and working groups.',
    category: 'Committee',
    status: 'active',
    public: true,
    enable_voting: true,
    total_members: 12,
    join_mode: 'apply',
    mailing_list: { name: 'tac-general', url: 'https://lists.aaif.dev/g/tac-general', subscriber_count: 45 },
    chat_channel: { platform: 'slack', name: '#tac-general', url: 'https://aaif.slack.com/archives/C02TAC' },
    created_at: '2023-03-10T08:00:00Z',
    updated_at: '2024-12-01T09:15:00Z',
    writer: true,
    chair: {
      uid: 'mem-010',
      first_name: 'Alex',
      last_name: 'Morgan',
      email: 'alex.morgan@techcorp.com',
      organization: 'TechCorp',
      avatar_url: '',
      elected_date: '2023-06-01T00:00:00Z',
    },
    co_chair: null, // No co-chair — sole nominee scenario (like Security & Privacy WG)
  },
  {
    uid: 'mock-committee-003',
    name: 'Outreach Committee',
    slug: 'outreach-committee',
    description: '',
    category: 'Committee',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 8,
    mailing_list: { name: 'outreach', url: 'https://lists.aaif.dev/g/outreach', subscriber_count: 18 },
    chat_channel: { platform: 'slack', name: '#outreach', url: 'https://aaif.slack.com/archives/C03OUTREACH' },
    created_at: '2023-09-22T11:00:00Z',
    updated_at: '2024-10-05T16:45:00Z',
    writer: true,
    chair: null, // No chair — tests vacant state
    co_chair: null,
  },
  {
    uid: 'mock-committee-004',
    name: 'Security Working Group',
    slug: 'security-working-group',
    description: 'Coordinates security initiatives, vulnerability disclosure, and security best practices.',
    category: 'Working Group',
    status: 'active',
    public: false,
    enable_voting: true,
    total_members: 15,
    mailing_list: { name: 'security-wg', url: 'https://lists.aaif.dev/g/security-wg', subscriber_count: 38 },
    chat_channel: { platform: 'slack', name: '#security-wg', url: 'https://aaif.slack.com/archives/C04SECWG' },
    created_at: '2024-01-08T14:00:00Z',
    updated_at: '2024-12-15T10:20:00Z',
    writer: false,
    chair: {
      uid: 'mem-030',
      first_name: 'Anna',
      last_name: 'Kowalski',
      email: 'anna.k@securityfirst.io',
      organization: 'SecurityFirst',
      avatar_url: '',
      elected_date: '2024-03-01T00:00:00Z',
    },
    co_chair: {
      uid: 'mem-031',
      first_name: 'Marcus',
      last_name: 'Johnson',
      email: 'mjohnson@cybershield.io',
      organization: 'CyberShield',
      avatar_url: '',
      elected_date: '2024-03-01T00:00:00Z',
    },
  },
  {
    uid: 'mock-committee-005',
    name: 'Diversity & Inclusion Council',
    slug: 'diversity-inclusion-council',
    description: 'Promotes diversity and inclusion across foundation projects and governance.',
    category: 'Committee',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 10,
    mailing_list: { name: 'diversity-council', url: 'https://lists.aaif.dev/g/diversity-council', subscriber_count: 30 },
    chat_channel: { platform: 'discord', name: '#diversity-council', url: 'https://discord.gg/aaif-diversity' },
    created_at: '2023-07-01T09:00:00Z',
    updated_at: '2024-11-28T13:00:00Z',
    writer: true,
    chair: {
      uid: 'mem-020',
      first_name: 'Maria',
      last_name: 'Garcia',
      email: 'mgarcia@outreach.org',
      organization: 'Community Outreach',
      avatar_url: '',
      elected_date: '2024-06-01T00:00:00Z',
    },
    co_chair: null,
  },
  {
    uid: 'mock-committee-006',
    name: 'Silver Member Voting Class',
    slug: 'silver-member-voting-class',
    description: 'Voting class for Silver-level member organizations.',
    category: 'Board',
    status: 'active',
    public: true,
    enable_voting: true,
    total_members: 42,
    mailing_list: { name: 'silver-voting-class', url: 'https://lists.aaif.dev/g/silver-voting-class', subscriber_count: 42 },
    chat_channel: { platform: 'slack', name: '#silver-voting-class', url: 'https://aaif.slack.com/archives/C06SILVER' },
    created_at: '2023-06-15T10:00:00Z',
    updated_at: '2024-11-25T11:30:00Z',
    writer: true,
    chair: {
      uid: 'mem-040',
      first_name: 'Ilya',
      last_name: 'Grigorik',
      email: 'ilya@shopify.com',
      organization: 'Shopify',
      avatar_url: '',
      elected_date: '2026-02-26T00:00:00Z',
    },
    co_chair: {
      uid: 'mem-041',
      first_name: 'Rahul',
      last_name: 'Bansal',
      email: 'rb@openai.com',
      organization: 'OpenAI',
      avatar_url: '',
      elected_date: '2026-02-26T00:00:00Z',
    },
  },
  {
    uid: 'mock-committee-007',
    name: 'Budget Review Committee',
    slug: 'budget-review-committee',
    description: '',
    category: 'Committee',
    status: 'active',
    public: false,
    enable_voting: false,
    total_members: 6,
    mailing_list: { name: 'budget-review', url: 'https://lists.aaif.dev/g/budget-review', subscriber_count: 8 },
    chat_channel: { platform: 'slack', name: '#budget-review', url: 'https://aaif.slack.com/archives/C07BUDGET' },
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-12-10T08:00:00Z',
    writer: false,
    chair: null,
    co_chair: null,
  },
  // ── Oversight Committee (TSC → oversight-committee) ──
  {
    uid: 'mock-committee-008',
    name: 'Technical Steering Committee',
    slug: 'technical-steering-committee',
    description: 'Oversees technical direction, project lifecycle, and cross-project architecture decisions.',
    category: 'TSC',
    status: 'active',
    public: true,
    enable_voting: true,
    total_members: 9,
    mailing_list: { name: 'tsc', url: 'https://lists.aaif.dev/g/tsc', subscriber_count: 22 },
    chat_channel: { platform: 'slack', name: '#tsc', url: 'https://aaif.slack.com/archives/C08TSC' },
    created_at: '2023-01-20T10:00:00Z',
    updated_at: '2026-02-15T11:00:00Z',
    writer: true,
    chair: {
      uid: 'mem-050',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'priya@cloudnative.dev',
      organization: 'CloudNative Dev',
      avatar_url: '',
      elected_date: '2025-06-01T00:00:00Z',
    },
    co_chair: null,
  },
  // ── Special Interest Group (SIG → special-interest-group) ──
  {
    uid: 'mock-committee-009',
    name: 'Supply Chain Security SIG',
    slug: 'supply-chain-security-sig',
    description: 'Community forum for discussing software supply chain security practices, tooling, and standards.',
    category: 'SIG',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 64,
    join_mode: 'open',
    mailing_list: { name: 'supply-chain-sig', url: 'https://lists.aaif.dev/g/supply-chain-sig', subscriber_count: 85 },
    chat_channel: { platform: 'discord', name: '#supply-chain-sig', url: 'https://discord.gg/aaif-supplychain' },
    created_at: '2024-06-01T09:00:00Z',
    updated_at: '2026-03-01T14:00:00Z',
    writer: true,
    chair: {
      uid: 'mem-060',
      first_name: 'Lena',
      last_name: 'Schmidt',
      email: 'lena@sbom-tools.io',
      organization: 'SBOM Tools',
      avatar_url: '',
      elected_date: '2025-01-15T00:00:00Z',
    },
    co_chair: {
      uid: 'mem-061',
      first_name: 'Raj',
      last_name: 'Patel',
      email: 'raj@sigstore.dev',
      organization: 'Sigstore',
      avatar_url: '',
      elected_date: '2025-01-15T00:00:00Z',
    },
  },
  // ── Ambassador Program (Ambassador → ambassador-program) ──
  {
    uid: 'mock-committee-010',
    name: 'Ambassador Program',
    slug: 'ambassador-program',
    description: 'Coordinates outreach campaigns, ambassador referrals, and community engagement metrics.',
    category: 'Ambassador',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 24,
    mailing_list: { name: 'ambassadors', url: 'https://lists.aaif.dev/g/ambassadors', subscriber_count: 150 },
    chat_channel: { platform: 'discord', name: '#ambassadors', url: 'https://discord.gg/aaif-ambassadors' },
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2026-02-20T16:30:00Z',
    writer: true,
    chair: {
      uid: 'mem-070',
      first_name: 'Carlos',
      last_name: 'Rivera',
      email: 'carlos@communityops.org',
      organization: 'CommunityOps',
      avatar_url: '',
      elected_date: '2025-03-01T00:00:00Z',
    },
    co_chair: null,
  },
];

// ── Mock Members (per committee) ──────────────────────────────────
const MOCK_MEMBERS_BY_COMMITTEE: Record<string, any[]> = {
  'mock-committee-001': [
    {
      uid: 'mem-001',
      first_name: 'Sarah',
      last_name: 'Chen',
      email: 'sarah.chen@techcorp.com',
      organization: { name: 'TechCorp', website: 'https://techcorp.example.com' },
      role: { name: 'Chair' },
      voting: { status: 'Active' },
      created_at: '2023-07-01T10:00:00Z',
    },
    {
      uid: 'mem-002',
      first_name: 'James',
      last_name: 'Rodriguez',
      email: 'jrodriguez@cloudio.dev',
      organization: { name: 'Cloud.io', website: 'https://cloudio.dev' },
      role: { name: 'Vice Chair' },
      voting: { status: 'Active' },
      created_at: '2023-07-15T10:00:00Z',
    },
    {
      uid: 'mem-003',
      first_name: 'Aisha',
      last_name: 'Patel',
      email: 'aisha@dataflow.ai',
      organization: { name: 'DataFlow AI', website: 'https://dataflow.ai' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-08-01T10:00:00Z',
    },
    {
      uid: 'mem-004',
      first_name: 'Michael',
      last_name: 'Thompson',
      email: 'm.thompson@netscale.io',
      organization: { name: 'NetScale', website: 'https://netscale.io' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-08-10T10:00:00Z',
    },
    {
      uid: 'mem-005',
      first_name: 'Emily',
      last_name: 'Nakamura',
      email: 'emily.n@opensys.org',
      organization: { name: 'OpenSys Foundation' },
      role: { name: 'Member' },
      voting: { status: 'Inactive' },
      created_at: '2023-09-01T10:00:00Z',
    },
    {
      uid: 'mem-006',
      first_name: 'David',
      last_name: 'Kim',
      email: 'dkim@infraworks.com',
      organization: { name: 'InfraWorks', website: 'https://infraworks.com' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-09-15T10:00:00Z',
    },
    {
      uid: 'mem-007',
      first_name: 'Lisa',
      last_name: 'Andersson',
      email: 'lisa.a@nordictech.se',
      organization: { name: 'NordicTech' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-10-01T10:00:00Z',
    },
    {
      uid: 'mem-008',
      first_name: 'Raj',
      last_name: 'Gupta',
      email: 'raj@cybershield.io',
      organization: { name: 'CyberShield', website: 'https://cybershield.io' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-10-20T10:00:00Z',
    },
  ],
  'mock-committee-002': [
    {
      uid: 'mem-010',
      first_name: 'Alex',
      last_name: 'Morgan',
      email: 'alex.morgan@techcorp.com',
      organization: { name: 'TechCorp', website: 'https://techcorp.example.com' },
      role: { name: 'Chair' },
      voting: { status: 'Active' },
      created_at: '2023-04-01T10:00:00Z',
    },
    {
      uid: 'mem-011',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'priya@cloudnative.dev',
      organization: { name: 'CloudNative Dev', website: 'https://cloudnative.dev' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-05-15T10:00:00Z',
    },
    {
      uid: 'mem-012',
      first_name: 'Tom',
      last_name: 'Baker',
      email: 'tbaker@opensys.org',
      organization: { name: 'OpenSys Foundation' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-06-01T10:00:00Z',
    },
  ],
  'mock-committee-003': [
    {
      uid: 'mem-020',
      first_name: 'Maria',
      last_name: 'Garcia',
      email: 'mgarcia@outreach.org',
      organization: { name: 'Community Outreach' },
      created_at: '2023-10-01T10:00:00Z',
    },
    {
      uid: 'mem-021',
      first_name: 'Chen',
      last_name: 'Wei',
      email: 'chen.wei@techcorp.com',
      organization: { name: 'TechCorp', website: 'https://techcorp.example.com' },
      created_at: '2023-11-01T10:00:00Z',
    },
  ],
  'mock-committee-004': [
    {
      uid: 'mem-030',
      first_name: 'Anna',
      last_name: 'Kowalski',
      email: 'anna.k@securityfirst.io',
      organization: { name: 'SecurityFirst', website: 'https://securityfirst.io' },
      role: { name: 'Chair' },
      voting: { status: 'Active' },
      created_at: '2024-02-01T10:00:00Z',
    },
    {
      uid: 'mem-031',
      first_name: 'Marcus',
      last_name: 'Johnson',
      email: 'mjohnson@cybershield.io',
      organization: { name: 'CyberShield', website: 'https://cybershield.io' },
      role: { name: 'Vice Chair' },
      voting: { status: 'Active' },
      created_at: '2024-02-15T10:00:00Z',
    },
    {
      uid: 'mem-032',
      first_name: 'Yuki',
      last_name: 'Tanaka',
      email: 'yuki@cloudnative.dev',
      organization: { name: 'CloudNative Dev', website: 'https://cloudnative.dev' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2024-03-01T10:00:00Z',
    },
    {
      uid: 'mem-033',
      first_name: 'Omar',
      last_name: 'Hassan',
      email: 'omar@netscale.io',
      organization: { name: 'NetScale', website: 'https://netscale.io' },
      role: { name: 'Member' },
      voting: { status: 'Inactive' },
      created_at: '2024-03-20T10:00:00Z',
    },
  ],
  // ── Oversight Committee (TSC) members ──
  'mock-committee-008': [
    {
      uid: 'mem-050',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'priya@cloudnative.dev',
      organization: { name: 'CloudNative Dev', website: 'https://cloudnative.dev' },
      role: { name: 'Chair' },
      voting: { status: 'Active' },
      created_at: '2023-02-01T10:00:00Z',
    },
    {
      uid: 'mem-051',
      first_name: 'Tom',
      last_name: 'Baker',
      email: 'tbaker@opensys.org',
      organization: { name: 'OpenSys Foundation' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-03-01T10:00:00Z',
    },
    {
      uid: 'mem-052',
      first_name: 'Yuki',
      last_name: 'Tanaka',
      email: 'yuki@cloudnative.dev',
      organization: { name: 'CloudNative Dev', website: 'https://cloudnative.dev' },
      role: { name: 'Member' },
      voting: { status: 'Active' },
      created_at: '2023-04-01T10:00:00Z',
    },
  ],
  // ── SIG members ──
  'mock-committee-009': [
    {
      uid: 'mem-060',
      first_name: 'Lena',
      last_name: 'Schmidt',
      email: 'lena@sbom-tools.io',
      organization: { name: 'SBOM Tools', website: 'https://sbom-tools.io' },
      role: { name: 'Chair' },
      created_at: '2024-06-15T10:00:00Z',
    },
    {
      uid: 'mem-061',
      first_name: 'Raj',
      last_name: 'Patel',
      email: 'raj@sigstore.dev',
      organization: { name: 'Sigstore', website: 'https://sigstore.dev' },
      role: { name: 'Co-Chair' },
      created_at: '2024-06-15T10:00:00Z',
    },
    {
      uid: 'mem-062',
      first_name: 'Maria',
      last_name: 'Garcia',
      email: 'mgarcia@outreach.org',
      organization: { name: 'Community Outreach' },
      role: { name: 'Member' },
      created_at: '2024-07-01T10:00:00Z',
    },
  ],
  // ── Membership Class (Ambassador Program) members ──
  'mock-committee-010': [
    {
      uid: 'mem-070',
      first_name: 'Carlos',
      last_name: 'Rivera',
      email: 'carlos@communityops.org',
      organization: { name: 'CommunityOps', website: 'https://communityops.org' },
      role: { name: 'Chair' },
      created_at: '2024-02-15T10:00:00Z',
    },
    {
      uid: 'mem-071',
      first_name: 'Aisha',
      last_name: 'Patel',
      email: 'aisha@dataflow.ai',
      organization: { name: 'DataFlow AI', website: 'https://dataflow.ai' },
      role: { name: 'Member' },
      created_at: '2024-03-01T10:00:00Z',
    },
  ],
};

// ── Mock Meetings (associated with committees) ──────────────────────
const now = new Date();
const futureDate = (daysFromNow: number, hour: number = 10) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const MOCK_MEETINGS: any[] = [
  {
    id: 'mock-meeting-001',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'Gold Member Voting Class — Monthly Governance Meeting',
    description: 'Regular monthly governance meeting for Gold-level voting members.',
    start_time: futureDate(3, 14),
    duration: 60,
    timezone: 'America/New_York',
    meeting_type: 'Board',
    visibility: 'private',
    restricted: true,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-001', name: 'Gold Member Voting Class' }],
    recurrence: { type: 2, repeat_interval: 1, weekly_days: '3' },
    occurrences: [],
    organizers: ['sarah.chen@techcorp.com'],
    invited: false,
    individual_registrants_count: 0,
    committee_members_count: 24,
    registrants_accepted_count: 18,
    registrants_declined_count: 2,
    registrants_pending_count: 4,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2024-01-15T00:00:00Z',
    modified_at: '2024-12-01T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
  {
    id: 'mock-meeting-002',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'TAC Weekly Sync',
    description: 'Technical Advisory Council weekly sync to review project proposals and technical direction.',
    start_time: futureDate(1, 11),
    duration: 45,
    timezone: 'America/Los_Angeles',
    meeting_type: 'Technical',
    visibility: 'public',
    restricted: false,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: true,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-002', name: 'Technical Advisory Council' }],
    recurrence: { type: 2, repeat_interval: 1, weekly_days: '2' },
    occurrences: [],
    organizers: ['alex.morgan@techcorp.com'],
    invited: false,
    individual_registrants_count: 0,
    committee_members_count: 12,
    registrants_accepted_count: 10,
    registrants_declined_count: 0,
    registrants_pending_count: 2,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2023-04-01T00:00:00Z',
    modified_at: '2024-12-10T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
  {
    id: 'mock-meeting-003',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'Security WG — Vulnerability Disclosure Review',
    description: 'Bi-weekly meeting to review pending vulnerability disclosures and coordinate responses.',
    start_time: futureDate(5, 9),
    duration: 60,
    timezone: 'America/New_York',
    meeting_type: 'Technical',
    visibility: 'private',
    restricted: true,
    recording_enabled: false,
    transcript_enabled: false,
    youtube_upload_enabled: false,
    show_meeting_attendees: false,
    committees: [{ uid: 'mock-committee-004', name: 'Security Working Group' }],
    recurrence: { type: 2, repeat_interval: 2, weekly_days: '4' },
    occurrences: [],
    organizers: ['anna.k@securityfirst.io'],
    invited: false,
    individual_registrants_count: 0,
    committee_members_count: 15,
    registrants_accepted_count: 12,
    registrants_declined_count: 1,
    registrants_pending_count: 2,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2024-02-01T00:00:00Z',
    modified_at: '2024-12-15T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
  {
    id: 'mock-meeting-004',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'Security WG — Chair Onboarding Call',
    description: 'Onboarding session for newly elected Security WG Chair.',
    start_time: futureDate(7, 15),
    duration: 30,
    timezone: 'America/New_York',
    meeting_type: 'Maintainers',
    visibility: 'private',
    restricted: true,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-004', name: 'Security Working Group' }],
    recurrence: null,
    occurrences: [],
    organizers: ['anna.k@securityfirst.io'],
    invited: false,
    individual_registrants_count: 2,
    committee_members_count: 0,
    registrants_accepted_count: 2,
    registrants_declined_count: 0,
    registrants_pending_count: 0,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2024-12-01T00:00:00Z',
    modified_at: '2024-12-15T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
  {
    id: 'mock-meeting-005',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'Gold Member Voting Class — Budget Planning',
    description: 'Special session for annual budget review and planning.',
    start_time: futureDate(10, 16),
    duration: 90,
    timezone: 'America/New_York',
    meeting_type: 'Board',
    visibility: 'private',
    restricted: true,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-001', name: 'Gold Member Voting Class' }],
    recurrence: null,
    occurrences: [],
    organizers: ['sarah.chen@techcorp.com'],
    invited: false,
    individual_registrants_count: 0,
    committee_members_count: 24,
    registrants_accepted_count: 20,
    registrants_declined_count: 1,
    registrants_pending_count: 3,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2024-12-01T00:00:00Z',
    modified_at: '2024-12-15T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
  // ── TSC meeting ──
  {
    id: 'mock-meeting-006',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'TSC — Monthly Architecture Review',
    description: 'Monthly review of cross-project architecture decisions and project lifecycle stage gates.',
    start_time: futureDate(4, 11),
    duration: 60,
    timezone: 'America/Los_Angeles',
    meeting_type: 'Technical',
    visibility: 'public',
    restricted: false,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: true,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-008', name: 'Technical Steering Committee' }],
    recurrence: { type: 2, repeat_interval: 1, weekly_days: '4' },
    occurrences: [],
    organizers: ['priya@cloudnative.dev'],
    invited: false,
    individual_registrants_count: 0,
    committee_members_count: 9,
    registrants_accepted_count: 8,
    registrants_declined_count: 0,
    registrants_pending_count: 1,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2023-02-01T00:00:00Z',
    modified_at: '2026-02-15T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
  // ── SIG meeting ──
  {
    id: 'mock-meeting-007',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'Supply Chain Security SIG — Bi-Weekly Sync',
    description: 'Open discussion on supply chain security tooling, standards, and community updates.',
    start_time: futureDate(2, 16),
    duration: 45,
    timezone: 'America/New_York',
    meeting_type: 'Technical',
    visibility: 'public',
    restricted: false,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: true,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-009', name: 'Supply Chain Security SIG' }],
    recurrence: { type: 2, repeat_interval: 2, weekly_days: '3' },
    occurrences: [],
    organizers: ['lena@sbom-tools.io'],
    invited: false,
    individual_registrants_count: 0,
    committee_members_count: 64,
    registrants_accepted_count: 42,
    registrants_declined_count: 5,
    registrants_pending_count: 17,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2024-06-15T00:00:00Z',
    modified_at: '2026-03-01T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
  // ── Ambassador Program meeting ──
  {
    id: 'mock-meeting-008',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    title: 'Ambassador Program — Monthly Standup',
    description: 'Monthly sync to review outreach campaign metrics, ambassador referrals, and upcoming events.',
    start_time: futureDate(6, 10),
    duration: 30,
    timezone: 'America/Chicago',
    meeting_type: null,
    visibility: 'public',
    restricted: false,
    recording_enabled: true,
    transcript_enabled: false,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-010', name: 'Ambassador Program' }],
    recurrence: { type: 2, repeat_interval: 4, weekly_days: '2' },
    occurrences: [],
    organizers: ['carlos@communityops.org'],
    invited: false,
    individual_registrants_count: 0,
    committee_members_count: 24,
    registrants_accepted_count: 18,
    registrants_declined_count: 2,
    registrants_pending_count: 4,
    public_link: '',
    password: null,
    artifact_visibility: null,
    platform: 'Zoom',
    created_at: '2024-02-15T00:00:00Z',
    modified_at: '2026-02-20T00:00:00Z',
    project_name: 'The Linux Foundation',
    project_slug: 'the-linux-foundation',
  },
];

// ── Mock Documents (per committee) ──────────────────────────────────
const MOCK_DOCUMENTS_BY_COMMITTEE: Record<string, any[]> = {
  'mock-committee-001': [
    {
      uid: 'doc-001',
      name: 'Gold Member Charter v3.2',
      type: 'file',
      mime_type: 'application/pdf',
      file_size: 245_000,
      uploaded_by: 'Sarah Chen',
      created_at: '2024-06-15T10:00:00Z',
      updated_at: '2024-11-20T14:30:00Z',
      url: '#',
    },
    {
      uid: 'doc-002',
      name: 'Voting Procedures & Bylaws',
      type: 'file',
      mime_type: 'application/pdf',
      file_size: 189_000,
      uploaded_by: 'James Rodriguez',
      created_at: '2024-03-10T08:00:00Z',
      updated_at: '2024-09-01T09:15:00Z',
      url: '#',
    },
    {
      uid: 'doc-003',
      name: 'Q4 2024 Board Meeting Minutes',
      type: 'file',
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 78_500,
      uploaded_by: 'Aisha Patel',
      created_at: '2024-12-18T16:00:00Z',
      updated_at: '2024-12-18T16:00:00Z',
      url: '#',
    },
    {
      uid: 'doc-004',
      name: '2025 Budget Proposal',
      type: 'file',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 142_000,
      uploaded_by: 'Sarah Chen',
      created_at: '2025-01-05T10:00:00Z',
      updated_at: '2025-01-12T11:30:00Z',
      url: '#',
    },
    {
      uid: 'doc-005',
      name: 'LF Governance Wiki',
      type: 'link',
      mime_type: null,
      file_size: null,
      uploaded_by: 'James Rodriguez',
      created_at: '2024-08-01T10:00:00Z',
      updated_at: '2024-08-01T10:00:00Z',
      url: 'https://wiki.linuxfoundation.org/governance',
    },
  ],
  'mock-committee-002': [
    {
      uid: 'doc-010',
      name: 'TAC Charter',
      type: 'file',
      mime_type: 'application/pdf',
      file_size: 156_000,
      uploaded_by: 'Alex Morgan',
      created_at: '2023-04-15T10:00:00Z',
      updated_at: '2024-06-01T09:00:00Z',
      url: '#',
    },
    {
      uid: 'doc-011',
      name: 'Project Incubation Guidelines',
      type: 'file',
      mime_type: 'application/pdf',
      file_size: 312_000,
      uploaded_by: 'Priya Sharma',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-10-15T14:00:00Z',
      url: '#',
    },
    {
      uid: 'doc-012',
      name: 'Technical Roadmap 2025',
      type: 'file',
      mime_type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      file_size: 2_450_000,
      uploaded_by: 'Alex Morgan',
      created_at: '2025-01-10T10:00:00Z',
      updated_at: '2025-01-10T10:00:00Z',
      url: '#',
    },
    {
      uid: 'doc-013',
      name: 'GitHub Org Policy',
      type: 'link',
      mime_type: null,
      file_size: null,
      uploaded_by: 'Tom Baker',
      created_at: '2024-05-01T10:00:00Z',
      updated_at: '2024-05-01T10:00:00Z',
      url: 'https://github.com/lf-governance/policies',
    },
  ],
  'mock-committee-004': [
    {
      uid: 'doc-020',
      name: 'Vulnerability Disclosure Policy',
      type: 'file',
      mime_type: 'application/pdf',
      file_size: 198_000,
      uploaded_by: 'Anna Kowalski',
      created_at: '2024-02-15T10:00:00Z',
      updated_at: '2024-11-01T09:00:00Z',
      url: '#',
    },
    {
      uid: 'doc-021',
      name: 'Security Incident Response Playbook',
      type: 'file',
      mime_type: 'application/pdf',
      file_size: 425_000,
      uploaded_by: 'Marcus Johnson',
      created_at: '2024-04-01T10:00:00Z',
      updated_at: '2024-12-05T14:00:00Z',
      url: '#',
    },
    {
      uid: 'doc-022',
      name: 'CVE Tracking Spreadsheet',
      type: 'file',
      mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      file_size: 89_000,
      uploaded_by: 'Yuki Tanaka',
      created_at: '2024-10-01T10:00:00Z',
      updated_at: '2025-01-15T11:00:00Z',
      url: '#',
    },
    {
      uid: 'doc-023',
      name: 'OpenSSF Scorecard Dashboard',
      type: 'link',
      mime_type: null,
      file_size: null,
      uploaded_by: 'Anna Kowalski',
      created_at: '2024-06-01T10:00:00Z',
      updated_at: '2024-06-01T10:00:00Z',
      url: 'https://scorecard.dev',
    },
  ],
};

// Default members for committees without specific mock data
const DEFAULT_MOCK_MEMBERS = [
  {
    uid: 'mem-default-1',
    first_name: 'Jane',
    last_name: 'Doe',
    email: 'jane.doe@example.com',
    organization: { name: 'Example Corp' },
    created_at: '2024-01-01T10:00:00Z',
  },
  {
    uid: 'mem-default-2',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    organization: { name: 'Sample Inc', website: 'https://sample.example.com' },
    created_at: '2024-02-01T10:00:00Z',
  },
];

// Returns true if the ID belongs to our mock data store
function isMockId(id: string): boolean {
  return id.startsWith('mock-');
}

// Quick connectivity check — cached per minute
let lastCheckTime = 0;
let lastCheckResult = false;
const CHECK_INTERVAL_MS = 60_000; // Re-check every 60 seconds

async function isUpstreamReachable(): Promise<boolean> {
  const now = Date.now();
  if (now - lastCheckTime < CHECK_INTERVAL_MS) {
    return lastCheckResult;
  }

  const apiBase = process.env['LFX_V2_SERVICE'] || 'https://api.lfx.dev';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${apiBase}/query/resources?type=project&limit=1&v=1`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    lastCheckResult = resp.ok;
  } catch {
    lastCheckResult = false;
  }
  lastCheckTime = now;
  return lastCheckResult;
}

/**
 * Mount mock-data fallback routes before the real API routes.
 * Only active when ENV=development.
 */
export function wrapWithMockFallback(app: Express): void {
  if (!isDev) {
    return;
  }

  console.log('[DEV MOCK] Mock data fallback enabled — will serve mock data when upstream API is unreachable');

  // Fallback for GET /api/projects
  app.get('/api/projects', async (_req: Request, res: Response, next: NextFunction) => {
    const reachable = await isUpstreamReachable();
    if (reachable) {
      return next(); // Let the real route handle it
    }
    console.log('[DEV MOCK] Upstream unreachable → serving mock projects');
    res.json(MOCK_PROJECTS);
  });

  // Fallback for GET /api/committees
  app.get('/api/committees', async (_req: Request, res: Response, next: NextFunction) => {
    const reachable = await isUpstreamReachable();
    if (reachable) {
      return next(); // Let the real route handle it
    }
    console.log('[DEV MOCK] Upstream unreachable → serving mock committees');
    res.json(MOCK_COMMITTEES);
  });

  // Fallback for GET /public/api/committees (no auth required)
  app.get('/public/api/committees', async (_req: Request, res: Response, next: NextFunction) => {
    const reachable = await isUpstreamReachable();
    if (reachable) {
      return next();
    }
    console.log('[DEV MOCK] Upstream unreachable → serving mock public committees');
    const publicCommittees = MOCK_COMMITTEES.filter((c: any) => c.public !== false);
    res.json(publicCommittees);
  });

  // Fallback for GET /api/meetings
  app.get('/api/meetings', async (req: Request, res: Response, next: NextFunction) => {
    const reachable = await isUpstreamReachable();
    if (reachable) {
      return next();
    }
    console.log('[DEV MOCK] Upstream unreachable → serving mock meetings');
    // Filter by project_uid tag if provided (matches MeetingService.getMeetingsByProject)
    const tags = req.query['tags'] as string | undefined;
    let filtered = MOCK_MEETINGS;
    if (tags) {
      const projectUid = tags.replace('project_uid:', '');
      filtered = MOCK_MEETINGS.filter((m: any) => m.project_uid === projectUid);
    }
    res.json({ data: filtered, page_token: undefined });
  });

  // Fallback for GET /api/meetings/count
  app.get('/api/meetings/count', async (req: Request, res: Response, next: NextFunction) => {
    const reachable = await isUpstreamReachable();
    if (reachable) {
      return next();
    }
    const tags = req.query['tags'] as string | undefined;
    let filtered = MOCK_MEETINGS;
    if (tags) {
      const projectUid = tags.replace('project_uid:', '');
      filtered = MOCK_MEETINGS.filter((m: any) => m.project_uid === projectUid);
    }
    res.json({ count: filtered.length });
  });

  // Fallback for GET /api/committees/count
  app.get('/api/committees/count', async (_req: Request, res: Response, next: NextFunction) => {
    const reachable = await isUpstreamReachable();
    if (reachable) {
      return next();
    }
    console.log('[DEV MOCK] Upstream unreachable → serving mock committees count');
    res.json({ count: MOCK_COMMITTEES.length });
  });

  // Fallback for GET /api/committees/my (current user's committees)
  // Must be registered BEFORE /api/committees/:id to avoid "my" matching as an :id param
  app.get('/api/committees/my', async (_req: Request, res: Response, next: NextFunction) => {
    const reachable = await isUpstreamReachable();
    if (reachable) {
      return next();
    }
    console.log('[DEV MOCK] Upstream unreachable → serving mock my-committees');
    const myCommitteeUids = ['mock-committee-010', 'mock-committee-007', 'mock-committee-005'];
    const roles = ['Member', 'Member', 'Member'];
    const myCommittees = myCommitteeUids
      .map((uid, i) => {
        const committee = MOCK_COMMITTEES.find((c: any) => c.uid === uid);
        return committee ? { ...committee, myRole: roles[i], myMemberUid: `my-mem-${i + 1}` } : null;
      })
      .filter(Boolean);
    res.json(myCommittees);
  });

  // Fallback for GET /api/committees/:id/members
  // Serves mock data if: (a) mock members exist, (b) mock ID, or (c) upstream unreachable
  app.get('/api/committees/:id/members', async (req: Request, res: Response, next: NextFunction) => {
    const committeeId = req.params['id'];

    // If we have mock members for this committee, always serve them
    if (MOCK_MEMBERS_BY_COMMITTEE[committeeId]) {
      console.log(`[DEV MOCK] Serving mock members for committee ${committeeId}`);
      res.json(MOCK_MEMBERS_BY_COMMITTEE[committeeId]);
      return;
    }

    if (!isMockId(committeeId)) {
      const reachable = await isUpstreamReachable();
      if (reachable) {
        return next();
      }
    }
    const members = DEFAULT_MOCK_MEMBERS;
    console.log(`[DEV MOCK] Upstream unreachable → serving default mock members for ${committeeId}`);
    res.json(members);
  });

  // Fallback for GET /api/committees/:id/documents
  // Always serves mock data for mock IDs; falls back to mock when upstream unreachable
  app.get('/api/committees/:id/documents', async (req: Request, res: Response, next: NextFunction) => {
    const committeeId = req.params['id'];
    if (!isMockId(committeeId)) {
      const reachable = await isUpstreamReachable();
      if (reachable) {
        return next();
      }
    }
    const documents = MOCK_DOCUMENTS_BY_COMMITTEE[committeeId] || [];
    console.log(`[DEV MOCK] Upstream unreachable → serving mock documents for ${committeeId}`);
    res.json(documents);
  });

  // Fallback for GET /api/committees/:id (single committee detail)
  // Always serves mock data for mock IDs; falls back to mock when upstream unreachable
  app.get('/api/committees/:id', async (req: Request, res: Response, next: NextFunction) => {
    const committeeId = req.params['id'];
    if (!isMockId(committeeId)) {
      const reachable = await isUpstreamReachable();
      if (reachable) {
        return next();
      }
    }
    const committee = MOCK_COMMITTEES.find((c) => c.uid === committeeId);
    if (!committee) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }
    // Add extra fields that the detail view expects
    const detail = {
      ...committee,
      business_email_required: false,
      sso_group_enabled: false,
      is_audit_enabled: committee.category === 'Board',
      show_meeting_attendees: true,
      member_visibility: 'public',
      chair: (committee as any).chair || null,
      co_chair: (committee as any).co_chair || null,
    };
    console.log(`[DEV MOCK] Upstream unreachable → serving mock committee detail for ${committeeId}`);
    res.json(detail);
  });

  // ── Member CRUD mock handlers ──────────────────────────────────────

  // Fallback for GET /api/committees/:id/members/:memberId (single member for edit form)
  app.get('/api/committees/:id/members/:memberId', async (req: Request, res: Response, next: NextFunction) => {
    const committeeId = req.params['id'];
    if (!isMockId(committeeId)) {
      const reachable = await isUpstreamReachable();
      if (reachable) {
        return next();
      }
    }
    const memberId = req.params['memberId'];
    const members = MOCK_MEMBERS_BY_COMMITTEE[committeeId] || DEFAULT_MOCK_MEMBERS;
    const member = members.find((m: any) => m.uid === memberId);
    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }
    console.log(`[DEV MOCK] Serving mock member ${memberId} for committee ${committeeId}`);
    res.json(member);
  });

  // Mock handler for POST /api/committees/:id/members (create member)
  // Always use mock — real API doesn't support member write operations yet
  app.post('/api/committees/:id/members', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const memberData = req.body;

    // Generate unique uid
    const newUid = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newMember = {
      uid: newUid,
      committee_uid: committeeId,
      ...memberData,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Initialize array for committee if it doesn't exist
    if (!MOCK_MEMBERS_BY_COMMITTEE[committeeId]) {
      MOCK_MEMBERS_BY_COMMITTEE[committeeId] = [];
    }

    // Check for duplicate email within the committee
    const existingMember = MOCK_MEMBERS_BY_COMMITTEE[committeeId].find((m: any) => m.email === memberData.email);
    if (existingMember) {
      res.status(409).json({ error: 'Member with this email already exists in this committee' });
      return;
    }

    MOCK_MEMBERS_BY_COMMITTEE[committeeId].push(newMember);

    // Update committee total_members count
    const committee = MOCK_COMMITTEES.find((c) => c.uid === committeeId);
    if (committee) {
      (committee as any).total_members = MOCK_MEMBERS_BY_COMMITTEE[committeeId].length;
    }

    console.log(`[DEV MOCK] Created member ${newUid} (${memberData.email}) in committee ${committeeId}`);
    res.status(201).json(newMember);
  });

  // Mock handler for PUT /api/committees/:id/members/:memberId (update member)
  // Always use mock — real API doesn't support member write operations yet
  app.put('/api/committees/:id/members/:memberId', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const memberId = req.params['memberId'];
    const updateData = req.body;

    const members = MOCK_MEMBERS_BY_COMMITTEE[committeeId];
    if (!members) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }

    const memberIndex = members.findIndex((m: any) => m.uid === memberId);
    if (memberIndex === -1) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    // Merge update data, preserving uid and created_at
    const updatedMember = {
      ...members[memberIndex],
      ...updateData,
      uid: memberId,
      created_at: members[memberIndex].created_at,
      updated_at: new Date().toISOString(),
    };

    members[memberIndex] = updatedMember;

    console.log(`[DEV MOCK] Updated member ${memberId} in committee ${committeeId}`);
    res.json(updatedMember);
  });

  // Mock handler for DELETE /api/committees/:id/members/:memberId (delete member)
  // Always use mock — real API doesn't support member write operations yet
  app.delete('/api/committees/:id/members/:memberId', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const memberId = req.params['memberId'];

    const members = MOCK_MEMBERS_BY_COMMITTEE[committeeId];
    if (!members) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }

    const memberIndex = members.findIndex((m: any) => m.uid === memberId);
    if (memberIndex === -1) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const deletedMember = members[memberIndex];
    members.splice(memberIndex, 1);

    // Update committee total_members count
    const committee = MOCK_COMMITTEES.find((c) => c.uid === committeeId);
    if (committee) {
      (committee as any).total_members = Math.max(0, members.length);
    }

    console.log(`[DEV MOCK] Deleted member ${memberId} (${deletedMember.email}) from committee ${committeeId}`);
    res.status(204).send();
  });

  // ── Invite mock endpoints ────────────────────────────────────────

  const MOCK_INVITES_BY_COMMITTEE: Record<string, any[]> = {};

  // POST /api/committees/:id/invites — Create invites
  app.post('/api/committees/:id/invites', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const { emails, message, suggested_role } = req.body || {};

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({ error: 'At least one email address is required' });
      return;
    }

    if (!MOCK_INVITES_BY_COMMITTEE[committeeId]) {
      MOCK_INVITES_BY_COMMITTEE[committeeId] = [];
    }

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const newInvites = emails.map((email: string) => ({
      uid: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      committee_uid: committeeId,
      invitee_email: email,
      invited_by_uid: 'mock-user-001',
      invited_by_name: 'Mock Admin',
      status: 'pending',
      message: message || undefined,
      suggested_role: suggested_role || undefined,
      created_at: now,
      expires_at: expiresAt,
    }));

    MOCK_INVITES_BY_COMMITTEE[committeeId].push(...newInvites);
    console.log(`[DEV MOCK] Created ${newInvites.length} invite(s) for committee ${committeeId}`);
    res.status(201).json(newInvites);
  });

  // GET /api/committees/:id/invites — List invites
  app.get('/api/committees/:id/invites', async (req: Request, res: Response, next: NextFunction) => {
    if (await isUpstreamReachable()) {
      next();
      return;
    }
    const committeeId = req.params['id'];
    res.json(MOCK_INVITES_BY_COMMITTEE[committeeId] || []);
  });

  // POST /api/committees/:id/invites/:inviteId/accept
  app.post('/api/committees/:id/invites/:inviteId/accept', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const inviteId = req.params['inviteId'];
    const invites = MOCK_INVITES_BY_COMMITTEE[committeeId] || [];
    const invite = invites.find((i: any) => i.uid === inviteId);
    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }
    invite.status = 'accepted';
    invite.responded_at = new Date().toISOString();
    console.log(`[DEV MOCK] Invite ${inviteId} accepted`);
    res.json(invite);
  });

  // POST /api/committees/:id/invites/:inviteId/decline
  app.post('/api/committees/:id/invites/:inviteId/decline', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const inviteId = req.params['inviteId'];
    const invites = MOCK_INVITES_BY_COMMITTEE[committeeId] || [];
    const invite = invites.find((i: any) => i.uid === inviteId);
    if (!invite) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }
    invite.status = 'declined';
    invite.responded_at = new Date().toISOString();
    console.log(`[DEV MOCK] Invite ${inviteId} declined`);
    res.json(invite);
  });

  // DELETE /api/committees/:id/invites/:inviteId — Revoke invite
  app.delete('/api/committees/:id/invites/:inviteId', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const inviteId = req.params['inviteId'];
    const invites = MOCK_INVITES_BY_COMMITTEE[committeeId] || [];
    const idx = invites.findIndex((i: any) => i.uid === inviteId);
    if (idx === -1) {
      res.status(404).json({ error: 'Invite not found' });
      return;
    }
    invites.splice(idx, 1);
    console.log(`[DEV MOCK] Invite ${inviteId} revoked`);
    res.status(204).send();
  });

  // POST /api/committees/:id/join — Self-join
  app.post('/api/committees/:id/join', async (_req: Request, res: Response, _next: NextFunction) => {
    console.log('[DEV MOCK] Self-join endpoint called');
    res.json({ message: 'Successfully joined the group' });
  });

  // POST /api/committees/:id/leave — Leave
  app.post('/api/committees/:id/leave', async (_req: Request, res: Response, _next: NextFunction) => {
    console.log('[DEV MOCK] Leave endpoint called');
    res.json({ message: 'Successfully left the group' });
  });

  // POST /api/committees/:id/applications — Apply to join
  app.post('/api/committees/:id/applications', async (req: Request, res: Response, _next: NextFunction) => {
    const committeeId = req.params['id'];
    const application = {
      uid: `app-${Date.now()}`,
      committee_uid: committeeId,
      applicant_email: 'mock-user@example.com',
      applicant_name: 'Mock User',
      applicant_uid: 'mock-user-001',
      status: 'pending',
      reason: req.body?.reason || '',
      created_at: new Date().toISOString(),
    };
    console.log(`[DEV MOCK] Application created for committee ${committeeId}`);
    res.status(201).json(application);
  });

  // GET /api/committees/:id/applications — List applications
  app.get('/api/committees/:id/applications', async (_req: Request, res: Response, next: NextFunction) => {
    if (await isUpstreamReachable()) {
      next();
      return;
    }
    res.json([]);
  });

  // POST /api/committees/:id/applications/:applicationId/approve
  app.post('/api/committees/:id/applications/:applicationId/approve', async (req: Request, res: Response, _next: NextFunction) => {
    console.log(`[DEV MOCK] Application ${req.params['applicationId']} approved`);
    res.json({ status: 'approved' });
  });

  // POST /api/committees/:id/applications/:applicationId/reject
  app.post('/api/committees/:id/applications/:applicationId/reject', async (req: Request, res: Response, _next: NextFunction) => {
    console.log(`[DEV MOCK] Application ${req.params['applicationId']} rejected`);
    res.json({ status: 'rejected' });
  });
}
