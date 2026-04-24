// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { expect, test } from '@playwright/test';

const EMPTY_EVENTS_RESPONSE = {
  data: [],
  total: 0,
  pageSize: 10,
  offset: 0,
};

const EMPTY_COUNTRIES_RESPONSE = { data: [] };

/**
 * Intercept both /api/events calls (main + probe) to return controlled empty responses,
 * then navigate to the My Events dashboard and open the visa-letter application dialog.
 */
async function openVisaDialogWithEmptyEvents(page: Parameters<typeof test>[1]['page']) {
  await page.route('**/api/events**', (route) => {
    const url = route.request().url();
    // Countries must be fulfilled here — a separate route for **/api/events/countries
    // would never be reached because this broader handler matches first and route.continue()
    // short-circuits before the more-specific handler runs.
    if (url.includes('/countries')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_COUNTRIES_RESPONSE) });
    }
    if (url.includes('/visa-requests') || url.includes('/travel-fund-requests') || url.includes('/organizations') || url.includes('/all')) {
      return route.continue();
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_EVENTS_RESPONSE) });
  });

  await page.goto('/me/events', { waitUntil: 'domcontentloaded' });
  await expect(page).not.toHaveURL(/auth0\.com/);

  // Switch to the visa-letters tab
  await page.getByTestId('filter-pill-visa-letters').click();

  // Open the application dialog
  await page.getByTestId('events-new-request-button').click();

  // Wait for the event-selection grid to be visible inside the dialog
  await expect(page.getByTestId('event-selection-grid')).toBeVisible({ timeout: 10000 });
}

test.describe('Event Selection — Robust Structural Tests', () => {
  test.describe('Container structure', () => {
    test('event-selection root container exists with correct testid', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      await expect(page.getByTestId('event-selection')).toBeAttached();
    });

    test('filter bar renders all three filter controls', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      const filters = page.getByTestId('event-selection-filters');
      await expect(filters).toBeAttached();
      await expect(page.getByTestId('event-selection-search')).toBeAttached();
      await expect(page.getByTestId('event-selection-time-filter')).toBeAttached();
      await expect(page.getByTestId('event-selection-location-filter')).toBeAttached();
    });

    test('events grid container is always rendered', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      await expect(page.getByTestId('event-selection-grid')).toBeAttached();
    });
  });

  test.describe('Empty state structure (no registered events)', () => {
    test('empty state container has correct testid', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      await expect(page.getByTestId('event-selection-empty-state')).toBeAttached();
    });

    test('empty state has title element', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      const title = page.getByTestId('event-selection-empty-title');
      await expect(title).toBeAttached();
      await expect(title).not.toBeEmpty();
    });

    test('empty state has description element', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      const desc = page.getByTestId('event-selection-empty-description');
      await expect(desc).toBeAttached();
      await expect(desc).not.toBeEmpty();
    });

    test('empty state has icon element', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      await expect(page.getByTestId('event-selection-empty-icon')).toBeAttached();
    });

    test('empty state title is a <p> tag', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      const title = page.getByTestId('event-selection-empty-title');
      await expect(title).toHaveCount(1);
      const tag = await title.evaluate((el) => el.tagName.toLowerCase());
      expect(tag).toBe('p');
    });

    test('empty state description is a <p> tag', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      const desc = page.getByTestId('event-selection-empty-description');
      await expect(desc).toHaveCount(1);
      const tag = await desc.evaluate((el) => el.tagName.toLowerCase());
      expect(tag).toBe('p');
    });

    test('visa dialog shows "No registered events" title when user has zero registered events', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      const title = page.getByTestId('event-selection-empty-title');
      await expect(title).toHaveText('No registered events');
    });

    test('visa dialog empty description mentions visa letter', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      const desc = page.getByTestId('event-selection-empty-description');
      await expect(desc).toContainText('visa letter');
    });

    test('grid is not rendered when empty', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      await expect(page.getByTestId('event-selection-grid').locator('[data-testid^="event-selection-card-"]')).toHaveCount(0);
    });

    test('load-more button is not rendered when empty', async ({ page }) => {
      await openVisaDialogWithEmptyEvents(page);
      await expect(page.getByTestId('event-selection-load-more')).not.toBeAttached();
    });
  });

  test.describe('Empty state — travel funding variant', () => {
    test('travel funding dialog shows "No registered events" title', async ({ page }) => {
      await page.route('**/api/events**', (route) => {
        const url = route.request().url();
        if (url.includes('/countries')) {
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_COUNTRIES_RESPONSE) });
        }
        if (url.includes('/visa-requests') || url.includes('/travel-fund-requests') || url.includes('/organizations') || url.includes('/all')) {
          return route.continue();
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(EMPTY_EVENTS_RESPONSE) });
      });

      await page.goto('/me/events', { waitUntil: 'domcontentloaded' });
      await expect(page).not.toHaveURL(/auth0\.com/);
      await page.getByTestId('filter-pill-travel-funding').click();
      await page.getByTestId('events-new-request-button').click();
      await expect(page.getByTestId('event-selection-grid')).toBeVisible({ timeout: 10000 });

      await expect(page.getByTestId('event-selection-empty-title')).toHaveText('No registered events');
      await expect(page.getByTestId('event-selection-empty-description')).toContainText('travel funding');
    });
  });
});
