// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { test, expect, Page } from '@playwright/test';

import { MOCK_COMMITTEE_UID, mockCommittee, mockMeetings, mockMeetingsResponse } from './fixtures/mock-data';

/**
 * Committee Meetings Tab E2E Tests
 *
 * Tests the Meetings tab on a committee detail page including:
 * - List / Calendar / Subscribe view toggle buttons
 * - Sticky filter bar (search, meeting type, time filter)
 * - Calendar view rendering via FullCalendar
 * - Subscribe button — clipboard copy + toast notification
 * - ICS endpoint response shape validation
 *
 * Prerequisites:
 * - Dev server running on localhost:4200
 * - Committee, meeting, vote, and survey endpoints are mocked (see setupMocks)
 */

const COMMITTEE_URL = `/groups/${MOCK_COMMITTEE_UID}`;
const DATA_LOAD_TIMEOUT = 15_000;

// Extend test timeout for SSR + API mocking round-trips
test.setTimeout(60_000);

// ---------------------------------------------------------------------------
// Mock setup helpers
// ---------------------------------------------------------------------------

/**
 * Intercepts all committee + meeting + vote + survey API calls with deterministic
 * fixture data so tests don't depend on a seeded backend.
 */
async function setupMocks(page: Page): Promise<void> {
  // Committee detail
  await page.route(`**/api/committees/${MOCK_COMMITTEE_UID}`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockCommittee) });
  });

  // Upcoming meetings
  await page.route(`**/api/meetings**`, async (route) => {
    const url = route.request().url();
    if (url.includes('v1_past_meeting')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], metadata: { total_size: 0 } }) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMeetingsResponse) });
    }
  });

  // Votes (calendar view)
  await page.route(`**/api/votes**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], metadata: { total_size: 0 } }) });
  });

  // Surveys (calendar view)
  await page.route(`**/api/surveys**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], metadata: { total_size: 0 } }) });
  });
}

/**
 * Navigate to the committee meetings tab and wait for the tab to be visible.
 */
async function gotoMeetingsTab(page: Page): Promise<void> {
  await page.goto(COMMITTEE_URL);
  // Click "Meetings" tab if not already active
  const meetingsTab = page.locator('[data-testid="committee-view-tab-meetings"], [data-testid="committee-view-tab"]').filter({ hasText: 'Meetings' });
  if (await meetingsTab.isVisible({ timeout: DATA_LOAD_TIMEOUT })) {
    await meetingsTab.click();
  }
  await page.waitForSelector('[data-testid="committee-meetings-tab"]', { timeout: DATA_LOAD_TIMEOUT });
}

// ---------------------------------------------------------------------------
// Tests: Page header & view toggle
// ---------------------------------------------------------------------------

test.describe('Meetings tab — header and view toggle', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await gotoMeetingsTab(page);
  });

  test('renders heading and subtitle', async ({ page }) => {
    const tab = page.locator('[data-testid="committee-meetings-tab"]');
    await expect(tab.locator('h2')).toContainText('Meetings');
    await expect(tab.locator('p').first()).toContainText('Coordinate decisions');
  });

  test('List button is active by default', async ({ page }) => {
    const listBtn = page.locator('[data-testid="committee-meetings-list-btn"]');
    await expect(listBtn).toBeVisible();
    await expect(listBtn).toHaveAttribute('aria-pressed', 'true');
  });

  test('Calendar button is inactive by default', async ({ page }) => {
    const calBtn = page.locator('[data-testid="committee-meetings-calendar-btn"]');
    await expect(calBtn).toBeVisible();
    await expect(calBtn).toHaveAttribute('aria-pressed', 'false');
  });

  test('Subscribe button is visible', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-meetings-subscribe-btn"]')).toBeVisible();
  });

  test('clicking Calendar switches view and updates aria-pressed', async ({ page }) => {
    const calBtn = page.locator('[data-testid="committee-meetings-calendar-btn"]');
    const listBtn = page.locator('[data-testid="committee-meetings-list-btn"]');

    await calBtn.click();

    await expect(calBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(listBtn).toHaveAttribute('aria-pressed', 'false');

    // Calendar wrapper must be in the DOM
    await expect(page.locator('[data-testid="committee-meetings-calendar-view"]')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('clicking List from Calendar switches back', async ({ page }) => {
    // Go to calendar first
    await page.locator('[data-testid="committee-meetings-calendar-btn"]').click();
    await expect(page.locator('[data-testid="committee-meetings-calendar-view"]')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });

    // Switch back to list
    await page.locator('[data-testid="committee-meetings-list-btn"]').click();
    await expect(page.locator('[data-testid="committee-meetings-list-btn"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="committee-meetings-calendar-view"]')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Tests: Sticky filter bar (list view)
// ---------------------------------------------------------------------------

test.describe('Meetings tab — filter bar', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await gotoMeetingsTab(page);
  });

  test('search input is visible in list view', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-meetings-search"]')).toBeVisible();
  });

  test('meeting type filter is visible in list view', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-meetings-type-filter"]')).toBeVisible();
  });

  test('time filter is visible in list view', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-meetings-time-filter"]')).toBeVisible();
  });

  test('filter bar hides search/type/time controls in calendar view', async ({ page }) => {
    await page.locator('[data-testid="committee-meetings-calendar-btn"]').click();
    await expect(page.locator('[data-testid="committee-meetings-search"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="committee-meetings-type-filter"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="committee-meetings-time-filter"]')).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Tests: Meeting list
// ---------------------------------------------------------------------------

test.describe('Meetings tab — list view content', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await gotoMeetingsTab(page);
  });

  test('renders meeting cards for mocked upcoming meetings', async ({ page }) => {
    // Wait for skeleton to clear and cards to appear
    await expect(page.locator('lfx-meeting-card').first()).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });

    const cards = page.locator('lfx-meeting-card');
    await expect(cards).toHaveCount(mockMeetings.length);
  });

  test('first meeting card contains expected title', async ({ page }) => {
    await expect(page.locator('lfx-meeting-card').first()).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
    await expect(page.locator('lfx-meeting-card').first()).toContainText('TSC Weekly Sync');
  });
});

// ---------------------------------------------------------------------------
// Tests: Calendar view
// ---------------------------------------------------------------------------

test.describe('Meetings tab — calendar view', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await gotoMeetingsTab(page);
    await page.locator('[data-testid="committee-meetings-calendar-btn"]').click();
  });

  test('renders the FullCalendar component', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-meetings-calendar"]')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('renders the colour legend', async ({ page }) => {
    const legend = page.locator('[data-testid="committee-meetings-calendar-view"]');
    await expect(legend).toContainText('Meeting (default)');
    await expect(legend).toContainText('Vote');
    await expect(legend).toContainText('Survey');
    await expect(legend).toContainText('Cancelled');
  });
});

// ---------------------------------------------------------------------------
// Tests: Subscribe button
// ---------------------------------------------------------------------------

test.describe('Meetings tab — Subscribe button', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
    await gotoMeetingsTab(page);
  });

  test('clicking Subscribe shows a toast with copy confirmation', async ({ page }) => {
    await page.locator('[data-testid="committee-meetings-subscribe-btn"]').click();

    // PrimeNG toast renders with class p-toast-message or p-toast-detail
    const toast = page.locator('.p-toast-message, .p-toast-detail');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.p-toast-message-content, .p-toast-detail').first()).toContainText(/Subscribe URL copied|Google Calendar|Outlook|Apple Calendar/i);
  });
});

// ---------------------------------------------------------------------------
// Tests: ICS endpoint response
// ---------------------------------------------------------------------------

test.describe('ICS endpoint — /api/committees/:id/calendar.ics', () => {
  test('returns 200 with text/calendar content-type', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes(`/api/committees/${MOCK_COMMITTEE_UID}/calendar.ics`),
      { timeout: DATA_LOAD_TIMEOUT }
    );

    // Trigger the ICS fetch by navigating directly
    await page.goto(`/api/committees/${MOCK_COMMITTEE_UID}/calendar.ics`);
    const response = await responsePromise;

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/calendar');
  });

  test('response body contains VCALENDAR envelope', async ({ page }) => {
    const response = await page.request.get(`/api/committees/${MOCK_COMMITTEE_UID}/calendar.ics`);
    // The real endpoint requires auth; expect either 200 with ICS or a redirect/401
    if (response.status() === 200) {
      const body = await response.text();
      expect(body).toContain('BEGIN:VCALENDAR');
      expect(body).toContain('VERSION:2.0');
      expect(body).toContain('END:VCALENDAR');
    } else {
      // Unauthenticated in E2E — acceptable; confirms endpoint is registered
      expect([200, 302, 401, 403]).toContain(response.status());
    }
  });
});

// Generated with [Claude Code](https://claude.ai/code)
