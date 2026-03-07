/**
 * Standalone Mock API Server for LFX One Development
 *
 * Serves mock data for client-side API calls during local development.
 * Run with: node mock-api-server.mjs
 * Used in conjunction with proxy.conf.json to forward /api/* from Angular dev server.
 */

import express from 'express';

const app = express();
app.use(express.json());

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
    chair: { uid: 'mem-001', first_name: 'Sarah', last_name: 'Chen', email: 'sarah.chen@techcorp.com', organization: 'TechCorp', avatar_url: '', elected_date: '2024-01-15T00:00:00Z' },
    co_chair: { uid: 'mem-002', first_name: 'James', last_name: 'Rodriguez', email: 'jrodriguez@cloudio.dev', organization: 'Cloud.io', avatar_url: '', elected_date: '2024-01-15T00:00:00Z' },
    business_email_required: false,
    sso_group_enabled: false,
    is_audit_enabled: true,
    show_meeting_attendees: true,
    member_visibility: 'public',
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
    chair: { uid: 'mem-010', first_name: 'Alex', last_name: 'Morgan', email: 'alex.morgan@techcorp.com', organization: 'TechCorp', avatar_url: '', elected_date: '2023-06-01T00:00:00Z' },
    co_chair: null,
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
    chair: { uid: 'mem-030', first_name: 'Anna', last_name: 'Kowalski', email: 'anna.k@securityfirst.io', organization: 'SecurityFirst', avatar_url: '', elected_date: '2024-03-01T00:00:00Z' },
    co_chair: { uid: 'mem-031', first_name: 'Marcus', last_name: 'Johnson', email: 'mjohnson@cybershield.io', organization: 'CyberShield', avatar_url: '', elected_date: '2024-03-01T00:00:00Z' },
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
    chair: { uid: 'mem-040', first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@doctools.io', organization: 'DocTools', avatar_url: '', elected_date: '2024-07-01T00:00:00Z' },
    co_chair: null,
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
    chair: { uid: 'mem-050', first_name: 'Robert', last_name: 'Kim', email: 'rkim@lawtech.com', organization: 'LawTech', avatar_url: '', elected_date: '2023-03-01T00:00:00Z' },
    co_chair: null,
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
    chair: { uid: 'mem-060', first_name: 'Lisa', last_name: 'Wang', email: 'lwang@cloudnative.dev', organization: 'CloudNative Inc.', avatar_url: '', elected_date: '2024-04-01T00:00:00Z' },
    co_chair: { uid: 'mem-061', first_name: 'Tom', last_name: 'Fischer', email: 'tfischer@kubeops.io', organization: 'KubeOps', avatar_url: '', elected_date: '2024-04-01T00:00:00Z' },
  },
];

const MOCK_MEMBERS_BY_COMMITTEE = {
  'mock-committee-001': [
    { uid: 'mem-001', first_name: 'Sarah', last_name: 'Chen', email: 'sarah.chen@techcorp.com', organization: { name: 'TechCorp', website: 'https://techcorp.com' }, role: { name: 'Chair', uid: 'role-chair' }, voting: { status: 'Active', eligible: true }, created_at: '2023-06-15T10:00:00Z' },
    { uid: 'mem-002', first_name: 'James', last_name: 'Rodriguez', email: 'jrodriguez@cloudio.dev', organization: { name: 'Cloud.io', website: 'https://cloudio.dev' }, role: { name: 'Co-Chair', uid: 'role-cochair' }, voting: { status: 'Active', eligible: true }, created_at: '2023-06-15T10:00:00Z' },
    { uid: 'mem-003', first_name: 'Emily', last_name: 'Park', email: 'epark@datavault.com', organization: { name: 'DataVault', website: 'https://datavault.com' }, role: { name: 'Voting Representative', uid: 'role-voting-rep' }, voting: { status: 'Active', eligible: true }, created_at: '2023-07-01T10:00:00Z' },
    { uid: 'mem-004', first_name: 'Michael', last_name: 'Brown', email: 'mbrown@ossinc.org', organization: { name: 'OSS Inc.', website: 'https://ossinc.org' }, role: { name: 'Voting Representative', uid: 'role-voting-rep' }, voting: { status: 'Active', eligible: true }, created_at: '2023-08-15T10:00:00Z' },
    { uid: 'mem-005', first_name: 'Diana', last_name: 'Rivera', email: 'drivera@nexgen.tech', organization: { name: 'NexGen Tech', website: null }, role: { name: 'Alternate', uid: 'role-alternate' }, voting: { status: 'Inactive', eligible: false }, created_at: '2023-09-01T10:00:00Z' },
  ],
  'mock-committee-004': [
    { uid: 'mem-030', first_name: 'Anna', last_name: 'Kowalski', email: 'anna.k@securityfirst.io', organization: { name: 'SecurityFirst', website: 'https://securityfirst.io' }, role: { name: 'Chair', uid: 'role-chair' }, voting: { status: 'Active', eligible: true }, created_at: '2024-01-08T14:00:00Z' },
    { uid: 'mem-031', first_name: 'Marcus', last_name: 'Johnson', email: 'mjohnson@cybershield.io', organization: { name: 'CyberShield', website: 'https://cybershield.io' }, role: { name: 'Co-Chair', uid: 'role-cochair' }, voting: { status: 'Active', eligible: true }, created_at: '2024-01-08T14:00:00Z' },
    { uid: 'mem-032', first_name: 'Yuki', last_name: 'Tanaka', email: 'ytanaka@safecode.jp', organization: { name: 'SafeCode', website: null }, role: { name: 'Contributor', uid: 'role-contributor' }, voting: { status: 'Active', eligible: true }, created_at: '2024-02-01T10:00:00Z' },
  ],
};

const MOCK_DOCUMENTS = {
  'mock-committee-001': [
    { uid: 'doc-001', name: 'Charter Document', type: 'charter', url: '#', created_at: '2023-06-15T10:00:00Z', updated_at: '2024-01-20T14:00:00Z' },
    { uid: 'doc-002', name: 'Q4 2024 Meeting Minutes', type: 'minutes', url: '#', created_at: '2024-12-15T10:00:00Z', updated_at: '2024-12-15T10:00:00Z' },
  ],
};

const MOCK_MEETINGS = [
  { uid: 'mtg-001', name: 'Board Monthly Call', start_time: '2026-04-15T16:00:00Z', duration: 60, status: 'scheduled', visibility: 'private', attendees: 18, committees: [{ uid: 'mock-committee-001', name: 'Gold Member Voting Class' }] },
  { uid: 'mtg-002', name: 'TAC Review Session', start_time: '2026-04-12T14:00:00Z', duration: 90, status: 'scheduled', visibility: 'public', attendees: 10, committees: [{ uid: 'mock-committee-002', name: 'Technical Advisory Council' }] },
  { uid: 'mtg-003', name: 'Security WG Standup', start_time: '2026-04-10T17:00:00Z', duration: 30, status: 'scheduled', visibility: 'private', attendees: 8, committees: [{ uid: 'mock-committee-004', name: 'Security Working Group' }] },
  { uid: 'mtg-004', name: 'Board Quarterly Review', start_time: '2026-05-01T15:00:00Z', duration: 120, status: 'scheduled', visibility: 'private', attendees: 22, committees: [{ uid: 'mock-committee-001', name: 'Gold Member Voting Class' }] },
];

const MOCK_PROJECTS = [
  { uid: 'proj-001', name: 'AAIF', slug: 'aaif', status: 'active', logo_url: '' },
];

// ─── Routes ─────────────────────────────────────────────────────────

// Projects
app.get('/api/projects', (req, res) => {
  console.log('[Mock API] GET /api/projects');
  res.json(MOCK_PROJECTS);
});

// Committees list
app.get('/api/committees', (req, res) => {
  console.log('[Mock API] GET /api/committees');
  res.json(MOCK_COMMITTEES);
});

app.get('/api/committees/count', (req, res) => {
  res.json({ count: MOCK_COMMITTEES.length });
});

// Committee detail
app.get('/api/committees/:id', (req, res) => {
  const committee = MOCK_COMMITTEES.find(c => c.uid === req.params.id);
  if (committee) {
    console.log(`[Mock API] GET /api/committees/${req.params.id} → ${committee.name}`);
    res.json(committee);
  } else {
    console.log(`[Mock API] GET /api/committees/${req.params.id} → 404`);
    res.status(404).json({ error: 'Committee not found' });
  }
});

// Committee members
app.get('/api/committees/:id/members', (req, res) => {
  const members = MOCK_MEMBERS_BY_COMMITTEE[req.params.id] || [
    { uid: 'mem-default-1', first_name: 'Default', last_name: 'Member', email: 'default@example.com', organization: { name: 'Example Org', website: null }, role: { name: 'Member', uid: 'role-member' }, voting: { status: 'Active', eligible: true }, created_at: new Date().toISOString() },
  ];
  console.log(`[Mock API] GET /api/committees/${req.params.id}/members → ${members.length} members`);
  res.json(members);
});

// Committee documents
app.get('/api/committees/:id/documents', (req, res) => {
  const docs = MOCK_DOCUMENTS[req.params.id] || [];
  console.log(`[Mock API] GET /api/committees/${req.params.id}/documents → ${docs.length} docs`);
  res.json(docs);
});

// Create member
app.post('/api/committees/:id/members', (req, res) => {
  const committeeId = req.params.id;
  const newMember = {
    uid: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...req.body,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (!MOCK_MEMBERS_BY_COMMITTEE[committeeId]) {
    MOCK_MEMBERS_BY_COMMITTEE[committeeId] = [];
  }
  MOCK_MEMBERS_BY_COMMITTEE[committeeId].push(newMember);
  const committee = MOCK_COMMITTEES.find(c => c.uid === committeeId);
  if (committee) committee.total_members++;
  console.log(`[Mock API] POST /api/committees/${committeeId}/members → created ${newMember.uid}`);
  res.status(201).json(newMember);
});

// Update member
app.put('/api/committees/:id/members/:memberId', (req, res) => {
  const { id: committeeId, memberId } = req.params;
  const members = MOCK_MEMBERS_BY_COMMITTEE[committeeId] || [];
  const idx = members.findIndex(m => m.uid === memberId);
  if (idx >= 0) {
    members[idx] = { ...members[idx], ...req.body, uid: memberId, updated_at: new Date().toISOString() };
    console.log(`[Mock API] PUT /api/committees/${committeeId}/members/${memberId} → updated`);
    res.json(members[idx]);
  } else {
    res.status(404).json({ error: 'Member not found' });
  }
});

// Delete member
app.delete('/api/committees/:id/members/:memberId', (req, res) => {
  const { id: committeeId, memberId } = req.params;
  const members = MOCK_MEMBERS_BY_COMMITTEE[committeeId] || [];
  const idx = members.findIndex(m => m.uid === memberId);
  if (idx >= 0) {
    members.splice(idx, 1);
    const committee = MOCK_COMMITTEES.find(c => c.uid === committeeId);
    if (committee) committee.total_members--;
    console.log(`[Mock API] DELETE /api/committees/${committeeId}/members/${memberId} → removed`);
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Member not found' });
  }
});

// Meetings
app.get('/api/meetings', (req, res) => {
  console.log('[Mock API] GET /api/meetings');
  res.json(MOCK_MEETINGS);
});

app.get('/api/meetings/count', (req, res) => {
  res.json({ count: MOCK_MEETINGS.length });
});

// Catch-all for unknown API routes
app.all('/api/*', (req, res) => {
  console.log(`[Mock API] ${req.method} ${req.url} → 404 (no mock handler)`);
  res.status(404).json({ error: 'Not found', path: req.url });
});

// ─── Start ──────────────────────────────────────────────────────────

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`\n🔧 Mock API Server running at http://localhost:${PORT}`);
  console.log(`   Serving ${MOCK_COMMITTEES.length} committees, ${MOCK_MEETINGS.length} meetings`);
  console.log(`   Use proxy.conf.json to forward /api/* from Angular dev server\n`);
});
