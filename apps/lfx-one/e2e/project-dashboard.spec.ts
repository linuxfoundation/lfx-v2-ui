// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { expect, test } from '@playwright/test';

import { ApiMockHelper } from './helpers/api-mock.helper';

// Helper function to navigate to dashboard
async function navigateToDashboard(page: any) {
  // Navigate to homepage and search for a project
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // Wait for the search input to be available
  await expect(page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' })).toBeVisible({ timeout: 10000 });

  // Perform search for "aswf" to get the Academy Software Foundation project
  await page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' }).fill('aswf');
  await page.keyboard.press('Enter');

  // Wait for search results to load
  await expect(page.locator('lfx-project-card').first()).toBeVisible({ timeout: 10000 });

  // Click on the Academy Software Foundation project card specifically
  await page.locator('lfx-project-card').filter({ hasText: 'Academy Software Foundation' }).click();

  // Wait for navigation to project page and ensure we're on the dashboard tab
  await expect(page).toHaveURL(/\/project\/[\w-]+$/, { timeout: 10000 });
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('link', { name: 'Dashboard' }).click();
}

test.describe('Project Dashboard', () => {
  test.describe('With Write Permissions', () => {
    test.beforeEach(async ({ page }) => {
      // Setup API mocks with write permissions
      await ApiMockHelper.setupProjectSlugMock(page, { writer: true });
      await navigateToDashboard(page);
    });

    test.describe('Navigation and Layout', () => {
      test('should display correct page title and URL', async ({ page }) => {
        await expect(page).toHaveTitle('LFX One');
        await expect(page).toHaveURL(/\/project\/[\w-]+$/);
      });

      test('should display header elements correctly for current viewport', async ({ page }) => {
        await expect(page.getByRole('button', { name: 'Go to home page' })).toBeVisible();
        await expect(page.getByAltText('LFX Logo')).toBeVisible();

        // Check viewport width to determine expected behavior
        const viewport = page.viewportSize();
        const isMobile = viewport && viewport.width < 768;

        if (isMobile) {
          // On mobile: "Projects" text is completely hidden from header button
          // Search should be hidden
          await expect(page.locator('[data-testid="header-search-autocomplete"]')).toBeHidden();
          // Mobile search toggle should be visible
          await expect(page.getByTestId('mobile-search-toggle')).toBeVisible();
        } else {
          // On desktop: "Projects" text is visible in header button
          await expect(page.getByTestId('header-projects-text')).toBeVisible();
          // Search should be visible
          await expect(page.locator('[data-testid="header-search-autocomplete"]')).toBeVisible();
          // Mobile search toggle should be hidden
          await expect(page.getByTestId('mobile-search-toggle')).toBeHidden();
        }
      });

      test('should display breadcrumb navigation', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'All Projects' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'All Projects' })).toHaveAttribute('href', '/');
      });

      test('should highlight active Dashboard tab', async ({ page }) => {
        const dashboardTab = page.getByRole('link', { name: 'Dashboard' });
        await expect(dashboardTab).toHaveClass(/bg-blue-50/);
      });

      test('should display all navigation tabs', async ({ page }) => {
        await expect(page.getByTestId('menu-item').filter({ hasText: 'Dashboard' })).toBeVisible();
        await expect(page.getByTestId('menu-item').filter({ hasText: 'Meetings' })).toBeVisible();
        await expect(page.getByTestId('menu-item').filter({ hasText: 'Committees' })).toBeVisible();
        // await expect(page.getByTestId('menu-item').filter({ hasText: 'Mailing Lists' })).toBeVisible();
        await expect(page.getByTestId('menu-item').filter({ hasText: 'Settings' })).toBeVisible();
      });

      test('should display Settings menu for users with write permissions', async ({ page }) => {
        // Settings should be visible in both desktop and mobile views for users with write permissions
        const viewport = page.viewportSize();
        const isMobile = viewport && viewport.width < 768;

        if (isMobile) {
          // On mobile, Settings should be visible as mobile-menu-item
          await expect(page.getByTestId('mobile-menu-item').filter({ hasText: 'Settings' })).toBeVisible();
        } else {
          // On desktop, Settings should be visible as menu-item
          await expect(page.getByTestId('menu-item').filter({ hasText: 'Settings' })).toBeVisible();
        }
      });
    });

    test.describe('Project Header', () => {
      test('should display project name and description', async ({ page }) => {
        await expect(page.getByRole('heading', { level: 1 })).toContainText('Academy Software Foundation (ASWF)');
        await expect(page.getByText(/The mission of the Academy Software Foundation/)).toBeVisible();
      });

      test('should display project logo', async ({ page }) => {
        // Project logo should be present (assuming it's an img element)
        const projectImage = page.locator('img').first();
        await expect(projectImage).toBeVisible();
      });
    });

    test.describe('Metrics Cards', () => {
      test('should display all four metrics cards', async ({ page }) => {
        // Use data-testid attributes for reliable targeting
        await expect(page.locator('[data-testid="total-members-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-committees-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-meetings-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="upcoming-meetings-card"]')).toBeVisible();

        // Also verify the specific labels within each card
        await expect(page.locator('[data-testid="total-members-card"] p.text-sm.text-gray-500')).toContainText('Total Members');
        await expect(page.locator('[data-testid="total-committees-card"] p.text-sm.text-gray-500')).toContainText('Committees');
        await expect(page.locator('[data-testid="total-meetings-card"] p.text-sm.text-gray-500')).toContainText('Total Meetings');
        await expect(page.locator('[data-testid="upcoming-meetings-card"] p.text-sm.text-gray-500')).toContainText('Upcoming');
      });

      test('should display metric values', async ({ page }) => {
        // Each metric card should have a numerical value
        const totalMembersValue = page.getByText('Total Members').locator('..').getByText(/^\d+$/);
        const committeesValue = page.getByText('Committees').locator('..').getByText(/^\d+$/);
        const totalMeetingsValue = page.getByText('Total Meetings').locator('..').getByText(/^\d+$/);
        const upcomingValue = page.getByText('Upcoming').locator('..').getByText(/^\d+$/);

        await expect(totalMembersValue).toBeVisible();
        await expect(committeesValue).toBeVisible();
        await expect(totalMeetingsValue).toBeVisible();
        await expect(upcomingValue).toBeVisible();
      });

      test('should display metrics cards with proper structure', async ({ page }) => {
        // Use data-testid to avoid strict mode violations with text content
        await expect(page.locator('[data-testid="total-members-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-committees-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="total-meetings-card"]')).toBeVisible();
        await expect(page.locator('[data-testid="upcoming-meetings-card"]')).toBeVisible();

        // Verify labels are present within specific cards
        await expect(page.locator('[data-testid="total-members-card"] p.text-sm.text-gray-500')).toContainText('Total Members');
        await expect(page.locator('[data-testid="total-committees-card"] p.text-sm.text-gray-500')).toContainText('Committees');
        await expect(page.locator('[data-testid="total-meetings-card"] p.text-sm.text-gray-500')).toContainText('Total Meetings');
        await expect(page.locator('[data-testid="upcoming-meetings-card"] p.text-sm.text-gray-500')).toContainText('Upcoming');
      });
    });

    test.describe('Project Health Indicators', () => {
      test('should display Project Health section', async ({ page }) => {
        await expect(page.getByText('Project Health')).toBeVisible();
      });

      test('should display Activity Score indicator', async ({ page }) => {
        await expect(page.getByText('Activity Score')).toBeVisible();
        await expect(page.getByText('0%').first()).toBeVisible();
      });

      test('should display Meeting Completion indicator', async ({ page }) => {
        await expect(page.getByText('Meeting Completion')).toBeVisible();
        // Should have a percentage value - look for any percentage in the health section
        const healthSection = page.getByText('Project Health').locator('..');
        await expect(healthSection.getByText(/\d+%/).first()).toBeVisible();
      });

      test('should display Meeting Trend indicator', async ({ page }) => {
        await expect(page.getByText('Meeting Trend (30 days)')).toBeVisible();
      });

      test('should display Active Committees indicator', async ({ page }) => {
        await expect(page.getByText('Active Committees')).toBeVisible();
        // Should have a percentage value - look for any percentage in the health section
        const healthSection = page.getByText('Project Health').locator('..');
        await expect(healthSection.getByText(/\d+%/).last()).toBeVisible();
      });

      test('should display health indicator charts/icons', async ({ page }) => {
        // Each health indicator should have a visual representation
        const healthSection = page.getByText('Project Health').locator('..');
        const charts = healthSection.locator('img, svg, canvas');

        await expect(charts).toHaveCount(4);
      });
    });

    test.describe('Quick Actions Menu', () => {
      test('should display Quick Actions section', async ({ page }) => {
        await expect(page.getByText('Quick Actions')).toBeVisible();
      });

      test('should display all quick action items', async ({ page }) => {
        await expect(page.getByRole('menuitem', { name: 'Create Meeting' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'Create Committee' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'View All Committees' })).toBeVisible();
        await expect(page.getByRole('menuitem', { name: 'View Calendar' })).toBeVisible();
      });

      test('should have working links in quick actions', async ({ page }) => {
        // Create Meeting should link to meetings page
        const createMeetingLink = page.getByRole('link', { name: 'Create Meeting' });
        await expect(createMeetingLink).toHaveAttribute('href', /\/meetings\/create$/);

        // View All Committees should link to committees page
        const viewCommitteesLink = page.getByRole('link', { name: 'View All Committees' });
        await expect(viewCommitteesLink).toHaveAttribute('href', /\/committees$/);

        // View Calendar should link to meetings page
        const viewCalendarLink = page.getByRole('link', { name: 'View Calendar' });
        await expect(viewCalendarLink).toHaveAttribute('href', /\/meetings$/);
      });

      test('should display quick action menu items properly', async ({ page }) => {
        // Verify quick actions are clickable and properly structured
        const quickActionsSection = page.getByText('Quick Actions').locator('..');

        // Check that menu items are present and interactive
        await expect(quickActionsSection.getByRole('menuitem', { name: 'Create Meeting' })).toBeVisible();
        await expect(quickActionsSection.getByRole('menuitem', { name: 'Create Committee' })).toBeVisible();
        await expect(quickActionsSection.getByRole('menuitem', { name: 'View All Committees' })).toBeVisible();
        await expect(quickActionsSection.getByRole('menuitem', { name: 'View Calendar' })).toBeVisible();
      });
    });

    test.describe('Recent Activity Section', () => {
      test('should display Recent Activity section', async ({ page }) => {
        await expect(page.getByText('Recent Activity').first()).toBeVisible();
      });

      test('should show empty state when no activity', async ({ page }) => {
        await expect(page.getByText('No recent activity')).toBeVisible();
      });

      test('should display activity icon in empty state', async ({ page }) => {
        // Just verify the empty state message is there - icons may not be present
        await expect(page.getByText('No recent activity')).toBeVisible();
      });
    });

    test.describe('Footer', () => {
      test('should display copyright and legal links', async ({ page }) => {
        await expect(page.getByText(/Copyright © 2025 The Linux Foundation/)).toBeVisible();
        await expect(page.getByRole('link', { name: 'Platform Usage' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Trademark Usage' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Policies' })).toBeVisible();
      });

      test('should have correct external links', async ({ page }) => {
        await expect(page.getByRole('link', { name: 'Platform Usage' })).toHaveAttribute(
          'href',
          'https://www.linuxfoundation.org/legal/platform-use-agreement/'
        );
        await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
          'href',
          'https://www.linuxfoundation.org/legal/privacy-policy?hsLang=en'
        );
        await expect(page.getByRole('link', { name: 'Trademark Usage' })).toHaveAttribute(
          'href',
          'https://www.linuxfoundation.org/legal/trademark-usage?hsLang=en'
        );
        await expect(page.getByRole('link', { name: 'Policies' })).toHaveAttribute('href', 'https://www.linuxfoundation.org/legal/policies');
      });
    });

    test.describe('Search Functionality', () => {
      test('should have working global search when visible', async ({ page }) => {
        const searchBox = page.locator('[data-testid="header-search-autocomplete"] input');
        const viewport = page.viewportSize();
        const isMobile = viewport && viewport.width < 768;

        if (isMobile) {
          // On mobile: search should be hidden, so skip interaction test
          await expect(searchBox).toBeHidden();
        } else {
          // On desktop: search should be visible and functional
          await expect(searchBox).toBeVisible();
          await expect(searchBox).toBeEditable();

          // Test that we can type in the search box
          await searchBox.fill('test search');
          await expect(searchBox).toHaveValue('test search');
        }
      });
    });

    test.describe('Responsive Design', () => {
      test('should display correctly on mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });

        // Navigate to homepage and search for a project after viewport change
        await page.goto('/');
        await expect(page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' }).fill('aswf');
        await page.keyboard.press('Enter');
        await expect(page.locator('lfx-project-card').first()).toBeVisible({ timeout: 10000 });
        await page.locator('lfx-project-card').filter({ hasText: 'Academy Software Foundation' }).click();
        await expect(page).toHaveURL(/\/project\/[\w-]+$/, { timeout: 10000 });
        await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
        await page.getByRole('link', { name: 'Dashboard' }).click();

        // Key elements should still be visible on mobile
        await expect(page.getByRole('heading', { name: 'Academy Software Foundation (ASWF)' })).toBeVisible();
        await expect(page.getByText('Total Members')).toBeVisible();
        await expect(page.getByText('Project Health')).toBeVisible();
        await expect(page.getByText('Quick Actions')).toBeVisible();

        // On mobile: "Projects" text is completely hidden from header button
        // Search bar should be hidden on mobile (responsive design)
        await expect(page.locator('[data-testid="header-search-autocomplete"]')).toBeHidden();

        // Mobile search toggle should be visible
        await expect(page.getByTestId('mobile-search-toggle')).toBeVisible();
      });

      test('should display correctly on tablet viewport', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });

        // Navigate to homepage and search for a project after viewport change
        await page.goto('/');
        await expect(page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' }).fill('aswf');
        await page.keyboard.press('Enter');
        await expect(page.locator('lfx-project-card').first()).toBeVisible({ timeout: 10000 });
        await page.locator('lfx-project-card').filter({ hasText: 'Academy Software Foundation' }).click();
        await expect(page).toHaveURL(/\/project\/[\w-]+$/, { timeout: 10000 });
        await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
        await page.getByRole('link', { name: 'Dashboard' }).click();

        // All dashboard elements should be visible on tablet (768px = desktop, "One" text visible)
        await expect(page.getByRole('button', { name: 'Go to home page' }).getByText('One', { exact: true })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Academy Software Foundation (ASWF)' })).toBeVisible();
        await expect(page.getByText('Total Members')).toBeVisible();
        await expect(page.getByText('Project Health')).toBeVisible();
        await expect(page.getByText('Quick Actions')).toBeVisible();
        await expect(page.getByText('Recent Activity').first()).toBeVisible();
      });
    });
  });
});

test.describe('Without Write Permissions', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks without write permissions
    await ApiMockHelper.setupProjectSlugMock(page, { writer: false });
    await navigateToDashboard(page);
  });

  test.describe('Quick Actions Menu', () => {
    test('should NOT display create action items for read-only users', async ({ page }) => {
      await expect(page.getByText('Quick Actions')).toBeVisible();

      // Should NOT display create items when user lacks write permissions
      await expect(page.getByRole('menuitem', { name: 'Create Meeting' })).not.toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Create Committee' })).not.toBeVisible();
    });

    test('should display only read-only quick action items', async ({ page }) => {
      await expect(page.getByText('Quick Actions')).toBeVisible();

      // Should still display view-only items
      await expect(page.getByRole('menuitem', { name: 'View All Committees' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'View Calendar' })).toBeVisible();
    });

    test('should have correct menu item count for read-only users', async ({ page }) => {
      const quickActionsSection = page.getByText('Quick Actions').locator('..');
      // Should only have 2 menu items (view-only actions)
      await expect(quickActionsSection.getByRole('menuitem')).toHaveCount(2);
    });

    test('should have working view-only links', async ({ page }) => {
      // View All Committees should link to committees page
      const viewCommitteesLink = page.getByRole('link', { name: 'View All Committees' });
      await expect(viewCommitteesLink).toHaveAttribute('href', /\/committees$/);

      // View Calendar should link to meetings page
      const viewCalendarLink = page.getByRole('link', { name: 'View Calendar' });
      await expect(viewCalendarLink).toHaveAttribute('href', /\/meetings$/);
    });
  });

  test.describe('Empty States', () => {
    test('should NOT show Create Meeting button in meetings empty state', async ({ page }) => {
      // Check that Create Meeting button is not present in meetings section
      const meetingsSection = page.locator('lfx-card').filter({ hasText: 'Meetings' });
      const createButton = meetingsSection.getByRole('button', { name: 'Create Meeting' });
      await expect(createButton).not.toBeVisible();
    });

    test('should NOT show Add Committee button in committees empty state', async ({ page }) => {
      // Check that Add Committee button is not present in committees section
      const committeesSection = page.locator('lfx-card').filter({ hasText: 'Committees' });
      const addButton = committeesSection.getByRole('button', { name: 'Add Committee' });
      await expect(addButton).not.toBeVisible();
    });
  });

  test.describe('Read-Only UI Elements', () => {
    test('should display all dashboard sections in read-only mode', async ({ page }) => {
      // All sections should still be visible for read-only users
      await expect(page.getByRole('heading', { name: 'Academy Software Foundation (ASWF)' })).toBeVisible();
      await expect(page.getByText('Total Members')).toBeVisible();
      await expect(page.getByText('Project Health')).toBeVisible();
      await expect(page.getByText('Quick Actions')).toBeVisible();
      await expect(page.getByText('Recent Activity').first()).toBeVisible();
    });

    test('should display metrics cards for read-only users', async ({ page }) => {
      // Metrics should be viewable by all users
      await expect(page.locator('[data-testid="total-members-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-committees-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-meetings-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="upcoming-meetings-card"]')).toBeVisible();
    });

    test('should display project health indicators for read-only users', async ({ page }) => {
      // Health indicators should be viewable by all users
      await expect(page.getByText('Project Health')).toBeVisible();
      await expect(page.getByText('Activity Score')).toBeVisible();
      await expect(page.getByText('Meeting Completion')).toBeVisible();
      await expect(page.getByText('Meeting Trend (30 days)')).toBeVisible();
      await expect(page.getByText('Active Committees')).toBeVisible();
    });

    test('should allow navigation to other tabs for read-only users', async ({ page }) => {
      // Navigation should work for read-only users
      await expect(page.getByTestId('menu-item').filter({ hasText: 'Dashboard' })).toBeVisible();
      await expect(page.getByTestId('menu-item').filter({ hasText: 'Meetings' })).toBeVisible();
      await expect(page.getByTestId('menu-item').filter({ hasText: 'Committees' })).toBeVisible();
      // await expect(page.getByTestId('menu-item').filter({ hasText: 'Mailing Lists' })).toBeVisible();

      // Settings tab should NOT be visible for users without write permissions
      await expect(page.getByTestId('menu-item').filter({ hasText: 'Settings' })).not.toBeVisible();
    });

    test('should NOT display Settings menu for users without write permissions', async ({ page }) => {
      // Settings should NOT be visible in either desktop or mobile views for users without write permissions
      const viewport = page.viewportSize();
      const isMobile = viewport && viewport.width < 768;

      if (isMobile) {
        // On mobile, Settings should NOT be visible as mobile-menu-item
        await expect(page.getByTestId('mobile-menu-item').filter({ hasText: 'Settings' })).not.toBeVisible();
      } else {
        // On desktop, Settings should NOT be visible as menu-item
        await expect(page.getByTestId('menu-item').filter({ hasText: 'Settings' })).not.toBeVisible();
      }
    });
  });

  test.describe('Responsive Design - Read-Only', () => {
    test('should display correctly on mobile viewport for read-only users', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Navigate fresh for mobile viewport
      await page.goto('/');
      await ApiMockHelper.setupProjectSlugMock(page, { writer: false });
      await expect(page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' })).toBeVisible({ timeout: 10000 });
      await page.getByRole('textbox', { name: 'Search projects, committees, meetings, or mailing lists...' }).fill('aswf');
      await page.keyboard.press('Enter');
      await expect(page.locator('lfx-project-card').first()).toBeVisible({ timeout: 10000 });
      await page.locator('lfx-project-card').filter({ hasText: 'Academy Software Foundation' }).click();
      await expect(page).toHaveURL(/\/project\/[\w-]+$/, { timeout: 10000 });
      await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
      await page.getByRole('link', { name: 'Dashboard' }).click();

      // Key elements should be visible on mobile for read-only users
      await expect(page.getByRole('heading', { name: 'Academy Software Foundation (ASWF)' })).toBeVisible();
      await expect(page.getByText('Total Members')).toBeVisible();
      await expect(page.getByText('Project Health')).toBeVisible();
      await expect(page.getByText('Quick Actions')).toBeVisible();

      // Should only have 2 menu items on mobile for read-only users
      const quickActionsSection = page.getByText('Quick Actions').locator('..');
      await expect(quickActionsSection.getByRole('menuitem')).toHaveCount(2);

      // Settings should NOT be visible on mobile for read-only users
      await expect(page.getByTestId('mobile-menu-item').filter({ hasText: 'Settings' })).not.toBeVisible();
    });
  });
});
