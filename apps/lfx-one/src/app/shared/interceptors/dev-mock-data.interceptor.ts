// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Client-side HTTP interceptor that returns mock data during local development.
 *
 * Why this exists:
 * Angular 20's Vite-based dev server with SSR does not reliably forward
 * client-side XHR/fetch calls through the Express SSR middleware. The SSR
 * render itself works (Express mock middleware serves data during server-side
 * rendering), but post-hydration API refetches fail with 404 because Vite
 * handles them directly without forwarding to Express.
 *
 * This interceptor catches /api/* requests in the BROWSER only (not SSR)
 * and returns mock data, ensuring the client-side app works fully offline.
 *
 * Activation: Only when `environment.production === false` and `isPlatformBrowser`.
 */

import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

import { environment } from '../../../environments/environment';

// ─── Mock Data ──────────────────────────────────────────────────────

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
    created_at: '2023-06-15T10:00:00Z',
    updated_at: '2024-11-20T14:30:00Z',
    writer: true,
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
    business_email_required: false,
    sso_group_enabled: false,
    is_audit_enabled: true,
    show_meeting_attendees: true,
    member_visibility: 'public',
    join_mode: 'invite-only',
    mailing_list: { name: 'gold-voting-class', url: 'https://lists.aaif.dev/g/gold-voting-class', subscriber_count: 24 },
    chat_channel: { platform: 'slack', name: '#gold-voting-class', url: 'https://aaif.slack.com/archives/C01GOLD' },
  },
  {
    uid: 'mock-committee-002',
    name: 'Technical Advisory Council',
    slug: 'technical-advisory-council',
    description: 'Provides technical guidance and oversight for foundation projects and working groups.',
    category: 'Technical Advisory Committee',
    status: 'active',
    public: true,
    enable_voting: true,
    total_members: 12,
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
    co_chair: null,
    join_mode: 'apply',
    mailing_list: { name: 'tac-general', url: 'https://lists.aaif.dev/g/tac-general', subscriber_count: 48 },
    chat_channel: { platform: 'slack', name: '#tac-general', url: 'https://aaif.slack.com/archives/C02TAC' },
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
    created_at: '2023-09-22T11:00:00Z',
    updated_at: '2024-10-05T16:45:00Z',
    writer: true,
    chair: null,
    co_chair: null,
    mailing_list: { name: 'outreach', url: 'https://lists.aaif.dev/g/outreach', subscriber_count: 15 },
    chat_channel: { platform: 'slack', name: '#outreach', url: 'https://aaif.slack.com/archives/C03OUTREACH' },
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
    mailing_list: { name: 'security-wg', url: 'https://lists.aaif.dev/g/security-wg', subscriber_count: 32 },
    chat_channel: { platform: 'slack', name: '#security-wg', url: 'https://aaif.slack.com/archives/C04SECWG' },
  },
  {
    uid: 'mock-committee-005',
    name: 'Documentation SIG',
    slug: 'documentation-sig',
    description: 'Special interest group focused on improving documentation quality and standards.',
    category: 'Special Interest Group',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 22,
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2025-01-10T11:30:00Z',
    writer: true,
    chair: {
      uid: 'mem-040',
      first_name: 'Priya',
      last_name: 'Patel',
      email: 'priya.patel@doctools.io',
      organization: 'DocTools',
      avatar_url: '',
      elected_date: '2024-07-01T00:00:00Z',
    },
    co_chair: null,
    join_mode: 'open',
    mailing_list: { name: 'docs-sig', url: 'https://lists.aaif.dev/g/docs-sig', subscriber_count: 30 },
    chat_channel: { platform: 'discord', name: '#docs-sig', url: 'https://discord.gg/aaif-docs' },
  },
  {
    uid: 'mock-committee-006',
    name: 'Legal Committee',
    slug: 'legal-committee',
    description: 'Oversees legal compliance, licensing, and intellectual property matters.',
    category: 'Legal Committee',
    status: 'active',
    public: false,
    enable_voting: true,
    total_members: 6,
    created_at: '2023-01-15T09:00:00Z',
    updated_at: '2024-11-30T16:00:00Z',
    writer: true,
    chair: {
      uid: 'mem-050',
      first_name: 'Robert',
      last_name: 'Kim',
      email: 'rkim@lawtech.com',
      organization: 'LawTech',
      avatar_url: '',
      elected_date: '2023-03-01T00:00:00Z',
    },
    co_chair: null,
    mailing_list: { name: 'legal-committee', url: 'https://lists.aaif.dev/g/legal-committee', subscriber_count: 8 },
    chat_channel: { platform: 'slack', name: '#legal-private', url: 'https://aaif.slack.com/archives/C06LEGAL' },
  },
  {
    uid: 'mock-committee-007',
    name: 'Cloud Native Maintainers',
    slug: 'cloud-native-maintainers',
    description: 'Community of maintainers for cloud-native ecosystem projects under the foundation.',
    category: 'Maintainers',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 45,
    created_at: '2024-02-20T12:00:00Z',
    updated_at: '2025-02-01T08:45:00Z',
    writer: true,
    chair: {
      uid: 'mem-060',
      first_name: 'Lisa',
      last_name: 'Wang',
      email: 'lwang@cloudnative.dev',
      organization: 'CloudNative Inc.',
      avatar_url: '',
      elected_date: '2024-04-01T00:00:00Z',
    },
    co_chair: {
      uid: 'mem-061',
      first_name: 'Tom',
      last_name: 'Fischer',
      email: 'tfischer@kubeops.io',
      organization: 'KubeOps',
      avatar_url: '',
      elected_date: '2024-04-01T00:00:00Z',
    },
    join_mode: 'invite-only',
    mailing_list: { name: 'cloud-native-maintainers', url: 'https://lists.aaif.dev/g/cloud-native-maintainers', subscriber_count: 62 },
    chat_channel: { platform: 'slack', name: '#cn-maintainers', url: 'https://aaif.slack.com/archives/C07CNM' },
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
    total_members: 12,
    created_at: '2023-03-01T09:00:00Z',
    updated_at: '2025-12-10T11:00:00Z',
    writer: true,
    chair: {
      uid: 'mem-050',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'priya@cloudnative.dev',
      organization: 'CloudNative Inc.',
      avatar_url: '',
      elected_date: '2024-06-01T00:00:00Z',
    },
    co_chair: null,
    mailing_list: { name: 'tsc-general', url: 'https://lists.aaif.dev/g/tsc-general', subscriber_count: 20 },
    chat_channel: { platform: 'slack', name: '#tsc-general', url: 'https://aaif.slack.com/archives/C08TSC' },
  },
  // ── Special Interest Group (SIG → special-interest-group) ──
  {
    uid: 'mock-committee-009',
    name: 'Supply Chain Security SIG',
    slug: 'supply-chain-security-sig',
    description: 'Community-driven interest group focused on software supply chain security standards and best practices.',
    category: 'SIG',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 58,
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2026-01-20T16:30:00Z',
    writer: true,
    chair: {
      uid: 'mem-053',
      first_name: 'Lena',
      last_name: 'Schmidt',
      email: 'lena@sigstore.dev',
      organization: 'SigStore Foundation',
      avatar_url: '',
      elected_date: '2024-07-01T00:00:00Z',
    },
    co_chair: {
      uid: 'mem-054',
      first_name: 'Raj',
      last_name: 'Patel',
      email: 'raj@securechainlabs.com',
      organization: 'SecureChain Labs',
      avatar_url: '',
      elected_date: '2024-07-01T00:00:00Z',
    },
    join_mode: 'open',
    mailing_list: { name: 'supply-chain-sig', url: 'https://lists.aaif.dev/g/supply-chain-sig', subscriber_count: 85 },
    chat_channel: { platform: 'discord', name: '#supply-chain-security', url: 'https://discord.gg/aaif-scs' },
  },
  // ── Ambassador Program (Ambassador → ambassador-program) ──
  {
    uid: 'mock-committee-010',
    name: 'Ambassador Program',
    slug: 'ambassador-program',
    description: 'Member engagement and outreach program for community ambassadors and advocates.',
    category: 'Ambassador',
    status: 'active',
    public: true,
    enable_voting: false,
    total_members: 120,
    created_at: '2023-09-01T10:00:00Z',
    updated_at: '2026-02-15T09:00:00Z',
    writer: true,
    chair: {
      uid: 'mem-056',
      first_name: 'Carlos',
      last_name: 'Rivera',
      email: 'carlos@ambassadors.lfx.dev',
      organization: 'LF Ambassador Network',
      avatar_url: '',
      elected_date: '2025-01-01T00:00:00Z',
    },
    co_chair: null,
    join_mode: 'open',
    mailing_list: { name: 'ambassadors', url: 'https://lists.aaif.dev/g/ambassadors', subscriber_count: 150 },
    chat_channel: { platform: 'discord', name: '#ambassadors', url: 'https://discord.gg/aaif-ambassadors' },
  },
];

const MOCK_MEMBERS_BY_COMMITTEE: Record<string, any[]> = {
  'mock-committee-001': [
    {
      uid: 'mem-001',
      first_name: 'Sarah',
      last_name: 'Chen',
      email: 'sarah.chen@techcorp.com',
      organization: { name: 'TechCorp', website: 'https://techcorp.com' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'Active', eligible: true },
      created_at: '2023-06-15T10:00:00Z',
    },
    {
      uid: 'mem-002',
      first_name: 'James',
      last_name: 'Rodriguez',
      email: 'jrodriguez@cloudio.dev',
      organization: { name: 'Cloud.io', website: 'https://cloudio.dev' },
      role: { name: 'Co-Chair', uid: 'role-cochair' },
      voting: { status: 'Active', eligible: true },
      created_at: '2023-06-15T10:00:00Z',
    },
    {
      uid: 'mem-003',
      first_name: 'Emily',
      last_name: 'Park',
      email: 'epark@datavault.com',
      organization: { name: 'DataVault', website: 'https://datavault.com' },
      role: { name: 'Voting Representative', uid: 'role-voting-rep' },
      voting: { status: 'Active', eligible: true },
      created_at: '2023-07-01T10:00:00Z',
    },
    {
      uid: 'mem-004',
      first_name: 'Michael',
      last_name: 'Brown',
      email: 'mbrown@ossinc.org',
      organization: { name: 'OSS Inc.', website: 'https://ossinc.org' },
      role: { name: 'Voting Representative', uid: 'role-voting-rep' },
      voting: { status: 'Active', eligible: true },
      created_at: '2023-08-15T10:00:00Z',
    },
    {
      uid: 'mem-005',
      first_name: 'Diana',
      last_name: 'Rivera',
      email: 'drivera@nexgen.tech',
      organization: { name: 'NexGen Tech', website: null },
      role: { name: 'Alternate', uid: 'role-alternate' },
      voting: { status: 'Inactive', eligible: false },
      created_at: '2023-09-01T10:00:00Z',
    },
  ],
  'mock-committee-002': [
    {
      uid: 'mem-010',
      first_name: 'Alex',
      last_name: 'Morgan',
      email: 'alex.morgan@techcorp.com',
      organization: { name: 'TechCorp', website: 'https://techcorp.com' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'Active', eligible: true },
      created_at: '2023-03-10T08:00:00Z',
    },
    {
      uid: 'mem-011',
      first_name: 'Kenji',
      last_name: 'Sato',
      email: 'ksato@devplatform.jp',
      organization: { name: 'DevPlatform', website: 'https://devplatform.jp' },
      role: { name: 'Voting Representative', uid: 'role-voting-rep' },
      voting: { status: 'Active', eligible: true },
      created_at: '2023-04-01T10:00:00Z',
    },
    {
      uid: 'mem-012',
      first_name: 'Fatima',
      last_name: 'Al-Hassan',
      email: 'falhassan@opensys.io',
      organization: { name: 'OpenSys', website: 'https://opensys.io' },
      role: { name: 'Voting Representative', uid: 'role-voting-rep' },
      voting: { status: 'Active', eligible: true },
      created_at: '2023-05-15T10:00:00Z',
    },
  ],
  'mock-committee-004': [
    {
      uid: 'mem-030',
      first_name: 'Anna',
      last_name: 'Kowalski',
      email: 'anna.k@securityfirst.io',
      organization: { name: 'SecurityFirst', website: 'https://securityfirst.io' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'Active', eligible: true },
      created_at: '2024-01-08T14:00:00Z',
    },
    {
      uid: 'mem-031',
      first_name: 'Marcus',
      last_name: 'Johnson',
      email: 'mjohnson@cybershield.io',
      organization: { name: 'CyberShield', website: 'https://cybershield.io' },
      role: { name: 'Co-Chair', uid: 'role-cochair' },
      voting: { status: 'Active', eligible: true },
      created_at: '2024-01-08T14:00:00Z',
    },
    {
      uid: 'mem-032',
      first_name: 'Yuki',
      last_name: 'Tanaka',
      email: 'ytanaka@safecode.jp',
      organization: { name: 'SafeCode', website: null },
      role: { name: 'Contributor', uid: 'role-contributor' },
      voting: { status: 'Active', eligible: true },
      created_at: '2024-02-01T10:00:00Z',
    },
  ],
  'mock-committee-005': [
    {
      uid: 'mem-040',
      first_name: 'Priya',
      last_name: 'Patel',
      email: 'priya.patel@doctools.io',
      organization: { name: 'DocTools', website: 'https://doctools.io' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'Active', eligible: true },
      created_at: '2024-06-01T10:00:00Z',
    },
    {
      uid: 'mem-041',
      first_name: 'Carlos',
      last_name: 'Mendez',
      email: 'cmendez@writeright.dev',
      organization: { name: 'WriteRight', website: 'https://writeright.dev' },
      role: { name: 'Contributor', uid: 'role-contributor' },
      voting: { status: 'Active', eligible: false },
      created_at: '2024-07-01T10:00:00Z',
    },
  ],
  'mock-committee-007': [
    {
      uid: 'mem-060',
      first_name: 'Lisa',
      last_name: 'Wang',
      email: 'lwang@cloudnative.dev',
      organization: { name: 'CloudNative Inc.', website: 'https://cloudnative.dev' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'Active', eligible: false },
      created_at: '2024-02-20T12:00:00Z',
    },
    {
      uid: 'mem-061',
      first_name: 'Tom',
      last_name: 'Fischer',
      email: 'tfischer@kubeops.io',
      organization: { name: 'KubeOps', website: 'https://kubeops.io' },
      role: { name: 'Co-Chair', uid: 'role-cochair' },
      voting: { status: 'Active', eligible: false },
      created_at: '2024-02-20T12:00:00Z',
    },
    {
      uid: 'mem-062',
      first_name: 'Aisha',
      last_name: 'Okafor',
      email: 'aokafor@containerhub.io',
      organization: { name: 'ContainerHub', website: null },
      role: { name: 'Contributor', uid: 'role-contributor' },
      voting: { status: 'Active', eligible: false },
      created_at: '2024-03-15T10:00:00Z',
    },
    {
      uid: 'mem-063',
      first_name: 'Erik',
      last_name: 'Lindqvist',
      email: 'elindqvist@nordcloud.se',
      organization: { name: 'NordCloud', website: 'https://nordcloud.se' },
      role: { name: 'Contributor', uid: 'role-contributor' },
      voting: { status: 'Active', eligible: false },
      created_at: '2024-04-01T10:00:00Z',
    },
  ],
  'mock-committee-008': [
    {
      uid: 'mem-050',
      first_name: 'Priya',
      last_name: 'Sharma',
      email: 'priya@cloudnative.dev',
      organization: { name: 'CloudNative Inc.', website: 'https://cloudnative.dev' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'Active', eligible: true },
      status: 'Active',
      joined_at: '2024-06-01T00:00:00Z',
    },
    {
      uid: 'mem-051',
      first_name: 'Tom',
      last_name: 'Baker',
      email: 'tom@kubeops.io',
      organization: { name: 'KubeOps', website: 'https://kubeops.io' },
      role: { name: 'Member', uid: 'role-member' },
      voting: { status: 'Active', eligible: true },
      status: 'Active',
      joined_at: '2024-06-15T00:00:00Z',
    },
    {
      uid: 'mem-052',
      first_name: 'Yuki',
      last_name: 'Tanaka',
      email: 'yuki@containerd.io',
      organization: { name: 'ContainerD Project', website: 'https://containerd.io' },
      role: { name: 'Member', uid: 'role-member' },
      voting: { status: 'Active', eligible: true },
      status: 'Active',
      joined_at: '2024-08-01T00:00:00Z',
    },
  ],
  'mock-committee-009': [
    {
      uid: 'mem-053',
      first_name: 'Lena',
      last_name: 'Schmidt',
      email: 'lena@sigstore.dev',
      organization: { name: 'SigStore Foundation', website: 'https://sigstore.dev' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'N/A', eligible: false },
      status: 'Active',
      joined_at: '2024-07-01T00:00:00Z',
    },
    {
      uid: 'mem-054',
      first_name: 'Raj',
      last_name: 'Patel',
      email: 'raj@securechainlabs.com',
      organization: { name: 'SecureChain Labs', website: 'https://securechainlabs.com' },
      role: { name: 'Co-Chair', uid: 'role-cochair' },
      voting: { status: 'N/A', eligible: false },
      status: 'Active',
      joined_at: '2024-07-01T00:00:00Z',
    },
    {
      uid: 'mem-055',
      first_name: 'Maria',
      last_name: 'Garcia',
      email: 'maria@oss-sec.org',
      organization: { name: 'OSS Security Alliance', website: 'https://oss-sec.org' },
      role: { name: 'Member', uid: 'role-member' },
      voting: { status: 'N/A', eligible: false },
      status: 'Active',
      joined_at: '2024-09-01T00:00:00Z',
    },
  ],
  'mock-committee-010': [
    {
      uid: 'mem-056',
      first_name: 'Carlos',
      last_name: 'Rivera',
      email: 'carlos@ambassadors.lfx.dev',
      organization: { name: 'LF Ambassador Network', website: 'https://ambassadors.lfx.dev' },
      role: { name: 'Chair', uid: 'role-chair' },
      voting: { status: 'N/A', eligible: false },
      status: 'Active',
      joined_at: '2025-01-01T00:00:00Z',
    },
    {
      uid: 'mem-057',
      first_name: 'Aisha',
      last_name: 'Patel',
      email: 'aisha@devrel.foundation',
      organization: { name: 'DevRel Foundation', website: 'https://devrel.foundation' },
      role: { name: 'Member', uid: 'role-member' },
      voting: { status: 'N/A', eligible: false },
      status: 'Active',
      joined_at: '2025-02-01T00:00:00Z',
    },
  ],
};

const MOCK_DOCUMENTS: Record<string, any[]> = {
  'mock-committee-001': [
    { uid: 'doc-001', name: 'Charter Document', type: 'charter', url: '#', created_at: '2023-06-15T10:00:00Z', updated_at: '2024-01-20T14:00:00Z' },
    { uid: 'doc-002', name: 'Q4 2024 Meeting Minutes', type: 'minutes', url: '#', created_at: '2024-12-15T10:00:00Z', updated_at: '2024-12-15T10:00:00Z' },
    {
      uid: 'doc-003',
      name: 'Membership Agreement Template',
      type: 'template',
      url: '#',
      created_at: '2023-06-15T10:00:00Z',
      updated_at: '2024-06-01T10:00:00Z',
    },
  ],
  'mock-committee-002': [
    { uid: 'doc-010', name: 'TAC Charter', type: 'charter', url: '#', created_at: '2023-03-10T08:00:00Z', updated_at: '2024-03-10T08:00:00Z' },
  ],
  'mock-committee-004': [
    { uid: 'doc-030', name: 'Security Policy v2.1', type: 'policy', url: '#', created_at: '2024-06-01T10:00:00Z', updated_at: '2024-12-01T10:00:00Z' },
    {
      uid: 'doc-031',
      name: 'Vulnerability Disclosure Guidelines',
      type: 'guideline',
      url: '#',
      created_at: '2024-03-01T10:00:00Z',
      updated_at: '2024-09-15T10:00:00Z',
    },
  ],
};

const MOCK_MEETINGS: any[] = [
  {
    id: 'mtg-001',
    uid: 'mtg-001',
    title: 'Board Monthly Call',
    description: '',
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    duration: 60,
    timezone: 'America/Los_Angeles',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    meeting_type: 'Board',
    visibility: 'private',
    restricted: false,
    invited: true,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    artifact_visibility: 'private',
    recurrence: { type: 'monthly', interval: 1, day_of_month: 15 },
    zoom_config: { ai_companion_enabled: true },
    committees: [{ uid: 'mock-committee-001', name: 'Gold Member Voting Class' }],
    organizers: ['sarah.chen@techcorp.com'],
    password: null,
    public_link: null,
    individual_registrants_count: 18,
    committee_members_count: 24,
    registrants_accepted_count: 18,
    registrants_declined_count: 0,
    registrants_pending_count: 6,
    created_at: '2024-01-15T10:00:00Z',
    modified_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'mtg-002',
    uid: 'mtg-002',
    title: 'TAC Review Session',
    description: 'Monthly review of project proposals and technical direction.\nhttps://docs.google.com/document/d/1abc/edit',
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    duration: 90,
    timezone: 'America/New_York',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    meeting_type: 'Technical',
    visibility: 'public',
    restricted: false,
    invited: true,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: true,
    show_meeting_attendees: true,
    artifact_visibility: 'public',
    recurrence: { type: 'monthly', interval: 1, day_of_month: 12 },
    zoom_config: { ai_companion_enabled: true },
    committees: [{ uid: 'mock-committee-002', name: 'Technical Advisory Council' }],
    organizers: ['alex.morgan@techcorp.com'],
    password: null,
    public_link: null,
    individual_registrants_count: 10,
    committee_members_count: 12,
    registrants_accepted_count: 10,
    registrants_declined_count: 0,
    registrants_pending_count: 2,
    created_at: '2023-03-10T08:00:00Z',
    modified_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'mtg-003',
    uid: 'mtg-003',
    title: 'Security WG Standup',
    description: '',
    start_time: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // tomorrow
    duration: 30,
    timezone: 'America/Chicago',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    meeting_type: 'Maintainers',
    visibility: 'private',
    restricted: true,
    invited: true,
    recording_enabled: false,
    transcript_enabled: false,
    youtube_upload_enabled: false,
    show_meeting_attendees: false,
    artifact_visibility: 'private',
    recurrence: { type: 'weekly', interval: 1, days_of_week: ['Thursday'] },
    zoom_config: null,
    committees: [{ uid: 'mock-committee-004', name: 'Security Working Group' }],
    organizers: ['anna.k@securityfirst.io'],
    password: 'sec123',
    public_link: null,
    individual_registrants_count: 8,
    committee_members_count: 15,
    registrants_accepted_count: 8,
    registrants_declined_count: 0,
    registrants_pending_count: 7,
    created_at: '2024-01-08T14:00:00Z',
    modified_at: '2026-02-20T10:00:00Z',
  },
  {
    id: 'mtg-004',
    uid: 'mtg-004',
    title: 'Board Quarterly Review',
    description: 'FY2026 Q1 financial review and strategic planning.\nhttps://drive.google.com/file/d/1xyz/view',
    start_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    duration: 120,
    timezone: 'America/Los_Angeles',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    meeting_type: 'Board',
    visibility: 'private',
    restricted: false,
    invited: true,
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    artifact_visibility: 'private',
    recurrence: null,
    zoom_config: { ai_companion_enabled: true },
    committees: [{ uid: 'mock-committee-001', name: 'Gold Member Voting Class' }],
    organizers: ['sarah.chen@techcorp.com'],
    password: null,
    public_link: null,
    individual_registrants_count: 22,
    committee_members_count: 24,
    registrants_accepted_count: 22,
    registrants_declined_count: 1,
    registrants_pending_count: 1,
    created_at: '2026-01-15T10:00:00Z',
    modified_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'mtg-005',
    uid: 'mtg-005',
    title: 'Documentation SIG Weekly Sync',
    description: 'Docs sprint progress and style guide updates.',
    start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    duration: 45,
    timezone: 'America/New_York',
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
    meeting_type: 'Technical',
    visibility: 'public',
    restricted: false,
    invited: true,
    recording_enabled: true,
    transcript_enabled: false,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    artifact_visibility: 'public',
    recurrence: { type: 'weekly', interval: 1, days_of_week: ['Wednesday'] },
    zoom_config: null,
    committees: [{ uid: 'mock-committee-005', name: 'Documentation SIG' }],
    organizers: ['priya.patel@doctools.io'],
    password: null,
    public_link: null,
    individual_registrants_count: 12,
    committee_members_count: 22,
    registrants_accepted_count: 12,
    registrants_declined_count: 0,
    registrants_pending_count: 10,
    created_at: '2024-06-01T10:00:00Z',
    modified_at: '2026-02-28T10:00:00Z',
  },
  {
    id: 'mtg-006',
    uid: 'mock-meeting-006',
    title: 'TSC Monthly Architecture Review',
    description: 'Monthly technical steering review for architecture and project lifecycle decisions.',
    start_time: new Date(Date.now() + 6 * 86400000).toISOString(),
    end_time: new Date(Date.now() + 6 * 86400000 + 5400000).toISOString(),
    timezone: 'America/Los_Angeles',
    meeting_type: 'Private',
    status: 'confirmed',
    join_url: 'https://zoom.us/j/mock006',
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: true,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-008', name: 'Technical Steering Committee' }],
    recurrence: { type: 2, repeat_interval: 1, weekly_days: '4' },
    occurrences: [],
    organizers: ['priya@cloudnative.dev'],
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
  },
  {
    id: 'mtg-007',
    uid: 'mock-meeting-007',
    title: 'Supply Chain Security SIG Bi-Weekly Sync',
    description: 'Bi-weekly community sync for supply chain security discussions and standards updates.',
    start_time: new Date(Date.now() + 4 * 86400000).toISOString(),
    end_time: new Date(Date.now() + 4 * 86400000 + 3600000).toISOString(),
    timezone: 'America/New_York',
    meeting_type: 'Public',
    status: 'confirmed',
    join_url: 'https://zoom.us/j/mock007',
    recording_enabled: true,
    transcript_enabled: true,
    youtube_upload_enabled: true,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-009', name: 'Supply Chain Security SIG' }],
    recurrence: { type: 2, repeat_interval: 2, weekly_days: '3' },
    occurrences: [],
    organizers: ['lena@sigstore.dev'],
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
  },
  {
    id: 'mtg-008',
    uid: 'mock-meeting-008',
    title: 'Ambassador Program Monthly Standup',
    description: 'Monthly standup for ambassador program coordination and outreach planning.',
    start_time: new Date(Date.now() + 10 * 86400000).toISOString(),
    end_time: new Date(Date.now() + 10 * 86400000 + 3600000).toISOString(),
    timezone: 'America/Chicago',
    meeting_type: 'Public',
    status: 'confirmed',
    join_url: 'https://zoom.us/j/mock008',
    recording_enabled: false,
    transcript_enabled: false,
    youtube_upload_enabled: false,
    show_meeting_attendees: true,
    committees: [{ uid: 'mock-committee-010', name: 'Ambassador Program' }],
    recurrence: { type: 2, repeat_interval: 4, weekly_days: '2' },
    occurrences: [],
    organizers: ['carlos@ambassadors.lfx.dev'],
    project_uid: 'a09410d0-3455-11ea-978f-2e728ce88125',
  },
];

const MOCK_PROJECTS = [{ uid: 'proj-001', name: 'AAIF', slug: 'aaif', status: 'active', logo_url: '' }];

// ── Phase 3: Mock Join Applications ──────────────────────────────────
const MOCK_APPLICATIONS_BY_COMMITTEE: Record<string, any[]> = {
  // mock-committee-002 (Technical Steering Committee) has join_mode: 'apply'
  'mock-committee-002': [
    {
      uid: 'app-001',
      committee_uid: 'mock-committee-002',
      applicant_email: 'dev.johnson@cloudnative.io',
      applicant_name: 'Devon Johnson',
      applicant_uid: 'user-ext-001',
      status: 'pending',
      reason: 'I have been contributing to the container runtime subproject for over a year and would like to participate in technical steering decisions.',
      created_at: '2026-02-28T14:30:00Z',
    },
    {
      uid: 'app-002',
      committee_uid: 'mock-committee-002',
      applicant_email: 'priya.s@enterprise-linux.com',
      applicant_name: 'Priya Sharma',
      applicant_uid: 'user-ext-002',
      status: 'pending',
      reason: 'Our organization is a platinum member and I would like to represent us on the TSC to improve alignment between our upstream contributions and the project roadmap.',
      created_at: '2026-03-01T09:15:00Z',
    },
    {
      uid: 'app-003',
      committee_uid: 'mock-committee-002',
      applicant_email: 'marcus.w@opensrc.dev',
      applicant_name: 'Marcus Williams',
      applicant_uid: 'user-ext-003',
      status: 'approved',
      reason: 'Long-time maintainer of the networking stack, seeking to formalize my involvement.',
      reviewed_by_uid: 'user-001',
      reviewed_at: '2026-02-20T11:00:00Z',
      created_at: '2026-02-15T16:45:00Z',
    },
  ],
};

// ─── Route Matching Helpers ─────────────────────────────────────────

interface RouteMatch {
  params: Record<string, string>;
}

function matchRoute(url: string, pattern: string): RouteMatch | null {
  // Strip query string
  const path = url.split('?')[0];

  const patternParts = pattern.split('/');
  const pathParts = path.split('/');

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return { params };
}

function jsonResponse(body: any, status = 200): HttpResponse<any> {
  return new HttpResponse({ status, body });
}

// ─── Mock Route Handlers ────────────────────────────────────────────

function handleMockRoute(method: string, url: string, reqBody?: any): HttpResponse<any> | null {
  // GET /api/projects
  if (method === 'GET' && matchRoute(url, '/api/projects')) {
    return jsonResponse(MOCK_PROJECTS);
  }

  // GET /api/committees
  if (method === 'GET' && matchRoute(url, '/api/committees')) {
    return jsonResponse(MOCK_COMMITTEES);
  }

  // GET /api/committees/count
  if (method === 'GET' && matchRoute(url, '/api/committees/count')) {
    return jsonResponse({ count: MOCK_COMMITTEES.length });
  }

  // GET /api/committees/my (user's committees — return a mix with role info)
  if (method === 'GET' && matchRoute(url, '/api/committees/my')) {
    const myCommitteeUids = ['mock-committee-010', 'mock-committee-007', 'mock-committee-005'];
    const roles = ['Member', 'Member', 'Member'];
    const myCommittees = myCommitteeUids.map((uid, i) => {
      const committee = MOCK_COMMITTEES.find((c) => c.uid === uid);
      return committee ? { ...committee, myRole: roles[i], myMemberUid: `my-mem-${i + 1}` } : null;
    }).filter(Boolean);
    return jsonResponse(myCommittees);
  }

  // GET /api/committees/:id
  let match = matchRoute(url, '/api/committees/:id');
  if (method === 'GET' && match) {
    const committee = MOCK_COMMITTEES.find((c) => c.uid === match!.params['id']);
    if (committee) {
      return jsonResponse(committee);
    }
    return jsonResponse({ error: 'Committee not found' }, 404);
  }

  // GET /api/committees/:id/members
  match = matchRoute(url, '/api/committees/:id/members');
  if (method === 'GET' && match) {
    const members = MOCK_MEMBERS_BY_COMMITTEE[match.params['id']] || [
      {
        uid: 'mem-default-1',
        first_name: 'Default',
        last_name: 'Member',
        email: 'default@example.com',
        organization: { name: 'Example Org', website: null },
        role: { name: 'Member', uid: 'role-member' },
        voting: { status: 'Active', eligible: true },
        created_at: new Date().toISOString(),
      },
    ];
    return jsonResponse(members);
  }

  // GET /api/committees/:id/members/:memberId
  match = matchRoute(url, '/api/committees/:id/members/:memberId');
  if (method === 'GET' && match) {
    const members = MOCK_MEMBERS_BY_COMMITTEE[match.params['id']] || [];
    const member = members.find((m: any) => m.uid === match!.params['memberId']);
    if (member) {
      return jsonResponse(member);
    }
    return jsonResponse({ error: 'Member not found' }, 404);
  }

  // POST /api/committees/:id/members
  match = matchRoute(url, '/api/committees/:id/members');
  if (method === 'POST' && match) {
    const committeeId = match.params['id'];
    const newMember = {
      uid: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...reqBody,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!MOCK_MEMBERS_BY_COMMITTEE[committeeId]) {
      MOCK_MEMBERS_BY_COMMITTEE[committeeId] = [];
    }
    MOCK_MEMBERS_BY_COMMITTEE[committeeId].push(newMember);
    const committee = MOCK_COMMITTEES.find((c) => c.uid === committeeId);
    if (committee) {
      (committee as any).total_members++;
    }
    return jsonResponse(newMember, 201);
  }

  // PUT /api/committees/:id/members/:memberId
  match = matchRoute(url, '/api/committees/:id/members/:memberId');
  if (method === 'PUT' && match) {
    const { id: committeeId, memberId } = match.params;
    const members = MOCK_MEMBERS_BY_COMMITTEE[committeeId] || [];
    const idx = members.findIndex((m: any) => m.uid === memberId);
    if (idx >= 0) {
      members[idx] = { ...members[idx], ...reqBody, uid: memberId, updated_at: new Date().toISOString() };
      return jsonResponse(members[idx]);
    }
    return jsonResponse({ error: 'Member not found' }, 404);
  }

  // DELETE /api/committees/:id/members/:memberId
  match = matchRoute(url, '/api/committees/:id/members/:memberId');
  if (method === 'DELETE' && match) {
    const { id: committeeId, memberId } = match.params;
    const members = MOCK_MEMBERS_BY_COMMITTEE[committeeId] || [];
    const idx = members.findIndex((m: any) => m.uid === memberId);
    if (idx >= 0) {
      members.splice(idx, 1);
      const committee = MOCK_COMMITTEES.find((c) => c.uid === committeeId);
      if (committee) {
        (committee as any).total_members--;
      }
      return jsonResponse(null, 204);
    }
    return jsonResponse({ error: 'Member not found' }, 404);
  }

  // PUT /api/committees/:id (update committee details — e.g. collaboration channels)
  match = matchRoute(url, '/api/committees/:id');
  if (method === 'PUT' && match) {
    const committeeId = match.params['id'];
    const idx = MOCK_COMMITTEES.findIndex((c) => c.uid === committeeId);
    if (idx >= 0) {
      MOCK_COMMITTEES[idx] = { ...MOCK_COMMITTEES[idx], ...reqBody, uid: committeeId, updated_at: new Date().toISOString() };
      return jsonResponse(MOCK_COMMITTEES[idx]);
    }
    return jsonResponse({ error: 'Committee not found' }, 404);
  }

  // POST /api/committees/:id/invites
  match = matchRoute(url, '/api/committees/:id/invites');
  if (method === 'POST' && match) {
    const committeeId = match.params['id'];
    const { emails, message: inviteMsg, suggested_role } = reqBody || {};
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return jsonResponse({ error: 'At least one email address is required' }, 400);
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
      message: inviteMsg || undefined,
      suggested_role: suggested_role || undefined,
      created_at: now,
      expires_at: expiresAt,
    }));
    return jsonResponse(newInvites, 201);
  }

  // GET /api/committees/:id/invites
  match = matchRoute(url, '/api/committees/:id/invites');
  if (method === 'GET' && match) {
    return jsonResponse([]);
  }

  // ── Phase 3: Join Applications ─────────────────────────────────────

  // GET /api/committees/:id/applications
  match = matchRoute(url, '/api/committees/:id/applications');
  if (method === 'GET' && match) {
    const apps = MOCK_APPLICATIONS_BY_COMMITTEE[match.params['id']] || [];
    return jsonResponse(apps);
  }

  // POST /api/committees/:id/applications (submit application)
  match = matchRoute(url, '/api/committees/:id/applications');
  if (method === 'POST' && match) {
    const committeeId = match.params['id'];
    const newApp = {
      uid: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      committee_uid: committeeId,
      applicant_email: 'current.user@example.com',
      applicant_name: 'Current User',
      applicant_uid: 'current-user',
      status: 'pending',
      reason: reqBody?.reason || undefined,
      created_at: new Date().toISOString(),
    };
    if (!MOCK_APPLICATIONS_BY_COMMITTEE[committeeId]) {
      MOCK_APPLICATIONS_BY_COMMITTEE[committeeId] = [];
    }
    MOCK_APPLICATIONS_BY_COMMITTEE[committeeId].push(newApp);
    return jsonResponse(newApp, 201);
  }

  // POST /api/committees/:id/applications/:appId/approve
  match = matchRoute(url, '/api/committees/:id/applications/:appId/approve');
  if (method === 'POST' && match) {
    const committeeId = match.params['id'];
    const appId = match.params['appId'];
    const apps = MOCK_APPLICATIONS_BY_COMMITTEE[committeeId] || [];
    const app = apps.find((a: any) => a.uid === appId);
    if (app) {
      app.status = 'approved';
      app.reviewed_by_uid = 'current-user';
      app.reviewed_at = new Date().toISOString();
      return jsonResponse(app);
    }
    return jsonResponse({ error: 'Application not found' }, 404);
  }

  // POST /api/committees/:id/applications/:appId/reject
  match = matchRoute(url, '/api/committees/:id/applications/:appId/reject');
  if (method === 'POST' && match) {
    const committeeId = match.params['id'];
    const appId = match.params['appId'];
    const apps = MOCK_APPLICATIONS_BY_COMMITTEE[committeeId] || [];
    const app = apps.find((a: any) => a.uid === appId);
    if (app) {
      app.status = 'rejected';
      app.reviewed_by_uid = 'current-user';
      app.reviewed_at = new Date().toISOString();
      return jsonResponse(app);
    }
    return jsonResponse({ error: 'Application not found' }, 404);
  }

  // GET /api/committees/:id/documents
  match = matchRoute(url, '/api/committees/:id/documents');
  if (method === 'GET' && match) {
    const docs = MOCK_DOCUMENTS[match.params['id']] || [];
    return jsonResponse(docs);
  }

  // GET /api/meetings — service expects { data: Meeting[] } shape (via .pipe(map(r => r.data)))
  if (method === 'GET' && matchRoute(url, '/api/meetings')) {
    return jsonResponse({ data: MOCK_MEETINGS });
  }

  // GET /api/meetings/count
  if (method === 'GET' && matchRoute(url, '/api/meetings/count')) {
    return jsonResponse({ count: MOCK_MEETINGS.length });
  }

  // Catch-all for unhandled /api/* routes — return empty rather than letting it 404
  if (url.startsWith('/api/')) {
    console.warn(`[Dev Mock Interceptor] No handler for ${method} ${url} — returning empty`);
    return jsonResponse([], 200);
  }

  return null;
}

// ─── Interceptor ────────────────────────────────────────────────────

import { delay } from 'rxjs/operators';
import { of } from 'rxjs';

export const devMockDataInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  // Only intercept when: browser + non-production + useMockData enabled
  if (!isPlatformBrowser(platformId) || environment.production || !environment.useMockData) {
    return next(req);
  }

  // Only intercept /api/ requests
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  const response = handleMockRoute(req.method, req.url, req.body);

  if (response) {
    console.log(`[Dev Mock] ${req.method} ${req.url} → ${response.status}`);
    // Use delay(0) to ensure asynchronous delivery. Without this, the synchronous
    // `of()` emission can fire RxJS switchMap callbacks during Angular's toSignal()
    // construction, before all component signals are initialized.
    return of(response).pipe(delay(0));
  }

  // No matching mock route — pass through to server
  return next(req);
};
