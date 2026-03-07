// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * MSW (Mock Service Worker) request handlers.
 *
 * Define API mock handlers here. These are shared across:
 * - Browser dev mode (service worker)
 * - SSR/Node.js contexts (setupServer)
 * - E2E tests (Playwright globalSetup)
 *
 * Usage:
 *   import { handlers } from './mocks/handlers';
 *
 * @see https://mswjs.io/docs/basics/mocking-responses
 *
 * Generated with [Claude Code](https://claude.ai/code)
 */

import { http, HttpResponse } from 'msw';

// ────────────────────────────────────────────────────────────
// Groups / Committees
// ────────────────────────────────────────────────────────────

const groupsHandlers = [
  http.get('/api/v2/groups', ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'all';

    return HttpResponse.json({
      data: mockGroups.filter((g) => type === 'all' || g.type === type),
      metadata: { totalCount: mockGroups.length },
    });
  }),

  http.get('/api/v2/groups/:id', ({ params }) => {
    const group = mockGroups.find((g) => g.id === params['id']);
    if (!group) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ data: group });
  }),

  http.get('/api/v2/groups/:id/members', ({ params }) => {
    return HttpResponse.json({
      data: mockGroupMembers,
      metadata: { totalCount: mockGroupMembers.length, groupId: params['id'] },
    });
  }),
];

// ────────────────────────────────────────────────────────────
// Meetings
// ────────────────────────────────────────────────────────────

const meetingsHandlers = [
  http.get('/api/v2/meetings', () => {
    return HttpResponse.json({
      data: mockMeetings,
      metadata: { totalCount: mockMeetings.length },
    });
  }),

  http.get('/api/v2/meetings/:id', ({ params }) => {
    const meeting = mockMeetings.find((m) => m.id === params['id']);
    if (!meeting) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ data: meeting });
  }),
];

// ────────────────────────────────────────────────────────────
// Combined handlers (export for use in browser.ts / server.ts)
// ────────────────────────────────────────────────────────────

export const handlers = [...groupsHandlers, ...meetingsHandlers];

// ────────────────────────────────────────────────────────────
// Mock data
// ────────────────────────────────────────────────────────────

const mockGroups = [
  {
    id: 'grp-001',
    name: 'Technical Advisory Council',
    type: 'committee',
    description: 'Oversees technical direction and architecture decisions.',
    memberCount: 12,
    status: 'active',
    projectSlug: 'cncf',
  },
  {
    id: 'grp-002',
    name: 'Security Working Group',
    type: 'working-group',
    description: 'Focuses on security best practices and vulnerability management.',
    memberCount: 25,
    status: 'active',
    projectSlug: 'openssf',
  },
  {
    id: 'grp-003',
    name: 'Governing Board',
    type: 'committee',
    description: 'Strategic governance and budget oversight.',
    memberCount: 8,
    status: 'active',
    projectSlug: 'lf-ai',
  },
];

const mockGroupMembers = [
  { id: 'mem-001', name: 'Alice Chen', email: 'alice@example.org', role: 'chair' },
  { id: 'mem-002', name: 'Bob Kumar', email: 'bob@example.org', role: 'member' },
  { id: 'mem-003', name: 'Carol Patel', email: 'carol@example.org', role: 'member' },
];

const mockMeetings = [
  {
    id: 'mtg-001',
    title: 'Weekly Standup',
    scheduledAt: '2026-03-10T10:00:00Z',
    duration: 30,
    status: 'scheduled',
    groupId: 'grp-001',
  },
  {
    id: 'mtg-002',
    title: 'Security Review',
    scheduledAt: '2026-03-12T14:00:00Z',
    duration: 60,
    status: 'scheduled',
    groupId: 'grp-002',
  },
];
