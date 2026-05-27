// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)
//
// Structural / robust spec — validates DOM structure and public accessibility
// without relying on mocked data or specific text content. Tests pass against
// the live server (authenticated or not), making them resilient to API changes.

import { expect, test } from '@playwright/test';

// Override auth state — /docs is a public route that must be reachable without login.
test.use({ storageState: { cookies: [], origins: [] } });

const DOCS_URL = '/docs';
const DATA_LOAD_TIMEOUT = 15_000;

test.setTimeout(60_000);

test.describe('Public Docs — Layout structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    // Docs must NOT redirect to auth0 or /login
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page).not.toHaveURL(/\/login/);
    // Wait for either content or an error/loading state
    await expect(
      page
        .getByTestId('docs-topbar')
        .or(page.getByTestId('docs-sidebar'))
        .or(page.getByTestId('docs-section-card'))
    ).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('page resolves to /docs without auth redirect', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(DOCS_URL));
  });

  test('top bar container is attached', async ({ page }) => {
    await expect(page.getByTestId('docs-topbar')).toBeAttached();
  });

  test('sidebar is attached', async ({ page }) => {
    await expect(page.getByTestId('docs-sidebar')).toBeAttached();
  });

  test('main content area (router-outlet) is attached', async ({ page }) => {
    // The DocsLayout wraps content in a main element
    await expect(page.locator('main')).toBeAttached();
  });

  test('lens-switcher rail is absent (docs uses its own layout)', async ({ page }) => {
    await expect(page.getByTestId('lens-switcher')).not.toBeAttached();
  });

  test('main auth guard is not applied (no login redirect)', async ({ page }) => {
    // Verifies the route is outside the authGuard parent
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page).not.toHaveURL(/\/login/);
  });
});

test.describe('Public Docs — Top bar elements', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page.getByTestId('docs-topbar')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('LFX logo is attached in top bar', async ({ page }) => {
    await expect(page.getByTestId('docs-topbar-logo')).toBeAttached();
  });

  test('Open the app link is attached', async ({ page }) => {
    await expect(page.getByTestId('docs-open-app-link')).toBeAttached();
  });

  test('Open the app link points to app root', async ({ page }) => {
    const href = await page.getByTestId('docs-open-app-link').getAttribute('href');
    expect(href).toBe('/');
  });
});

test.describe('Public Docs — Sidebar navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page.getByTestId('docs-sidebar')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('sidebar renders at least one nav section link', async ({ page }) => {
    const navLinks = page.getByTestId('docs-sidebar').getByRole('link');
    await expect(navLinks.first()).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
  });
});

test.describe('Public Docs — Landing page content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
  });

  test('at least one section card is rendered', async ({ page }) => {
    // Wait for either card grid or a loading skeleton
    const card = page.getByTestId('docs-section-card').first();
    await expect(card.or(page.locator('[data-testid="docs-loading"]'))).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
  });
});

test.describe('Public Docs — Article deep-link (unauthenticated)', () => {
  test('direct load of meetings/schedule-meeting does not redirect to auth', async ({ page }) => {
    await page.goto(`${DOCS_URL}/meetings/schedule-meeting`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/docs\/meetings\/schedule-meeting/);
  });

  test('article page has a main element when loaded', async ({ page }) => {
    await page.goto(`${DOCS_URL}/meetings/schedule-meeting`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page.locator('main')).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('article top bar is present on deep-link', async ({ page }) => {
    await page.goto(`${DOCS_URL}/meetings/schedule-meeting`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page.getByTestId('docs-topbar')).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
  });
});

test.describe('Public Docs — SEO (structural)', () => {
  test('page title is non-empty on landing', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test('meta description is present on landing', async ({ page }) => {
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDesc).toBeTruthy();
  });
});

test.describe('Public Docs — Mobile viewport', () => {
  test('docs landing renders without horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page.locator('main')).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
  });
});
