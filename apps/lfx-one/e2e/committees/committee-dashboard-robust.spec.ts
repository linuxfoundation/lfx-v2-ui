// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { expect, Page, test } from '@playwright/test';

import { getAllMockCommittees, getMyMockCommittees } from '../fixtures/mock-data';

/**
 * Structural tests for the Committee Dashboard.
 * These verify component architecture, Angular custom elements,
 * data-testid attributes, and LFX component usage.
 */

async function setupDashboardMocks(page: Page) {
  const committees = getAllMockCommittees();
  const myCommittees = getMyMockCommittees();

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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(committees) });
  });

  await page.route('**/api/committees/count*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ count: committees.length }) });
  });

  await page.route('**/api/committees/my-committees*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(myCommittees) });
  });
}

test.describe('Committee Dashboard - Structural Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
  });

  test('should render required data-testid attributes on dashboard', async ({ page }) => {
    const requiredTestIds = ['dashboard-hero-description', 'dashboard-stats-bar', 'committee-search-input', 'committee-type-filter', 'committee-voting-status-filter', 'committee-dashboard-table'];

    for (const testId of requiredTestIds) {
      await expect(page.locator(`[data-testid="${testId}"]`), `Missing data-testid="${testId}"`).toBeAttached();
    }
  });

  test('should render dynamic committee row test IDs', async ({ page }) => {
    const committees = getAllMockCommittees();
    for (const committee of committees) {
      await expect(page.locator(`[data-testid="committee-row-${committee.uid}"]`), `Missing row for ${committee.name}`).toBeAttached();
    }
  });

  test('should use lfx-card components for statistics', async ({ page }) => {
    const statsBar = page.locator('[data-testid="dashboard-stats-bar"]');
    const cards = statsBar.locator('lfx-card');
    await expect(cards).toHaveCount(4);

    // Verify each card renders as the custom element
    for (let i = 0; i < 4; i++) {
      const tagName = await cards.nth(i).evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe('lfx-card');
    }
  });

  test('should use lfx-table component for committee list', async ({ page }) => {
    const table = page.locator('[data-testid="committee-dashboard-table"]');
    const tagName = await table.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('lfx-table');
  });

  test('should use lfx-input-text for search input', async ({ page }) => {
    const search = page.locator('[data-testid="committee-search-input"]');
    const tagName = await search.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('lfx-input-text');
  });

  test('should use lfx-select for filter dropdowns', async ({ page }) => {
    const typeFilter = page.locator('[data-testid="committee-type-filter"]');
    const votingFilter = page.locator('[data-testid="committee-voting-status-filter"]');

    expect(await typeFilter.evaluate((el) => el.tagName.toLowerCase())).toBe('lfx-select');
    expect(await votingFilter.evaluate((el) => el.tagName.toLowerCase())).toBe('lfx-select');
  });

  test('should use lfx-tag for category badges in table rows', async ({ page }) => {
    const firstRow = page.locator('[data-testid="committee-row-comm-001-tac"]');
    const tags = firstRow.locator('lfx-tag');
    // Should have at least a category tag
    expect(await tags.count()).toBeGreaterThanOrEqual(1);
  });

  test('should use lfx-button for create CTA', async ({ page }) => {
    const cta = page.locator('[data-testid="committee-new-cta"]');
    const tagName = await cta.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('lfx-button');
  });

  test('should render committee table with correct column headers', async ({ page }) => {
    const table = page.locator('[data-testid="committee-dashboard-table"]');
    const headers = table.locator('th');

    const expectedHeaders = ['Name', 'Type', 'Description', 'Members', 'Channels', 'Voting', 'Last Updated'];
    for (const header of expectedHeaders) {
      await expect(table.getByText(header, { exact: false })).toBeAttached();
    }
  });

  test('should render My Groups section with card grid layout', async ({ page }) => {
    // My Groups section uses a 3-column grid on desktop
    const grid = page.locator('.grid.grid-cols-1.lg\\:grid-cols-3, .grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
    await expect(grid).toBeAttached();
  });

  test('should render channel icons in table rows', async ({ page }) => {
    // TAC has both mailing list and chat channel
    const tacRow = page.locator('[data-testid="committee-row-comm-001-tac"]');
    // Should have envelope icon (mailing list)
    await expect(tacRow.locator('i.fa-envelope').first()).toBeAttached();
    // Should have comment icon (chat)
    await expect(tacRow.locator('i.fa-comment').first()).toBeAttached();
  });

  test('should render accessible aria labels on channel links', async ({ page }) => {
    const tacRow = page.locator('[data-testid="committee-row-comm-001-tac"]');
    await expect(tacRow.locator('[aria-label="Mailing list"]')).toBeAttached();
    await expect(tacRow.locator('[aria-label="Chat channel"]')).toBeAttached();
  });
});

test.describe('Committee Dashboard - Responsive Structure', () => {
  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
  });

  test('should adapt stats bar to 2 columns on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    const statsBar = page.locator('[data-testid="dashboard-stats-bar"]');
    await expect(statsBar).toBeVisible();
    // On mobile the grid should have grid-cols-2 class
    await expect(statsBar).toHaveClass(/grid-cols-2/);
  });

  test('should stack filter controls on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    // Search and filters should still be visible
    await expect(page.locator('[data-testid="committee-search-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="committee-type-filter"]')).toBeVisible();
  });
});

// Generated with [Claude Code](https://claude.ai/code)
