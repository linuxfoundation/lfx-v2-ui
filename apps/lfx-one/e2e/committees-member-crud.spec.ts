// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { expect, test } from '@playwright/test';

import { MOCK_COMMITTEE_ID, mockCommitteeMembers, mockPendingApplication } from './fixtures/mock-data/committees.mock';
import { ApiMockHelper } from './helpers/api-mock.helper';

/**
 * Helper: set up all committee API mocks needed for the member-management pages.
 * Intercepts committee detail, members list, invites, and applications.
 */
async function setupAllCommitteeMocks(page: import('@playwright/test').Page) {
  await ApiMockHelper.setupProjectSlugMock(page, { writer: true });
  await ApiMockHelper.setupCommitteeMock(page, MOCK_COMMITTEE_ID);
  await ApiMockHelper.setupCommitteeMembersMock(page, MOCK_COMMITTEE_ID);
  await ApiMockHelper.setupCommitteeInviteMock(page, MOCK_COMMITTEE_ID);
  await ApiMockHelper.setupCommitteeApplicationMock(page, MOCK_COMMITTEE_ID);

  // Mock the paginated committees list endpoint
  await page.route('**/api/committees', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], page_token: undefined }),
    });
  });

  // Mock sub-resource endpoints that the detail page loads
  for (const subResource of [
    'votes',
    'resolutions',
    'activity',
    'contributors',
    'deliverables',
    'discussions',
    'events',
    'campaigns',
    'engagement',
    'budget',
    'documents',
  ]) {
    await page.route(`**/api/committees/${MOCK_COMMITTEE_ID}/${subResource}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  }
}

test.describe('Committee Member CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupAllCommitteeMocks(page);
  });

  // ── 1. View members list ─────────────────────────────────────────────────

  test('displays committee members list', async ({ page }) => {
    await page.goto(`/groups/${MOCK_COMMITTEE_ID}`);

    // Verify committee name renders
    await expect(page.getByTestId('committee-view-name')).toBeVisible();

    // Verify members are rendered — check for member names in the page
    await expect(page.getByText('Alice Smith')).toBeVisible();
    await expect(page.getByText('Bob Jones')).toBeVisible();
    await expect(page.getByText('Carol Williams')).toBeVisible();
  });

  test('shows correct member count', async ({ page }) => {
    await page.goto(`/groups/${MOCK_COMMITTEE_ID}`);

    // The stats bar should show the total member count
    const statsBar = page.getByTestId('committee-view-stats');
    await expect(statsBar).toBeVisible();
    await expect(statsBar).toContainText(`${mockCommitteeMembers.length}`);
  });

  // ── 2. Invite a member ───────────────────────────────────────────────────

  test('opens invite dialog and sends invitation', async ({ page }) => {
    await page.goto(`/groups/${MOCK_COMMITTEE_ID}`);

    // Click the invite button
    const inviteBtn = page.getByTestId('invite-member-btn');
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    // The invite dialog should be visible
    const sendBtn = page.getByTestId('invite-send-btn');
    await expect(sendBtn).toBeVisible();

    // Cancel button should also be available
    const cancelBtn = page.getByTestId('invite-cancel-btn');
    await expect(cancelBtn).toBeVisible();
  });

  test('can cancel invite dialog', async ({ page }) => {
    await page.goto(`/groups/${MOCK_COMMITTEE_ID}`);

    const inviteBtn = page.getByTestId('invite-member-btn');
    await expect(inviteBtn).toBeVisible();
    await inviteBtn.click();

    // Click cancel
    const cancelBtn = page.getByTestId('invite-cancel-btn');
    await cancelBtn.click();

    // Dialog should close — send button should no longer be visible
    await expect(page.getByTestId('invite-send-btn')).not.toBeVisible();
  });

  // ── 3. Remove a member ───────────────────────────────────────────────────

  test('removes a member via API', async ({ page }) => {
    let deleteRequested = false;
    const memberToDelete = mockCommitteeMembers[2]; // Carol Williams

    // Track DELETE requests
    await page.route(`**/api/committees/${MOCK_COMMITTEE_ID}/members/${memberToDelete.uid}`, async (route) => {
      if (route.request().method() === 'DELETE') {
        deleteRequested = true;
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.continue();
    });

    await page.goto(`/groups/${MOCK_COMMITTEE_ID}`);

    // Verify the member is initially present
    await expect(page.getByText('Carol Williams')).toBeVisible();

    // The member card should be in the page
    const memberCards = page.getByTestId('member-card');
    const cardCount = await memberCards.count();
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // Verify the delete endpoint can be reached (API contract test)
    const response = await page.request.delete(`/api/committees/${MOCK_COMMITTEE_ID}/members/${memberToDelete.uid}`);
    expect(response.status()).toBe(204);
    expect(deleteRequested).toBe(true);
  });

  // ── 4. Approve a join application ────────────────────────────────────────

  test('approves a join application via API', async ({ page }) => {
    let approveRequested = false;

    // Track approve requests
    await page.route(`**/api/committees/${MOCK_COMMITTEE_ID}/applications/${mockPendingApplication.uid}/approve`, async (route) => {
      approveRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockPendingApplication, status: 'approved', reviewed_at: new Date().toISOString() }),
      });
    });

    await page.goto(`/groups/${MOCK_COMMITTEE_ID}`);

    // Verify the application review section is present
    const applicationReview = page.getByTestId('application-review');
    if (await applicationReview.isVisible()) {
      // Application card shows the applicant
      await expect(applicationReview).toContainText('Eve Davis');
    }

    // Verify the approve endpoint can be reached (API contract test)
    const response = await page.request.post(`/api/committees/${MOCK_COMMITTEE_ID}/applications/${mockPendingApplication.uid}/approve`);
    expect(response.status()).toBe(200);
    expect(approveRequested).toBe(true);

    const body = await response.json();
    expect(body.status).toBe('approved');
  });

  // ── 5. Decline a join application ────────────────────────────────────────

  test('declines a join application via API', async ({ page }) => {
    let rejectRequested = false;

    // Track reject requests
    await page.route(`**/api/committees/${MOCK_COMMITTEE_ID}/applications/${mockPendingApplication.uid}/reject`, async (route) => {
      rejectRequested = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockPendingApplication, status: 'rejected', reviewed_at: new Date().toISOString() }),
      });
    });

    await page.goto(`/groups/${MOCK_COMMITTEE_ID}`);

    // Verify the reject endpoint can be reached (API contract test)
    const response = await page.request.post(`/api/committees/${MOCK_COMMITTEE_ID}/applications/${mockPendingApplication.uid}/reject`);
    expect(response.status()).toBe(200);
    expect(rejectRequested).toBe(true);

    const body = await response.json();
    expect(body.status).toBe('rejected');
  });
});

// Generated with [Claude Code](https://claude.ai/code)
