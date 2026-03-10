#!/usr/bin/env node
// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * One-time script to update demo meeting dates to future values.
 * Run this with the dev server running at localhost:4200:
 *
 *   node scripts/update-demo-meetings.mjs
 *
 * The script:
 *  1. Fetches all meetings for the AI Ethics & Governance WG project
 *  2. Finds any with a past start_time
 *  3. Updates them to future dates (next 3 months, evenly spaced)
 *
 * Meeting IDs created for the demo: 92637257719, 91732309288, 96239267060, 97563419751
 */

const BASE_URL = 'http://localhost:4200';
const PROJECT_UID = 'a27394a3-7a6c-4d0f-9e0f-692d8753924f';
const DEMO_MEETING_IDS = ['92637257719', '91732309288', '96239267060', '97563419751'];

// Future dates: evenly spaced over the next 3 months
const futureDates = [
  new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),   // 2 weeks from now
  new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),   // 4 weeks from now
  new Date(Date.now() + 42 * 24 * 60 * 60 * 1000),   // 6 weeks from now
  new Date(Date.now() + 56 * 24 * 60 * 60 * 1000),   // 8 weeks from now
];

async function fetchMeetings() {
  const url = `${BASE_URL}/api/meetings?tags=project_uid:${PROJECT_UID}&limit=50`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`GET /api/meetings failed: ${resp.status} ${await resp.text()}`);
  const body = await resp.json();
  return Array.isArray(body) ? body : (body.data ?? []);
}

async function updateMeeting(id, startTime) {
  const url = `${BASE_URL}/api/meetings/${id}`;
  const payload = { start_time: startTime.toISOString() };
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const text = await resp.text();
  if (!resp.ok) throw new Error(`PUT /api/meetings/${id} failed: ${resp.status} ${text}`);
  return JSON.parse(text);
}

async function main() {
  console.log('Fetching meetings for demo project...');
  let meetings;
  try {
    meetings = await fetchMeetings();
  } catch (err) {
    console.error('❌ Could not fetch meetings. Is the dev server running at localhost:4200?');
    console.error(err.message);
    process.exit(1);
  }

  console.log(`Found ${meetings.length} total meetings.`);

  // Filter to demo meeting IDs
  const demoMeetings = meetings.filter((m) => DEMO_MEETING_IDS.includes(String(m.id)));
  if (demoMeetings.length === 0) {
    // Fallback: update any past meetings for this project
    const now = Date.now();
    const pastMeetings = meetings.filter((m) => m.start_time && new Date(m.start_time).getTime() <= now);
    if (pastMeetings.length === 0) {
      console.log('✅ No past meetings found — all meetings already have future dates!');
      return;
    }
    console.log(`Found ${pastMeetings.length} past meeting(s), updating to future dates...`);
    for (let i = 0; i < pastMeetings.length; i++) {
      const m = pastMeetings[i];
      const newDate = futureDates[i % futureDates.length];
      try {
        await updateMeeting(m.id, newDate);
        console.log(`  ✅ Updated meeting ${m.id} (${m.title || m.name}) → ${newDate.toISOString()}`);
      } catch (err) {
        console.error(`  ❌ Failed to update meeting ${m.id}: ${err.message}`);
      }
    }
    return;
  }

  console.log(`Found ${demoMeetings.length} demo meeting(s), updating to future dates...`);
  for (let i = 0; i < demoMeetings.length; i++) {
    const m = demoMeetings[i];
    const newDate = futureDates[i % futureDates.length];
    try {
      await updateMeeting(m.id, newDate);
      console.log(`  ✅ Updated meeting ${m.id} (${m.title || m.name}) → ${newDate.toISOString()}`);
    } catch (err) {
      console.error(`  ❌ Failed to update meeting ${m.id}: ${err.message}`);
    }
  }

  console.log('\nDone! Refresh localhost:4200/groups/cbf60a42-07db-4677-886c-2e51e9c82661 to see the meetings.');
}

main();
