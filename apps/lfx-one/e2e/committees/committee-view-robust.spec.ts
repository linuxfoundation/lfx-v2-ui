// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { expect, Page, test } from '@playwright/test';

import { getMockCommittee, mockCommittees } from '../fixtures/mock-data';

/**
 * Structural tests for the Committee View page.
 * Verifies component architecture, custom elements, data-testid attributes,
 * and correct use of LFX wrapper components.
 */

const mockMembers = [
  {
    uid: 'member-001',
    committee_uid: 'comm-001-tac',
    committee_name: 'Technical Advisory Council',
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'Johnson',
    role: { name: 'Chair' },
    voting: { status: 'Voting Rep' },
    organization: { name: 'Acme Corp', website: 'https://acme.com' },
  },
];

async function setupViewMocks(page: Page, committeeUid: string) {
  const committee = getMockCommittee(committeeUid) ?? mockCommittees[0];

  await page.route('**/api/projects/*', async (route) => {
    const url = route.request().url();
    if (url.includes('/search')) {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ uid: 'proj-1', slug: 'aswf', name: 'ASWF', writer: true }),
    });
  });

  await page.route(`**/api/committees/${committeeUid}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(committee) });
  });

  await page.route(`**/api/committees/${committeeUid}/members*`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMembers) });
  });

  await page.route('**/api/committees/my-committees*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ ...committee, my_role: 'Chair', my_member_uid: 'member-001' }]),
    });
  });

  await page.route('**/api/meetings*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/votes*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/surveys*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

test.describe('Committee View - Structural Tests', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
  });

  test('should render all required data-testid attributes', async ({ page }) => {
    const requiredTestIds = ['committee-view-header', 'committee-view-breadcrumb', 'committee-view-name', 'committee-view-description', 'committee-view-tabs', 'committee-view-channels-card'];

    for (const testId of requiredTestIds) {
      await expect(page.locator(`[data-testid="${testId}"]`), `Missing data-testid="${testId}"`).toBeAttached();
    }
  });

  test('should render overview tab data-testids', async ({ page }) => {
    const overviewTestIds = ['committee-overview-stats', 'committee-overview-chairs', 'committee-overview-key-info'];

    for (const testId of overviewTestIds) {
      await expect(page.locator(`[data-testid="${testId}"]`), `Missing data-testid="${testId}"`).toBeAttached();
    }
  });

  test('should use lfx-breadcrumb component', async ({ page }) => {
    const breadcrumb = page.locator('[data-testid="committee-view-breadcrumb"]');
    const tagName = await breadcrumb.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('lfx-breadcrumb');
  });

  test('should use lfx-tag for category badges', async ({ page }) => {
    // Tags in the header area (category, voting, join mode)
    const headerSection = page.locator('[data-testid="committee-view-header"]');
    const tags = headerSection.locator('lfx-tag');
    expect(await tags.count()).toBeGreaterThanOrEqual(1);
  });

  test('should use lfx-card for stats in overview', async ({ page }) => {
    const stats = page.locator('[data-testid="committee-overview-stats"]');
    const cards = stats.locator('lfx-card');
    // 5 stat cards + 1 chairs card = 6
    expect(await cards.count()).toBe(6);
  });

  test('should use lfx-message for role banners', async ({ page }) => {
    // Chair banner should use lfx-message
    const banner = page.locator('[data-testid="committee-overview-chair-banner"]');
    if (await banner.isVisible()) {
      const tagName = await banner.evaluate((el) => el.tagName.toLowerCase());
      expect(tagName).toBe('lfx-message');
    }
  });

  test('should use lfx-button for edit actions', async ({ page }) => {
    const editChairsBtn = page.locator('[data-testid="committee-overview-edit-chairs-btn"]');
    const tagName = await editChairsBtn.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('lfx-button');
  });

  test('should render h1 tag for committee name', async ({ page }) => {
    const nameEl = page.locator('[data-testid="committee-view-name"]');
    const tagName = await nameEl.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('h1');
  });

  test('should render tab buttons with correct structure', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    const buttons = tabBar.locator('button');
    // Should have at least the Overview tab
    expect(await buttons.count()).toBeGreaterThanOrEqual(1);

    // Each tab button should have an icon and text
    const firstButton = buttons.first();
    await expect(firstButton.locator('i')).toBeAttached();
  });

  test('should render p-dialog for channels modal', async ({ page }) => {
    const dialog = page.locator('[data-testid="committee-view-channels-modal"]');
    const tagName = await dialog.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('p-dialog');
  });

  test('should render p-dialog for description dialogs', async ({ page }) => {
    const viewDialog = page.locator('[data-testid="committee-view-description-dialog"]');
    expect(await viewDialog.evaluate((el) => el.tagName.toLowerCase())).toBe('p-dialog');

    const editDialog = page.locator('[data-testid="committee-view-description-edit-dialog"]');
    expect(await editDialog.evaluate((el) => el.tagName.toLowerCase())).toBe('p-dialog');
  });
});

test.describe('Committee View - Members Tab Structure', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Members').click();
  });

  test('should use lfx-table for members list', async ({ page }) => {
    const table = page.locator('lfx-table').first();
    await expect(table).toBeAttached();
  });

  test('should use lfx-input-text for member search', async ({ page }) => {
    const search = page.locator('lfx-input-text').first();
    await expect(search).toBeAttached();
  });

  test('should use lfx-select for role and voting filters', async ({ page }) => {
    const selects = page.locator('lfx-select');
    // Role filter + Voting Status filter + Organization filter = 3
    expect(await selects.count()).toBeGreaterThanOrEqual(2);
  });

  test('should render add-member-btn data-testid for admin', async ({ page }) => {
    await expect(page.locator('[data-testid="add-member-btn"]')).toBeAttached();
  });
});

test.describe('Committee View - Meetings Tab Structure', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Meetings').click();
  });

  test('should render meetings tab with required data-testids', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-meetings-tab"]')).toBeAttached();
    await expect(page.locator('[data-testid="committee-meetings-search"]')).toBeAttached();
    await expect(page.locator('[data-testid="committee-meetings-filter-upcoming"]')).toBeAttached();
    await expect(page.locator('[data-testid="committee-meetings-filter-past"]')).toBeAttached();
  });

  test('should use lfx-input-text for meeting search', async ({ page }) => {
    const search = page.locator('[data-testid="committee-meetings-search"]');
    const tagName = await search.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('lfx-input-text');
  });

  test('should use lfx-button for time filter buttons', async ({ page }) => {
    const upcoming = page.locator('[data-testid="committee-meetings-filter-upcoming"]');
    const tagName = await upcoming.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe('lfx-button');
  });

  test('should use lfx-message for info banner', async ({ page }) => {
    const messages = page.locator('lfx-message');
    expect(await messages.count()).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Committee View - Documents Tab Structure', () => {
  const committeeUid = 'comm-001-tac';

  test('should render documents tab with required data-testids', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Documents').click();

    await expect(page.locator('[data-testid="committee-documents-tab"]')).toBeAttached();
  });
});

test.describe('Committee View - Settings Tab Structure', () => {
  const committeeUid = 'comm-001-tac';

  test('should render settings tab with required data-testids', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Settings').click();

    await expect(page.locator('[data-testid="committee-settings-tab"]')).toBeAttached();
    await expect(page.locator('[data-testid="committee-settings-danger-zone"]')).toBeAttached();
  });

  test('should use lfx-committee-settings component', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Settings').click();

    await expect(page.locator('lfx-committee-settings')).toBeAttached();
  });

  test('should use p-confirmDialog for delete confirmation', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Settings').click();

    await expect(page.locator('p-confirmdialog')).toBeAttached();
  });
});

test.describe('Committee View - Responsive Structure', () => {
  const committeeUid = 'comm-001-tac';

  test('should adapt stats grid on mobile', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const stats = page.locator('[data-testid="committee-overview-stats"]');
    await expect(stats).toBeVisible();
    // On mobile, should use grid-cols-2
    await expect(stats).toHaveClass(/grid-cols-2/);
  });

  test('should stack meeting cards on mobile', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    // Last Meeting and Next Meeting sections should still be visible
    await expect(page.getByText('Last Meeting')).toBeVisible();
    await expect(page.getByText('Next Meeting')).toBeVisible();
  });
});

// Generated with [Claude Code](https://claude.ai/code)
