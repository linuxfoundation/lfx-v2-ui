// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { expect, test } from '@playwright/test';

// Override auth state — /docs is a public route that must be reachable without login.
test.use({ storageState: { cookies: [], origins: [] } });

const DOCS_URL = '/docs';
const API_BASE = '/public/api/docs';
const DATA_LOAD_TIMEOUT = 15_000;

test.setTimeout(60_000);

// Mock shapes must match the real API contract:
// GET /public/api/docs  → { sections: DocSection[] }
// GET /public/api/docs/:section/:topic → DocArticle
const MOCK_SECTIONS = {
  sections: [
    {
      slug: 'meetings',
      title: 'Meetings',
      description: 'Schedule, manage, and join meetings.',
      topics: [
        { slug: 'schedule-meeting', title: 'Schedule a Meeting', description: 'How to schedule a meeting.', path: '/docs/meetings/schedule-meeting' },
        { slug: 'join-meeting', title: 'Join a Meeting', description: 'How to join a meeting.', path: '/docs/meetings/join-meeting' },
        { slug: 'faq', title: 'FAQ', description: 'Frequently asked questions about meetings.', path: '/docs/meetings/faq' },
      ],
    },
    {
      slug: 'committees',
      title: 'Groups & Committees',
      description: 'Manage project committees.',
      topics: [{ slug: 'faq', title: 'FAQ', description: 'Committee FAQs.', path: '/docs/committees/faq' }],
    },
  ],
};

// DocArticle must include slug and breadcrumbs — used by DocsArticleComponent.
const MOCK_ARTICLE = {
  frontmatter: {
    title: 'Schedule a Meeting',
    description: 'How to schedule a project meeting in LFX.',
    product_area: 'meetings',
    tags: ['meetings', 'scheduling'],
    last_updated: '2025-01-01',
  },
  html: '<h2>Schedule a Meeting</h2><p>To schedule a meeting, navigate to the Meetings section.</p>',
  slug: ['meetings', 'schedule-meeting'],
  breadcrumbs: [
    { label: 'Help', path: '/docs' },
    { label: 'Meetings', path: '/docs/meetings' },
    { label: 'Schedule a Meeting', path: '/docs/meetings/schedule-meeting' },
  ],
};

test.describe('Public Docs — Landing page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`**${API_BASE}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SECTIONS) });
    });
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should render without redirect to login', async ({ page }) => {
    await expect(page).toHaveURL(new RegExp(DOCS_URL));
  });

  test('should show the DocsLayout top bar', async ({ page }) => {
    await expect(page.getByTestId('docs-topbar')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('should show the LFX Self Serve Help heading in top bar', async ({ page }) => {
    await expect(page.getByTestId('docs-topbar')).toContainText('LFX Self Serve Help');
  });

  test('should show Open the app link in top bar', async ({ page }) => {
    const link = page.getByTestId('docs-open-app-link');
    await expect(link).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
    await expect(link).toHaveAttribute('href', '/');
  });

  test('should render section cards on landing page', async ({ page }) => {
    await expect(page.getByTestId('docs-section-card').first()).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('should show a card for each mocked section', async ({ page }) => {
    const cards = page.getByTestId('docs-section-card');
    await expect(cards).toHaveCount(MOCK_SECTIONS.sections.length, { timeout: DATA_LOAD_TIMEOUT });
  });

  test('should show section label on each card', async ({ page }) => {
    await expect(page.getByTestId('docs-section-card').first()).toContainText(MOCK_SECTIONS.sections[0].title);
  });

  test('should show the docs sidebar', async ({ page }) => {
    await expect(page.getByTestId('docs-sidebar')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('should not show the lens switcher rail', async ({ page }) => {
    await expect(page.getByTestId('lens-switcher')).not.toBeAttached();
  });
});

test.describe('Public Docs — Article page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`**${API_BASE}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SECTIONS) });
    });
    await page.route(`**${API_BASE}/meetings/schedule-meeting`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ARTICLE) });
    });
    await page.goto(`${DOCS_URL}/meetings/schedule-meeting`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should render article page without redirect', async ({ page }) => {
    await expect(page).toHaveURL(/\/docs\/meetings\/schedule-meeting/);
  });

  test('should show article body content', async ({ page }) => {
    await expect(page.getByTestId('docs-article-body')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('should contain article HTML from API response', async ({ page }) => {
    await expect(page.getByTestId('docs-article-body')).toContainText('Schedule a Meeting');
  });

  test('should show breadcrumbs', async ({ page }) => {
    await expect(page.getByTestId('docs-breadcrumbs')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });

  test('should show edit on GitHub link', async ({ page }) => {
    const editLink = page.getByTestId('docs-edit-link');
    await expect(editLink).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
    await expect(editLink).toHaveAttribute('href', /github\.com/);
  });

  test('should set page title from frontmatter', async ({ page }) => {
    await expect(page).toHaveTitle(/Schedule a Meeting/);
  });
});

test.describe('Public Docs — Section index page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`**${API_BASE}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SECTIONS) });
    });
    await page.route(`**${API_BASE}/meetings`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ARTICLE) });
    });
    await page.goto(`${DOCS_URL}/meetings`, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
  });

  test('should render section index without redirect', async ({ page }) => {
    await expect(page).toHaveURL(/\/docs\/meetings/);
  });

  test('should show article body', async ({ page }) => {
    await expect(page.getByTestId('docs-article-body')).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
  });
});

test.describe('Public Docs — API endpoints', () => {
  test('GET /public/api/docs returns 200 without auth', async ({ request }) => {
    const response = await request.get(`${API_BASE}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    // API returns { sections: DocSection[] } — not a bare array.
    expect(body).toHaveProperty('sections');
    expect(Array.isArray(body.sections)).toBe(true);
  });

  test('GET /public/api/docs/meetings returns 200 without auth', async ({ request }) => {
    const response = await request.get(`${API_BASE}/meetings`);
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Public Docs — SEO endpoints', () => {
  test('GET /robots.txt returns 200', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('/docs');
    expect(text).toContain('sitemap.xml');
  });

  test('GET /sitemap.xml returns 200 with XML content', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/application\/xml/);
    const text = await response.text();
    expect(text).toContain('<urlset');
  });
});

test.describe('Public Docs — Landing page navigation', () => {
  test('clicking a section card navigates to the section page', async ({ page }) => {
    await page.route(`**${API_BASE}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SECTIONS) });
    });
    await page.route(`**${API_BASE}/meetings`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ARTICLE) });
    });
    await page.goto(DOCS_URL, { waitUntil: 'domcontentloaded' });
    await expect(page).not.toHaveURL(/auth0\.com/);
    await expect(page.getByTestId('docs-section-card').first()).toBeVisible({ timeout: DATA_LOAD_TIMEOUT });
    await page.getByTestId('docs-section-card').first().click();
    await expect(page).toHaveURL(/\/docs\/meetings/);
  });
});
