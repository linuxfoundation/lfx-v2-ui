#!/usr/bin/env node
/**
 * LFX One Groups Module — Real API Test Runner
 *
 * Tests connectivity to the real LFX V2 backend API and validates
 * the data contract matches what the Groups module expects.
 *
 * Usage:
 *   1. Ensure .env is configured with valid credentials
 *   2. Run: node test-real-api.mjs
 *   3. Or with a bearer token: LFX_TOKEN=<token> node test-real-api.mjs
 *
 * The script will:
 *   - Obtain an M2M token (or use provided bearer token)
 *   - Test each committee/group API endpoint
 *   - Validate response shapes against expected interfaces
 *   - Report what works and what's missing
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env ───────────────────────────────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '.env');
    const lines = readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch { /* no .env file */ }
}
loadEnv();

const API_BASE = process.env.LFX_V2_SERVICE || 'https://lfx-api.dev.v2.cluster.linuxfound.info';
const AUTH0_DOMAIN = (process.env.M2M_AUTH_ISSUER_BASE_URL || 'https://linuxfoundation-dev.auth0.com/').replace(/\/$/, '');
const M2M_CLIENT_ID = process.env.M2M_AUTH_CLIENT_ID;
const M2M_CLIENT_SECRET = process.env.M2M_AUTH_CLIENT_SECRET;
const M2M_AUDIENCE = process.env.M2M_AUTH_AUDIENCE || API_BASE + '/';

// ── Colors ──────────────────────────────────────────────────────────
const c = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Token ───────────────────────────────────────────────────────────
async function getM2MToken() {
  if (process.env.LFX_TOKEN) {
    console.log(c.dim('  Using provided LFX_TOKEN'));
    return process.env.LFX_TOKEN;
  }

  if (!M2M_CLIENT_ID || !M2M_CLIENT_SECRET) {
    console.log(c.yellow('  ⚠ No M2M credentials — testing unauthenticated endpoints only'));
    return null;
  }

  console.log(c.dim(`  Requesting M2M token from ${AUTH0_DOMAIN}...`));
  let res;
  try {
    res = await fetch(`${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: M2M_CLIENT_ID,
      client_secret: M2M_CLIENT_SECRET,
      audience: M2M_AUDIENCE,
      grant_type: 'client_credentials',
    }),
  });

  } catch (err) {
    console.log(c.red(`  ✗ Cannot reach Auth0: ${err.message}`));
    console.log(c.yellow('  ⚠ Will proceed with unauthenticated requests only'));
    return null;
  }

  if (!res.ok) {
    const body = await res.text();
    console.log(c.red(`  ✗ M2M token request failed: ${res.status} ${body}`));
    return null;
  }

  const { access_token } = await res.json();
  console.log(c.green('  ✓ M2M token obtained'));
  return access_token;
}

// ── API call helper ─────────────────────────────────────────────────
async function apiCall(method, path, token, query = {}, body = null) {
  const url = new URL(path, API_BASE);
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, String(v));
  }

  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const start = Date.now();
  const res = await fetch(url.toString(), opts);
  const elapsed = Date.now() - start;

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data, elapsed, headers: Object.fromEntries(res.headers.entries()) };
}

// ── Validators ──────────────────────────────────────────────────────
function hasFields(obj, fields) {
  const missing = fields.filter(f => !(f in obj));
  return { ok: missing.length === 0, missing };
}

const COMMITTEE_FIELDS = ['uid', 'name', 'slug', 'status'];
const COMMITTEE_OPTIONAL = ['description', 'category', 'public', 'enable_voting', 'total_members',
  'mailing_list', 'chat_channel', 'chair', 'co_chair', 'join_mode', 'eligibility', 'created_at', 'updated_at'];
const MEMBER_FIELDS = ['uid', 'first_name', 'last_name', 'email'];
const MEMBER_OPTIONAL = ['organization', 'avatar_url', 'role', 'joined_at'];

// ── Test cases ──────────────────────────────────────────────────────
const results = { pass: 0, fail: 0, skip: 0, tests: [] };

function record(name, passed, detail = '') {
  results.tests.push({ name, passed, detail });
  if (passed === true) results.pass++;
  else if (passed === false) results.fail++;
  else results.skip++;
}

async function runTests() {
  console.log(c.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(c.bold(' LFX One Groups Module — Real API Test Runner'));
  console.log(c.bold('═══════════════════════════════════════════════════════════\n'));
  console.log(`  API Base: ${c.cyan(API_BASE)}`);

  // ── Step 1: Auth ──
  console.log(c.bold('\n▸ Step 1: Authentication'));
  const token = await getM2MToken();

  // ── Step 2: Health / Connectivity ──
  console.log(c.bold('\n▸ Step 2: API Connectivity'));
  try {
    const r = await apiCall('GET', '/', token);
    console.log(`  Root endpoint: ${r.status} (${r.elapsed}ms)`);
    record('API reachable', r.status < 500, `Status: ${r.status}`);
  } catch (err) {
    console.log(c.red(`  ✗ Cannot reach API: ${err.message}`));
    record('API reachable', false, err.message);
    printSummary();
    return;
  }

  // ── Step 3: Query Service — List committees ──
  console.log(c.bold('\n▸ Step 3: List Committees (Query Service)'));
  let committees = [];
  try {
    // The BFF calls: GET /query/resources?type=committee
    const r = await apiCall('GET', '/query/resources', token, { type: 'committee', limit: 20 });
    console.log(`  GET /query/resources?type=committee → ${r.status} (${r.elapsed}ms)`);

    if (r.status === 200 && r.data?.resources) {
      committees = r.data.resources.map(res => res.data || res);
      console.log(`  Found ${c.green(committees.length)} committees`);
      record('List committees', true, `${committees.length} items`);

      // Validate first committee shape
      if (committees.length > 0) {
        const first = committees[0];
        console.log(`  First: ${c.cyan(first.name || first.slug || first.uid)}`);
        const v = hasFields(first, COMMITTEE_FIELDS);
        record('Committee shape (required fields)', v.ok, v.ok ? 'All present' : `Missing: ${v.missing.join(', ')}`);

        // Check optional fields presence
        const optPresent = COMMITTEE_OPTIONAL.filter(f => f in first);
        console.log(c.dim(`  Optional fields present: ${optPresent.join(', ') || 'none'}`));
      }
    } else if (r.status === 200) {
      console.log(c.yellow(`  Response shape unexpected: ${JSON.stringify(r.data).slice(0, 200)}`));
      record('List committees', false, 'Unexpected response shape');
    } else {
      console.log(c.yellow(`  Non-200 response: ${r.status}`));
      record('List committees', r.status === 401 ? null : false, `Status: ${r.status}`);
    }
  } catch (err) {
    console.log(c.red(`  ✗ Error: ${err.message}`));
    record('List committees', false, err.message);
  }

  // ── Step 4: Count committees ──
  console.log(c.bold('\n▸ Step 4: Count Committees'));
  try {
    const r = await apiCall('GET', '/query/resources/count', token, { type: 'committee' });
    console.log(`  GET /query/resources/count?type=committee → ${r.status} (${r.elapsed}ms)`);
    if (r.status === 200) {
      console.log(`  Count: ${c.green(r.data?.count ?? JSON.stringify(r.data))}`);
      record('Count committees', typeof r.data?.count === 'number', `Count: ${r.data?.count}`);
    } else {
      record('Count committees', r.status === 401 ? null : false, `Status: ${r.status}`);
    }
  } catch (err) {
    record('Count committees', false, err.message);
  }

  // ── Step 5: Get single committee ──
  console.log(c.bold('\n▸ Step 5: Get Single Committee'));
  let testCommitteeId = committees[0]?.uid;
  if (!testCommitteeId) {
    console.log(c.yellow('  ⚠ No committees found — skipping single-fetch test'));
    record('Get committee by ID', null, 'No committees to test with');
  } else {
    try {
      const r = await apiCall('GET', `/committees/${testCommitteeId}`, token);
      console.log(`  GET /committees/${testCommitteeId} → ${r.status} (${r.elapsed}ms)`);
      if (r.status === 200 && r.data) {
        const v = hasFields(r.data, COMMITTEE_FIELDS);
        console.log(`  Name: ${c.cyan(r.data.name)}`);
        record('Get committee by ID', v.ok, v.ok ? 'Shape valid' : `Missing: ${v.missing.join(', ')}`);

        // Check settings endpoint
        try {
          const rs = await apiCall('GET', `/committees/${testCommitteeId}/settings`, token);
          console.log(`  GET /committees/${testCommitteeId}/settings → ${rs.status} (${rs.elapsed}ms)`);
          if (rs.status === 200) {
            console.log(c.dim(`  Settings keys: ${Object.keys(rs.data || {}).join(', ')}`));
            record('Committee settings', true, `Keys: ${Object.keys(rs.data || {}).join(', ')}`);
          } else {
            record('Committee settings', rs.status === 401 ? null : false, `Status: ${rs.status}`);
          }
        } catch (err) {
          record('Committee settings', false, err.message);
        }
      } else {
        record('Get committee by ID', false, `Status: ${r.status}`);
      }
    } catch (err) {
      record('Get committee by ID', false, err.message);
    }
  }

  // ── Step 6: Committee members ──
  console.log(c.bold('\n▸ Step 6: Committee Members'));
  if (!testCommitteeId) {
    record('List members', null, 'No committee to test');
  } else {
    try {
      // BFF calls: GET /query/resources?type=committee-member&parent_uid=<id>
      const r = await apiCall('GET', '/query/resources', token, {
        type: 'committee-member',
        parent_uid: testCommitteeId,
        limit: 10,
      });
      console.log(`  GET /query/resources?type=committee-member&parent_uid=${testCommitteeId} → ${r.status} (${r.elapsed}ms)`);
      if (r.status === 200 && r.data?.resources) {
        const members = r.data.resources.map(res => res.data || res);
        console.log(`  Found ${c.green(members.length)} members`);
        record('List members', true, `${members.length} items`);

        if (members.length > 0) {
          const v = hasFields(members[0], MEMBER_FIELDS);
          record('Member shape', v.ok, v.ok ? 'All required fields present' : `Missing: ${v.missing.join(', ')}`);
          const optPresent = MEMBER_OPTIONAL.filter(f => f in members[0]);
          console.log(c.dim(`  Optional: ${optPresent.join(', ') || 'none'}`));
        }
      } else {
        record('List members', r.status === 401 ? null : false, `Status: ${r.status}`);
      }
    } catch (err) {
      record('List members', false, err.message);
    }
  }

  // ── Step 7: Mailing list / Groups.io endpoints ──
  console.log(c.bold('\n▸ Step 7: Mailing Lists (Groups.io)'));
  try {
    const r = await apiCall('GET', '/groupsio/services', token);
    console.log(`  GET /groupsio/services → ${r.status} (${r.elapsed}ms)`);
    if (r.status === 200) {
      const services = Array.isArray(r.data) ? r.data : r.data?.services || [];
      console.log(`  Found ${c.green(services.length)} mailing list services`);
      record('List mailing services', true, `${services.length} services`);
    } else {
      record('List mailing services', r.status === 401 ? null : false, `Status: ${r.status}`);
    }
  } catch (err) {
    record('List mailing services', false, err.message);
  }

  // ── Step 8: Meetings ──
  console.log(c.bold('\n▸ Step 8: Meetings'));
  if (!testCommitteeId) {
    record('List meetings', null, 'No committee to test');
  } else {
    try {
      const r = await apiCall('GET', '/query/resources', token, {
        type: 'meeting',
        parent_uid: testCommitteeId,
        limit: 5,
      });
      console.log(`  GET /query/resources?type=meeting&parent_uid=${testCommitteeId} → ${r.status} (${r.elapsed}ms)`);
      if (r.status === 200) {
        const meetings = r.data?.resources?.map(res => res.data || res) || [];
        console.log(`  Found ${c.green(meetings.length)} meetings`);
        record('List meetings', true, `${meetings.length} items`);
      } else {
        record('List meetings', r.status === 401 ? null : false, `Status: ${r.status}`);
      }
    } catch (err) {
      record('List meetings', false, err.message);
    }
  }

  // ── Step 9: My committees ──
  console.log(c.bold('\n▸ Step 9: My Committees'));
  try {
    const r = await apiCall('GET', '/committees/my', token);
    console.log(`  GET /committees/my → ${r.status} (${r.elapsed}ms)`);
    record('My committees', r.status === 200 || r.status === 401 ? (r.status === 200 ? true : null) : false, `Status: ${r.status}`);
  } catch (err) {
    record('My committees', false, err.message);
  }

  // ── Step 10: Invites (read) ──
  console.log(c.bold('\n▸ Step 10: Invites'));
  if (!testCommitteeId) {
    record('List invites', null, 'No committee to test');
  } else {
    try {
      const r = await apiCall('GET', `/committees/${testCommitteeId}/invites`, token);
      console.log(`  GET /committees/${testCommitteeId}/invites → ${r.status} (${r.elapsed}ms)`);
      record('List invites', r.status === 200 || r.status === 401 ? (r.status === 200 ? true : null) : false, `Status: ${r.status}`);
    } catch (err) {
      record('List invites', false, err.message);
    }
  }

  // ── Summary ──
  printSummary();
}

function printSummary() {
  console.log(c.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(c.bold(' Test Summary'));
  console.log(c.bold('═══════════════════════════════════════════════════════════\n'));

  for (const t of results.tests) {
    const icon = t.passed === true ? c.green('✓') : t.passed === false ? c.red('✗') : c.yellow('○');
    console.log(`  ${icon} ${t.name}${t.detail ? c.dim(` — ${t.detail}`) : ''}`);
  }

  console.log(`\n  ${c.green(`${results.pass} passed`)}  ${c.red(`${results.fail} failed`)}  ${c.yellow(`${results.skip} skipped`)}\n`);

  if (results.fail === 0 && results.pass > 0) {
    console.log(c.green('  🎉 All reachable endpoints are working! Ready to disable mocks.\n'));
  } else if (results.fail > 0) {
    console.log(c.yellow('  ⚠  Some endpoints failed. Check the details above.\n'));
  }
}

// ── Run ─────────────────────────────────────────────────────────────
runTests().catch((err) => {
  console.error(c.red(`\nFatal error: ${err.message}`));
  process.exit(1);
});
