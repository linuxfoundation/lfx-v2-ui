// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { test, expect, Page } from '@playwright/test';

/**
 * Marketing Dashboard E2E Tests
 *
 * Tests the Executive Director marketing overview section including:
 * - Marketing metric cards (Website Visits, Email CTR, Paid Social Reach, Social Media)
 * - North Star metric cards (Flywheel Conversion, Member Growth, Engaged Community)
 * - Drill-down drawers for each metric
 * - Carousel navigation
 *
 * Prerequisites:
 * - Dev server running on localhost:4200
 * - User authenticated via Auth0
 * - Dev toolbar visible (feature flag: dev-toolbar)
 */

// The dashboard loads at the root URL; persona must be set to executive-director
const DASHBOARD_URL = '/';

// Timeout for API-driven data to load
const DATA_LOAD_TIMEOUT = 30_000;

// Increase test timeout to account for SSR + persona switch + API loads
test.setTimeout(60_000);

/**
 * Switch to the Executive Director persona via the dev toolbar.
 * The dev toolbar renders a SelectButton with persona options.
 */
async function switchToExecutiveDirector(page: Page): Promise<void> {
  // Wait for dev toolbar to be visible
  await page.waitForSelector('[data-testid="dev-tools-bar"]', { timeout: 10_000 });

  // Click the "Executive Director" option in the persona selector
  const personaSelector = page.locator('[data-testid="dev-tools-bar-persona-selector"]');
  await personaSelector.locator('text=Executive Director').click();

  // Wait for the dashboard to re-render with the marketing overview section
  await page.waitForSelector('[data-testid="marketing-overview-section"]', { timeout: DATA_LOAD_TIMEOUT });
}

/**
 * Open a drawer by clicking a metric card. Scrolls into view if needed (carousel).
 * Waits for the drawer content to be visible before returning.
 */
async function openDrawer(page: Page, cardTestId: string, drawerContentTestId: string): Promise<void> {
  const card = page.locator(`[data-testid="${cardTestId}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.click();
  // Wait for drawer content — inner div is reliably visible even when p-drawer wrapper isn't
  await expect(page.locator(`[data-testid="${drawerContentTestId}"]`)).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
}

test.describe('Marketing Overview Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('renders the marketing overview section with title', async ({ page }) => {
    const section = page.locator('[data-testid="marketing-overview-section"]');
    await expect(section).toBeVisible();

    const heading = section.locator('h2');
    await expect(heading).toContainText('Executive Director Overview');

    const subtitle = section.locator('p');
    await expect(subtitle).toContainText('North Star KPIs');
  });

  test('renders carousel with navigation controls', async ({ page }) => {
    const carousel = page.locator('[data-testid="marketing-overview-carousel"]');
    await expect(carousel).toBeVisible();

    await expect(page.locator('[data-testid="marketing-overview-carousel-prev"]')).toBeVisible();
    await expect(page.locator('[data-testid="marketing-overview-carousel-next"]')).toBeVisible();
  });

  test('carousel scrolls when navigation buttons are clicked', async ({ page }) => {
    const carousel = page.locator('[data-testid="marketing-overview-carousel"]');
    const nextBtn = page.locator('[data-testid="marketing-overview-carousel-next"]');

    const initialScroll = await carousel.evaluate((el) => el.scrollLeft);
    await nextBtn.click();
    await page.waitForTimeout(500);
    const afterScroll = await carousel.evaluate((el) => el.scrollLeft);
    expect(afterScroll).toBeGreaterThan(initialScroll);
  });
});

test.describe('North Star Metric Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('renders Flywheel Conversion card', async ({ page }) => {
    const card = page.locator('[data-testid="flywheel-pulse-conversion"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Flywheel Conversion');
  });

  test('renders Member Growth card', async ({ page }) => {
    const card = page.locator('[data-testid="flywheel-pulse-member-growth"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Member Growth');
  });

  test('renders Engaged Community card', async ({ page }) => {
    const card = page.locator('[data-testid="flywheel-pulse-share-of-voice"]');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Engaged Community');
  });
});

test.describe('Marketing Metric Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('renders Website Visits card', async ({ page }) => {
    const card = page.locator('[data-testid="marketing-card-website-visits"]');
    await expect(card).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Website Visits');
  });

  test('renders Email CTR card', async ({ page }) => {
    const card = page.locator('[data-testid="marketing-card-email-ctr"]');
    await expect(card).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Email CTR');
  });

  test('renders Paid Social Reach card', async ({ page }) => {
    const card = page.locator('[data-testid="marketing-card-paid-social-reach"]');
    await expect(card).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Paid Social');
  });

  test('renders Social Media card', async ({ page }) => {
    const card = page.locator('[data-testid="marketing-card-social-media"]');
    await expect(card).toBeAttached({ timeout: DATA_LOAD_TIMEOUT });
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Social Media');
  });

  test('renders Key Insights card', async ({ page }) => {
    const card = page.locator('[data-testid="marketing-overview-key-insights"]');
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Marketing Metrics');
    await expect(card).toContainText('Key Insights');
  });
});

test.describe('Website Visits Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('opens and shows title when card is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-website-visits', 'website-visits-drawer-content');
    await expect(page.locator('[data-testid="website-visits-drawer-title"]')).toContainText('Website Visits');
  });

  test('shows stats section with data', async ({ page }) => {
    await openDrawer(page, 'marketing-card-website-visits', 'website-visits-drawer-stats');
    const statCards = page.locator('[data-testid="website-visits-drawer-stats"]').locator('lfx-card');
    await expect(statCards).toHaveCount(2);
  });

  test('shows trend chart section', async ({ page }) => {
    await openDrawer(page, 'marketing-card-website-visits', 'website-visits-drawer-content');
    await expect(page.locator('[data-testid="website-visits-drawer-trend-section"]')).toBeVisible();
  });

  test('closes when close button is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-website-visits', 'website-visits-drawer-content');
    await page.locator('[data-testid="website-visits-drawer-close"]').click();
    await expect(page.locator('[data-testid="website-visits-drawer-content"]')).not.toBeVisible();
  });
});

test.describe('Email CTR Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('opens and shows title when card is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-email-ctr', 'email-ctr-drawer-content');
    await expect(page.locator('[data-testid="email-ctr-drawer-title"]')).toContainText('Email Click-Through Rate');
  });

  test('shows stats and chart sections', async ({ page }) => {
    await openDrawer(page, 'marketing-card-email-ctr', 'email-ctr-drawer-stats');
    await expect(page.locator('[data-testid="email-ctr-drawer-chart-section"]')).toBeVisible();
  });

  test('closes when close button is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-email-ctr', 'email-ctr-drawer-content');
    await page.locator('[data-testid="email-ctr-drawer-close"]').click();
    await expect(page.locator('[data-testid="email-ctr-drawer-content"]')).not.toBeVisible();
  });
});

test.describe('Paid Social Reach Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('opens and shows title when card is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-paid-social-reach', 'paid-social-reach-drawer-content');
    await expect(page.locator('[data-testid="paid-social-reach-drawer-title"]')).toContainText('Paid Social Reach');
  });

  test('shows ROAS and impressions charts', async ({ page }) => {
    await openDrawer(page, 'marketing-card-paid-social-reach', 'paid-social-reach-drawer-stats');
    await expect(page.locator('[data-testid="paid-social-reach-drawer-roas-chart-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="paid-social-reach-drawer-chart-section"]')).toBeVisible();
  });

  test('closes when close button is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-paid-social-reach', 'paid-social-reach-drawer-content');
    await page.locator('[data-testid="paid-social-reach-drawer-close"]').click();
    await expect(page.locator('[data-testid="paid-social-reach-drawer-content"]')).not.toBeVisible();
  });
});

test.describe('Social Media Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('opens and shows title when card is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-social-media', 'social-media-drawer-content');
    await expect(page.locator('[data-testid="social-media-drawer-title"]')).toContainText('Social Media');
  });

  test('shows stats and platform breakdown', async ({ page }) => {
    await openDrawer(page, 'marketing-card-social-media', 'social-media-drawer-stats');
    await expect(page.locator('[data-testid="social-media-drawer-platforms-section"]')).toBeVisible();
  });

  test('closes when close button is clicked', async ({ page }) => {
    await openDrawer(page, 'marketing-card-social-media', 'social-media-drawer-content');
    await page.locator('[data-testid="social-media-drawer-close"]').click();
    await expect(page.locator('[data-testid="social-media-drawer-content"]')).not.toBeVisible();
  });
});

test.describe('Member Growth Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('opens and shows title when card is clicked', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-member-growth', 'member-acquisition-drawer-content');
    await expect(page.locator('[data-testid="member-acquisition-drawer-title"]')).toContainText('Member Growth');
  });

  test('shows stats section', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-member-growth', 'member-acquisition-drawer-stats');
    const statCards = page.locator('[data-testid="member-acquisition-drawer-stats"]').locator('lfx-card');
    await expect(statCards).toHaveCount(3);
  });

  test('shows quarterly acquisition chart section', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-member-growth', 'member-acquisition-drawer-content');
    await expect(page.locator('[data-testid="member-acquisition-drawer-chart-section"]')).toBeVisible();
  });

  test('closes when close button is clicked', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-member-growth', 'member-acquisition-drawer-content');
    await page.locator('[data-testid="member-acquisition-drawer-close"]').click();
    await expect(page.locator('[data-testid="member-acquisition-drawer-content"]')).not.toBeVisible();
  });
});

test.describe('Flywheel Conversion Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('opens when card is clicked', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-conversion', 'flywheel-conversion-drawer-content');
    await expect(page.locator('[data-testid="flywheel-conversion-drawer-title"]')).toBeVisible();
  });

  test('closes when close button is clicked', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-conversion', 'flywheel-conversion-drawer-content');
    await page.locator('[data-testid="flywheel-conversion-drawer-close"]').click();
    await expect(page.locator('[data-testid="flywheel-conversion-drawer-content"]')).not.toBeVisible();
  });
});

test.describe('Engaged Community Drawer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
    await switchToExecutiveDirector(page);
  });

  test('opens when card is clicked', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-share-of-voice', 'engaged-community-drawer-content');
    await expect(page.locator('[data-testid="engaged-community-drawer-title"]')).toBeVisible();
  });

  test('closes when close button is clicked', async ({ page }) => {
    await openDrawer(page, 'flywheel-pulse-share-of-voice', 'engaged-community-drawer-content');
    await page.locator('[data-testid="engaged-community-drawer-close"]').click();
    await expect(page.locator('[data-testid="engaged-community-drawer-content"]')).not.toBeVisible();
  });
});

// Generated with [Claude Code](https://claude.ai/code)
