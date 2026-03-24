// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { expect, Page, test } from '@playwright/test';

import { getAllMockCommittees, getMyMockCommittees, mockCommittees } from '../fixtures/mock-data';

/**
 * Helper to set up committee API mocks for the dashboard page.
 * Intercepts all /api/committees* endpoints with test data.
 */
async function setupDashboardMocks(page: Page, options?: { writer?: boolean; myCommittees?: boolean }) {
  const committees = getAllMockCommittees();
  const myCommittees = options?.myCommittees !== false ? getMyMockCommittees() : [];

  // Mock project slug endpoint (dashboard needs project context)
  await page.route('**/api/projects/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/search')) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        uid: 'a09f1234-f567-4abc-b890-1234567890ab',
        slug: 'aswf',
        name: 'Academy Software Foundation (ASWF)',
        writer: options?.writer ?? true,
      }),
    });
  });

  // Mock all committees list
  await page.route('**/api/committees?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(committees),
    });
  });

  // Mock committee count
  await page.route('**/api/committees/count*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ count: committees.length }),
    });
  });

  // Mock my-committees
  await page.route('**/api/committees/my-committees*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(myCommittees),
    });
  });
}

test.describe('Committee Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
  });

  test('should load and display the dashboard page', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Page title should be visible
    await expect(page.getByRole('heading', { name: 'Groups', level: 1 })).toBeVisible();

    // Description text should be visible
    const description = page.locator('[data-testid="dashboard-hero-description"]');
    await expect(description).toBeVisible();
    await expect(description).toContainText('Manage groups');
  });

  test('should display statistics bar with correct counts', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    const statsBar = page.locator('[data-testid="dashboard-stats-bar"]');
    await expect(statsBar).toBeVisible();

    // Verify stats cards exist (Total, Public, Active Voting, Total Members)
    const statCards = statsBar.locator('lfx-card');
    await expect(statCards).toHaveCount(4);

    // Total groups count
    await expect(statsBar).toContainText('5');
    // Public groups (3 public committees in mock data)
    await expect(statsBar).toContainText('3');
    // Total Members
    await expect(statsBar).toContainText('Total Members');
  });

  test('should display "My Groups" section for authenticated users', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // My Groups heading should be visible
    await expect(page.getByRole('heading', { name: /My Groups/i })).toBeVisible();

    // Should show the count badge
    await expect(page.getByText('2', { exact: true })).toBeVisible();

    // Should display the user's committees as cards
    await expect(page.getByText('TAC')).toBeVisible();
    await expect(page.getByText('CI Working Group')).toBeVisible();
  });

  test('should display my committee cards with role badges', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Chair role badge should appear for TAC
    await expect(page.getByText('Chair')).toBeVisible();
    // Member role badge for CI WG
    await expect(page.getByText('Member')).toBeVisible();
  });

  test('should display my committee cards with member count and voting info', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Member counts visible on cards
    await expect(page.getByText('12 members')).toBeVisible();
    await expect(page.getByText('8 members')).toBeVisible();

    // Voting indicator for TAC (voting enabled)
    await expect(page.getByText('Voting').first()).toBeVisible();
  });

  test('should display "All Groups" table with correct data', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // All Groups heading
    await expect(page.getByRole('heading', { name: /All Groups/i })).toBeVisible();

    // Table should be visible
    const table = page.locator('[data-testid="committee-dashboard-table"]');
    await expect(table).toBeVisible();

    // Table headers
    await expect(table.getByText('Name')).toBeVisible();
    await expect(table.getByText('Type')).toBeVisible();
    await expect(table.getByText('Members')).toBeVisible();
    await expect(table.getByText('Voting')).toBeVisible();
    await expect(table.getByText('Channels')).toBeVisible();
  });

  test('should display all committees in the table', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    const table = page.locator('[data-testid="committee-dashboard-table"]');

    // Each committee should have a row
    for (const committee of mockCommittees) {
      const row = table.locator(`[data-testid="committee-row-${committee.uid}"]`);
      await expect(row).toBeVisible();
      await expect(row).toContainText(committee.name);
    }
  });

  test('should show private lock icon for private committees', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Governing Board is private — should show lock icon
    const boardRow = page.locator('[data-testid="committee-row-comm-002-board"]');
    await expect(boardRow).toBeVisible();
    await expect(boardRow.locator('i.fa-lock')).toBeVisible();
  });

  test('should show voting enabled indicator for voting committees', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // TAC has voting enabled — should show check icon
    const tacRow = page.locator('[data-testid="committee-row-comm-001-tac"]');
    await expect(tacRow.locator('i.fa-check')).toBeVisible();

    // CI WG has voting disabled — should show dash
    const ciRow = page.locator('[data-testid="committee-row-comm-003-wg-ci"]');
    await expect(ciRow.getByText('—')).toBeVisible();
  });

  test('should show "Create Group" button for users with write access', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('[data-testid="committee-new-cta"]');
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toContainText('Create');
  });

  test('should hide "Create Group" button for read-only users', async ({ page }) => {
    // Re-setup mocks with writer=false
    await setupDashboardMocks(page, { writer: false });
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    const createBtn = page.locator('[data-testid="committee-new-cta"]');
    await expect(createBtn).toBeHidden();
  });

  test('should navigate to committee detail on row click', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Click on the TAC committee name link
    const tacRow = page.locator('[data-testid="committee-row-comm-001-tac"]');
    await tacRow.locator('a').first().click();

    await page.waitForURL(/\/groups\/comm-001-tac/);
    expect(page.url()).toContain('/groups/comm-001-tac');
  });

  test('should navigate to committee detail from My Groups card', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Click the TAC card in My Groups
    await page.getByRole('link', { name: /Open TAC/i }).click();

    await page.waitForURL(/\/groups\/comm-001-tac/);
    expect(page.url()).toContain('/groups/comm-001-tac');
  });
});

test.describe('Committee Dashboard - Search and Filters', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
  });

  test('should filter committees by search text', async ({ page }) => {
    const searchInput = page.locator('[data-testid="committee-search-input"] input');
    await searchInput.fill('Technical');

    // TAC should be visible (matches "Technical Advisory Council")
    await expect(page.locator('[data-testid="committee-row-comm-001-tac"]')).toBeVisible();

    // Non-matching committees should be filtered out
    await expect(page.locator('[data-testid="committee-row-comm-004-sig-docs"]')).toBeHidden();
  });

  test('should filter committees by category type', async ({ page }) => {
    // Open the category filter dropdown
    const typeFilter = page.locator('[data-testid="committee-type-filter"]');
    await typeFilter.click();

    // Select "Working Group"
    await page.getByText('Working Group', { exact: true }).click();

    // Only WG committee should be visible
    await expect(page.locator('[data-testid="committee-row-comm-003-wg-ci"]')).toBeVisible();
    await expect(page.locator('[data-testid="committee-row-comm-002-board"]')).toBeHidden();
  });

  test('should filter committees by voting status', async ({ page }) => {
    const votingFilter = page.locator('[data-testid="committee-voting-status-filter"]');
    await votingFilter.click();

    // Select "Enabled"
    await page.getByText('Enabled', { exact: true }).click();

    // Only voting-enabled committees should be visible
    await expect(page.locator('[data-testid="committee-row-comm-001-tac"]')).toBeVisible();
    await expect(page.locator('[data-testid="committee-row-comm-002-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="committee-row-comm-003-wg-ci"]')).toBeHidden();
  });

  test('should show empty state when no committees match search', async ({ page }) => {
    const searchInput = page.locator('[data-testid="committee-search-input"] input');
    await searchInput.fill('zzzznonexistent');

    await expect(page.getByText(/No groups found/i)).toBeVisible();
  });

  test('should clear search filter', async ({ page }) => {
    const searchInput = page.locator('[data-testid="committee-search-input"] input');
    await searchInput.fill('Technical');

    // Only TAC visible
    await expect(page.locator('[data-testid="committee-row-comm-001-tac"]')).toBeVisible();

    // Clear the search
    await searchInput.clear();

    // All committees should reappear
    for (const committee of mockCommittees) {
      await expect(page.locator(`[data-testid="committee-row-${committee.uid}"]`)).toBeVisible();
    }
  });
});

test.describe('Committee Dashboard - Admin Actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page, { writer: true });
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
  });

  test('should show edit button for each committee when user is admin', async ({ page }) => {
    for (const committee of mockCommittees) {
      const editBtn = page.locator(`[data-testid="committee-edit-${committee.uid}"]`);
      await expect(editBtn).toBeVisible();
    }
  });

  test('should navigate to edit page when edit button is clicked', async ({ page }) => {
    const editLink = page.locator(`[data-testid="committee-edit-comm-001-tac"]`).locator('..');
    await editLink.click();

    await page.waitForURL(/\/groups\/comm-001-tac\/edit/);
    expect(page.url()).toContain('/groups/comm-001-tac/edit');
  });

  test('should navigate to create page when create button is clicked', async ({ page }) => {
    const createBtn = page.locator('[data-testid="committee-new-cta"]');
    await createBtn.click();

    await page.waitForURL(/\/groups\/create/);
    expect(page.url()).toContain('/groups/create');
  });
});

test.describe('Committee Dashboard - Non-Admin Actions', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page, { writer: false });
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
  });

  test('should show Join button for open public committees', async ({ page }) => {
    // CI WG is public + open join
    const joinBtn = page.locator('[data-testid="committee-join-comm-003-wg-ci"]');
    await expect(joinBtn).toBeVisible();
    await expect(joinBtn).toContainText('Join');
  });

  test('should show Request button for application-mode committees', async ({ page }) => {
    // TAC is public + application join mode
    const requestBtn = page.locator('[data-testid="committee-join-comm-001-tac"]');
    await expect(requestBtn).toBeVisible();
    await expect(requestBtn).toContainText('Request');
  });

  test('should show "Invite only" label for invite-only committees', async ({ page }) => {
    // Governing Board is invite-only but private, so shows "Private"
    const boardRow = page.locator('[data-testid="committee-row-comm-002-board"]');
    await expect(boardRow.getByText(/Private|Invite only/)).toBeVisible();
  });

  test('should show "Joined" badge for committees user belongs to', async ({ page }) => {
    await setupDashboardMocks(page, { writer: false, myCommittees: true });
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // TAC is one of user's committees
    const tacRow = page.locator('[data-testid="committee-row-comm-001-tac"]');
    await expect(tacRow.getByText('Joined')).toBeVisible();
  });
});

test.describe('Committee Dashboard - Empty State', () => {
  test('should show empty state when no committees exist', async ({ page }) => {
    // Mock with empty committees
    await page.route('**/api/projects/*', async (route) => {
      const url = route.request().url();
      if (url.includes('/search')) {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          uid: 'a09f1234-f567-4abc-b890-1234567890ab',
          slug: 'aswf',
          name: 'Academy Software Foundation (ASWF)',
          writer: true,
        }),
      });
    });
    await page.route('**/api/committees?*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route('**/api/committees/count*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: 0 }) });
    });
    await page.route('**/api/committees/my-committees*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Should show the empty state message
    await expect(page.getByText(/no groups/i)).toBeVisible();
  });
});

// Generated with [Claude Code](https://claude.ai/code)
