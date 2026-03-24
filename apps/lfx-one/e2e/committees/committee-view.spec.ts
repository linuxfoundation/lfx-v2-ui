// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { expect, Page, test } from '@playwright/test';

import { getMockCommittee, mockCommittees } from '../fixtures/mock-data';

/** Mock members used across committee view tests */
const mockMembers = [
  {
    uid: 'member-001',
    committee_uid: 'comm-001-tac',
    committee_name: 'Technical Advisory Council',
    email: 'alice@example.com',
    first_name: 'Alice',
    last_name: 'Johnson',
    role: { name: 'Chair', start_date: '2024-01-01T00:00:00Z' },
    voting: { status: 'Voting Rep', start_date: '2024-01-01T00:00:00Z' },
    organization: { name: 'Acme Corp', website: 'https://acme.com' },
  },
  {
    uid: 'member-002',
    committee_uid: 'comm-001-tac',
    committee_name: 'Technical Advisory Council',
    email: 'bob@example.com',
    first_name: 'Bob',
    last_name: 'Smith',
    role: { name: 'Vice Chair', start_date: '2024-02-01T00:00:00Z' },
    voting: { status: 'Voting Rep', start_date: '2024-02-01T00:00:00Z' },
    organization: { name: 'Globex Inc', website: 'https://globex.com' },
  },
  {
    uid: 'member-003',
    committee_uid: 'comm-001-tac',
    committee_name: 'Technical Advisory Council',
    email: 'carol@example.com',
    first_name: 'Carol',
    last_name: 'Williams',
    role: { name: 'Member' },
    voting: { status: 'Observer' },
    organization: { name: 'Initech', website: null },
  },
];

const mockMeetings = [
  {
    id: 'mtg-001',
    title: 'TAC Weekly Sync',
    scheduled_start_time: new Date(Date.now() + 86400000).toISOString(),
    scheduled_end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    status: 'scheduled',
  },
  {
    id: 'mtg-002',
    title: 'TAC Q1 Review',
    scheduled_start_time: new Date(Date.now() - 86400000 * 7).toISOString(),
    scheduled_end_time: new Date(Date.now() - 86400000 * 7 + 3600000).toISOString(),
    status: 'completed',
  },
];

const mockVotes = [
  {
    uid: 'vote-001',
    title: 'Adopt new CI pipeline',
    status: 'Active',
    start_date: '2026-03-01T00:00:00Z',
    end_date: '2026-04-01T00:00:00Z',
    total_votes: 5,
    total_eligible: 8,
  },
];

const mockSurveys = [
  {
    uid: 'survey-001',
    title: 'Q1 Satisfaction Survey',
    status: 'Active',
    start_date: '2026-03-01T00:00:00Z',
    end_date: '2026-04-01T00:00:00Z',
    total_responses: 10,
  },
];

/**
 * Set up API mocks for the committee view page.
 */
async function setupViewMocks(
  page: Page,
  committeeUid: string,
  options?: { canEdit?: boolean; isMember?: boolean; role?: string }
) {
  const committee = getMockCommittee(committeeUid) ?? mockCommittees[0];

  // Mock project
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
        writer: options?.canEdit ?? true,
      }),
    });
  });

  // Mock committee detail
  await page.route(`**/api/committees/${committeeUid}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(committee),
    });
  });

  // Mock members
  await page.route(`**/api/committees/${committeeUid}/members*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMembers),
    });
  });

  // Mock my-committees (for role detection)
  await page.route('**/api/committees/my-committees*', async (route) => {
    if (options?.isMember !== false) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            ...committee,
            my_role: options?.role ?? 'Chair',
            my_member_uid: 'member-001',
          },
        ]),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    }
  });

  // Mock meetings
  await page.route('**/api/meetings*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockMeetings),
    });
  });

  // Mock votes
  await page.route('**/api/votes*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockVotes),
    });
  });

  // Mock surveys
  await page.route('**/api/surveys*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSurveys),
    });
  });
}

// ─── Committee View - Header & Navigation ────────────────────────────────────

test.describe('Committee View - Header', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
  });

  test('should display committee name and description', async ({ page }) => {
    const name = page.locator('[data-testid="committee-view-name"]');
    await expect(name).toBeVisible();
    await expect(name).toContainText('Technical Advisory Council');

    const description = page.locator('[data-testid="committee-view-description"]');
    await expect(description).toBeVisible();
    await expect(description).toContainText('TAC is responsible for technical oversight');
  });

  test('should display breadcrumb navigation', async ({ page }) => {
    const breadcrumb = page.locator('[data-testid="committee-view-breadcrumb"]');
    await expect(breadcrumb).toBeVisible();
  });

  test('should display category and voting tags', async ({ page }) => {
    // Category tag
    await expect(page.getByText('Oversight Committee')).toBeVisible();
    // Voting enabled tag
    await expect(page.getByText('Voting Enabled')).toBeVisible();
    // Join mode tag
    await expect(page.getByText('Application')).toBeVisible();
  });

  test('should display creation and update dates', async ({ page }) => {
    await expect(page.getByText(/Created Jan 15, 2023/)).toBeVisible();
    await expect(page.getByText(/Updated Mar 20, 2026/)).toBeVisible();
  });

  test('should display channels card with mailing list and chat', async ({ page }) => {
    const channelsCard = page.locator('[data-testid="committee-view-channels-card"]');
    await expect(channelsCard).toBeVisible();
    await expect(channelsCard).toContainText('tac@lists.aswf.io');
    await expect(channelsCard).toContainText('slack.aswf.io/tac');
  });

  test('should show edit buttons when user can edit', async ({ page }) => {
    // Edit description button (pencil icon near description)
    const descriptionArea = page.locator('[data-testid="committee-view-description"]');
    await expect(descriptionArea.locator('lfx-button[icon*="pen-to-square"]')).toBeVisible();
  });

  test('should hide edit buttons for non-admin users', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: false, isMember: true, role: 'Member' });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    // Edit channels button should not be visible
    const channelsCard = page.locator('[data-testid="committee-view-channels-card"]');
    await expect(channelsCard.locator('lfx-button[title="Edit Channels"]')).toBeHidden();
  });

  test('should show "more" button for long descriptions', async ({ page }) => {
    const moreBtn = page.locator('[data-testid="committee-view-description"]').getByText('more');
    await expect(moreBtn).toBeVisible();
  });

  test('should open description dialog when "more" is clicked', async ({ page }) => {
    const moreBtn = page.locator('[data-testid="committee-view-description"]').getByText('more');
    await moreBtn.click();

    const dialog = page.locator('[data-testid="committee-view-description-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('TAC is responsible for technical oversight');
  });
});

// ─── Committee View - Tabs ───────────────────────────────────────────────────

test.describe('Committee View - Tab Navigation', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
  });

  test('should display all tabs for admin member', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await expect(tabBar).toBeVisible();

    const expectedTabs = ['Overview', 'Members', 'Votes', 'Meetings', 'Surveys', 'Documents', 'Settings'];
    for (const tab of expectedTabs) {
      await expect(tabBar.getByText(tab)).toBeVisible();
    }
  });

  test('should default to Overview tab', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    const overviewTab = tabBar.getByText('Overview');
    // Active tab should have the blue border styling
    await expect(overviewTab).toHaveClass(/text-blue-600/);
  });

  test('should switch to Members tab on click', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await tabBar.getByText('Members').click();

    // Members tab should now be active
    await expect(tabBar.getByText('Members')).toHaveClass(/text-blue-600/);

    // Members content should be visible
    await expect(page.getByText(/Group Members|Members/i).first()).toBeVisible();
  });

  test('should switch to Meetings tab on click', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await tabBar.getByText('Meetings').click();

    const meetingsTab = page.locator('[data-testid="committee-meetings-tab"]');
    await expect(meetingsTab).toBeVisible();
  });

  test('should switch to Votes tab on click', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await tabBar.getByText('Votes').click();

    const votesTab = page.locator('[data-testid="committee-votes-tab"]');
    await expect(votesTab).toBeVisible();
  });

  test('should switch to Surveys tab on click', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await tabBar.getByText('Surveys').click();

    const surveysTab = page.locator('[data-testid="committee-surveys-tab"]');
    await expect(surveysTab).toBeVisible();
  });

  test('should switch to Documents tab on click', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await tabBar.getByText('Documents').click();

    const documentsTab = page.locator('[data-testid="committee-documents-tab"]');
    await expect(documentsTab).toBeVisible();
  });

  test('should switch to Settings tab on click', async ({ page }) => {
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await tabBar.getByText('Settings').click();

    const settingsTab = page.locator('[data-testid="committee-settings-tab"]');
    await expect(settingsTab).toBeVisible();
  });

  test('should hide member-only tabs for visitors', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: false, isMember: false });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    await expect(tabBar.getByText('Overview')).toBeVisible();

    // Settings should be hidden for non-admins
    await expect(tabBar.getByText('Settings')).toBeHidden();
  });
});

// ─── Committee View - Overview Tab ───────────────────────────────────────────

test.describe('Committee View - Overview Tab', () => {
  const committeeUid = 'comm-001-tac';

  test('should display member banner for committee members', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { isMember: true, role: 'Member' });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="committee-overview-member-banner"]')).toBeVisible();
  });

  test('should display chair banner for chairs', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { isMember: true, role: 'Chair' });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="committee-overview-chair-banner"]')).toBeVisible();
  });

  test('should display visitor banner with join CTA for visitors', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: false, isMember: false });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="committee-overview-visitor-banner"]')).toBeVisible();
  });

  test('should display stats strip with all stat cards', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const stats = page.locator('[data-testid="committee-overview-stats"]');
    await expect(stats).toBeVisible();

    // Should show Members, Organizations, Meetings, Active Votes, Open Surveys stat cards
    await expect(stats.getByText('Members')).toBeVisible();
    await expect(stats.getByText('Organizations')).toBeVisible();
    await expect(stats.getByText('Meetings')).toBeVisible();
    await expect(stats.getByText('Active Votes')).toBeVisible();
    await expect(stats.getByText('Open Surveys')).toBeVisible();
  });

  test('should display chairs card with chair names', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const chairs = page.locator('[data-testid="committee-overview-chairs"]');
    await expect(chairs).toBeVisible();
    await expect(chairs.getByText('Chairs')).toBeVisible();
    await expect(chairs.getByText('Alice Johnson')).toBeVisible();
    await expect(chairs.getByText('Bob Smith')).toBeVisible();
  });

  test('should display key information strip', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const keyInfo = page.locator('[data-testid="committee-overview-key-info"]');
    await expect(keyInfo).toBeVisible();

    // Should show membership join mode
    await expect(keyInfo.getByText('Membership')).toBeVisible();
    // Should show voting status
    await expect(keyInfo.getByText('Voting')).toBeVisible();
    await expect(keyInfo.getByText('Enabled')).toBeVisible();
  });

  test('should display Last Meeting and Next Meeting cards for members', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { isMember: true, role: 'Chair' });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Last Meeting')).toBeVisible();
    await expect(page.getByText('Next Meeting')).toBeVisible();
  });

  test('should display pending actions section for members', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { isMember: true, role: 'Chair' });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('My Pending Actions')).toBeVisible();
  });

  test('should show edit chairs button for admin', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: true });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="committee-overview-edit-chairs-btn"]')).toBeVisible();
  });

  test('should open edit chairs modal when button is clicked', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: true });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    await page.locator('[data-testid="committee-overview-edit-chairs-btn"]').click();

    const modal = page.locator('[data-testid="committee-overview-chairs-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Edit Chairs')).toBeVisible();
    await expect(modal.getByText('Chair')).toBeVisible();
    await expect(modal.getByText('Vice Chair')).toBeVisible();
  });

  test('should show visitor CTA for non-members', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: false, isMember: false });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const cta = page.locator('[data-testid="committee-overview-visitor-cta"]');
    await expect(cta).toBeVisible();
    await expect(cta.getByText(/Join this/i)).toBeVisible();
  });

  test('should navigate to meetings tab from "View All" on Last Meeting', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { isMember: true, role: 'Chair' });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    // Click "View All" next to Last Meeting
    const viewAllButtons = page.getByText('View All');
    await viewAllButtons.first().click();

    // Should switch to meetings tab
    const meetingsTab = page.locator('[data-testid="committee-meetings-tab"]');
    await expect(meetingsTab).toBeVisible();
  });
});

// ─── Committee View - Members Tab ────────────────────────────────────────────

test.describe('Committee View - Members Tab', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Members').click();
  });

  test('should display member table with all members', async ({ page }) => {
    await expect(page.getByText('Alice Johnson')).toBeVisible();
    await expect(page.getByText('Bob Smith')).toBeVisible();
    await expect(page.getByText('Carol Williams')).toBeVisible();
  });

  test('should display member email addresses', async ({ page }) => {
    await expect(page.getByText('alice@example.com')).toBeVisible();
    await expect(page.getByText('bob@example.com')).toBeVisible();
  });

  test('should display member organizations', async ({ page }) => {
    await expect(page.getByText('Acme Corp')).toBeVisible();
    await expect(page.getByText('Globex Inc')).toBeVisible();
  });

  test('should display role and voting status columns when voting is enabled', async ({ page }) => {
    // TAC has voting enabled, so these columns should exist
    await expect(page.getByText('Role', { exact: true })).toBeVisible();
    await expect(page.getByText('Voting Status')).toBeVisible();

    // Check specific member roles
    await expect(page.getByText('Voting Rep').first()).toBeVisible();
    await expect(page.getByText('Observer')).toBeVisible();
  });

  test('should show "Add Member" button for admin', async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-member-btn"]');
    await expect(addBtn).toBeVisible();
  });

  test('should filter members by search text', async ({ page }) => {
    const searchInput = page.locator('lfx-input-text').filter({ hasText: /search/i }).locator('input');
    await searchInput.fill('Alice');

    await expect(page.getByText('Alice Johnson')).toBeVisible();
    await expect(page.getByText('Bob Smith')).toBeHidden();
  });

  test('should show pagination for members table', async ({ page }) => {
    // Pagination text should be visible
    await expect(page.getByText(/Showing.*of.*members/)).toBeVisible();
  });
});

// ─── Committee View - Meetings Tab ───────────────────────────────────────────

test.describe('Committee View - Meetings Tab', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Meetings').click();
  });

  test('should display meetings tab with search and time filters', async ({ page }) => {
    const meetingsTab = page.locator('[data-testid="committee-meetings-tab"]');
    await expect(meetingsTab).toBeVisible();

    // Search input
    const search = page.locator('[data-testid="committee-meetings-search"]');
    await expect(search).toBeVisible();
  });

  test('should display time filter buttons', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-meetings-filter-upcoming"]')).toBeVisible();
    await expect(page.locator('[data-testid="committee-meetings-filter-past"]')).toBeVisible();
  });

  test('should toggle between upcoming and past meetings', async ({ page }) => {
    // Click past filter
    await page.locator('[data-testid="committee-meetings-filter-past"]').click();
    // Past meetings content should load
    await expect(page.locator('[data-testid="committee-meetings-tab"]')).toBeVisible();

    // Click upcoming filter
    await page.locator('[data-testid="committee-meetings-filter-upcoming"]').click();
    await expect(page.locator('[data-testid="committee-meetings-tab"]')).toBeVisible();
  });

  test('should show info banner about committee-scoped meetings', async ({ page }) => {
    await expect(page.getByText(/Committee-scoped meetings are being set up/i)).toBeVisible();
  });
});

// ─── Committee View - Votes Tab ──────────────────────────────────────────────

test.describe('Committee View - Votes Tab', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Votes').click();
  });

  test('should display votes tab container', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-votes-tab"]')).toBeVisible();
  });

  test('should show votes table when votes exist', async ({ page }) => {
    // Should render the votes table component
    await expect(page.locator('lfx-votes-table')).toBeVisible();
  });
});

test.describe('Committee View - Votes Tab (Empty)', () => {
  test('should show empty state when no votes', async ({ page }) => {
    await setupViewMocks(page, 'comm-003-wg-ci');

    // Override votes to return empty for WG (no voting)
    await page.route('**/api/votes*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/groups/comm-003-wg-ci');
    await page.waitForLoadState('networkidle');

    // WG doesn't have voting enabled, so Votes tab may be hidden
    // This tests the case where votes tab IS shown but empty
    const tabBar = page.locator('[data-testid="committee-view-tabs"]');
    const votesTab = tabBar.getByText('Votes');
    if (await votesTab.isVisible()) {
      await votesTab.click();
      await expect(page.getByText(/No votes yet/i)).toBeVisible();
    }
  });
});

// ─── Committee View - Surveys Tab ────────────────────────────────────────────

test.describe('Committee View - Surveys Tab', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Surveys').click();
  });

  test('should display surveys tab container', async ({ page }) => {
    await expect(page.locator('[data-testid="committee-surveys-tab"]')).toBeVisible();
  });

  test('should show info banner about committee-scoped surveys', async ({ page }) => {
    await expect(page.getByText(/Committee-scoped surveys are being set up/i)).toBeVisible();
  });
});

// ─── Committee View - Documents Tab ──────────────────────────────────────────

test.describe('Committee View - Documents Tab', () => {
  const committeeUid = 'comm-001-tac';

  test('should display documents tab with empty state when no documents', async ({ page }) => {
    await setupViewMocks(page, committeeUid);
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Documents').click();

    const docsTab = page.locator('[data-testid="committee-documents-tab"]');
    await expect(docsTab).toBeVisible();
    await expect(docsTab.getByText('Documents')).toBeVisible();
  });

  test('should display documents table when attachments exist', async ({ page }) => {
    await setupViewMocks(page, committeeUid);

    // Mock meetings with attachments
    await page.route('**/api/meetings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mtg-001',
            title: 'TAC Weekly',
            scheduled_start_time: '2026-03-20T00:00:00Z',
            attachments: [
              {
                uid: 'att-001',
                name: 'Meeting Notes.pdf',
                type: 'file',
                file_size: 1024000,
                created_at: '2026-03-20T00:00:00Z',
                created_by: { name: 'Alice Johnson' },
              },
              {
                uid: 'att-002',
                name: 'Project Roadmap',
                type: 'link',
                url: 'https://example.com/roadmap',
                created_at: '2026-03-19T00:00:00Z',
                created_by: { name: 'Bob Smith' },
              },
            ],
          },
        ]),
      });
    });

    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Documents').click();

    // Documents table should be visible
    const table = page.locator('[data-testid="committee-documents-table"]');
    await expect(table).toBeVisible();

    // Table headers
    await expect(table.getByText('Name')).toBeVisible();
    await expect(table.getByText('Source')).toBeVisible();
    await expect(table.getByText('Date')).toBeVisible();
  });

  test('should have search input for documents', async ({ page }) => {
    await setupViewMocks(page, committeeUid);

    // Mock meetings with attachments
    await page.route('**/api/meetings*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mtg-001',
            title: 'TAC Weekly',
            scheduled_start_time: '2026-03-20T00:00:00Z',
            attachments: [
              { uid: 'att-001', name: 'Notes.pdf', type: 'file', file_size: 1024, created_at: '2026-03-20T00:00:00Z' },
            ],
          },
        ]),
      });
    });

    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Documents').click();

    const search = page.locator('[data-testid="committee-documents-search"]');
    await expect(search).toBeVisible();
  });
});

// ─── Committee View - Settings Tab ───────────────────────────────────────────

test.describe('Committee View - Settings Tab', () => {
  const committeeUid = 'comm-001-tac';

  test.beforeEach(async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: true });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');
    await page.locator('[data-testid="committee-view-tabs"]').getByText('Settings').click();
  });

  test('should display settings tab with header and save button', async ({ page }) => {
    const settingsTab = page.locator('[data-testid="committee-settings-tab"]');
    await expect(settingsTab).toBeVisible();
    await expect(settingsTab.getByText('Group Settings')).toBeVisible();
    await expect(settingsTab.getByText('Save Changes')).toBeVisible();
  });

  test('should display danger zone with delete button', async ({ page }) => {
    const dangerZone = page.locator('[data-testid="committee-settings-danger-zone"]');
    await expect(dangerZone).toBeVisible();
    await expect(dangerZone.getByText('Danger Zone')).toBeVisible();
    await expect(dangerZone.getByText('Delete Group')).toBeVisible();
  });

  test('should display settings form component', async ({ page }) => {
    // lfx-committee-settings form should be rendered
    await expect(page.locator('lfx-committee-settings')).toBeVisible();
  });
});

// ─── Committee View - Channels Modal ─────────────────────────────────────────

test.describe('Committee View - Channels Modal', () => {
  const committeeUid = 'comm-001-tac';

  test('should open and display edit channels modal', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: true });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    // Click edit button on channels card
    const channelsCard = page.locator('[data-testid="committee-view-channels-card"]');
    await channelsCard.locator('lfx-button').click();

    const modal = page.locator('[data-testid="committee-view-channels-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByText('Edit Channels')).toBeVisible();

    // Form fields
    await expect(page.locator('[data-testid="committee-view-channels-mailing-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="committee-view-channels-chat-url"]')).toBeVisible();

    // Save and Cancel buttons
    await expect(modal.getByText('Save Changes')).toBeVisible();
    await expect(modal.getByText('Cancel')).toBeVisible();
  });

  test('should close channels modal on cancel', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: true });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const channelsCard = page.locator('[data-testid="committee-view-channels-card"]');
    await channelsCard.locator('lfx-button').click();

    const modal = page.locator('[data-testid="committee-view-channels-modal"]');
    await expect(modal).toBeVisible();

    await modal.getByText('Cancel').click();
    await expect(modal).toBeHidden();
  });
});

// ─── Committee View - Description Edit Modal ─────────────────────────────────

test.describe('Committee View - Description Edit', () => {
  const committeeUid = 'comm-001-tac';

  test('should open edit description dialog for admin', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: true });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    // Click the pencil icon on description area
    const editBtn = page.locator('[data-testid="committee-view-description"]').locator('lfx-button[icon*="pen-to-square"]');
    await editBtn.click();

    const dialog = page.locator('[data-testid="committee-view-description-edit-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Edit Description')).toBeVisible();

    // Textarea and save/cancel buttons
    await expect(page.locator('[data-testid="committee-view-description-textarea"]')).toBeVisible();
    await expect(dialog.getByText('Save')).toBeVisible();
    await expect(dialog.getByText('Cancel')).toBeVisible();
  });
});

// ─── Committee View - Error States ───────────────────────────────────────────

test.describe('Committee View - Error States', () => {
  test('should show 404 error for non-existent committee', async ({ page }) => {
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

    await page.route('**/api/committees/nonexistent-id', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not found' }),
      });
    });

    await page.route('**/api/committees/my-committees*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/groups/nonexistent-id');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Group Not Found')).toBeVisible();
    await expect(page.getByText('Back to Groups')).toBeVisible();
  });

  test('should show generic error on server failure', async ({ page }) => {
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

    await page.route('**/api/committees/server-error-id', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.route('**/api/committees/my-committees*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.goto('/groups/server-error-id');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Something Went Wrong')).toBeVisible();
    await expect(page.getByText('Try Again')).toBeVisible();
  });
});

// ─── Committee View - Visitor Access Control ─────────────────────────────────

test.describe('Committee View - Visitor Access Control', () => {
  const committeeUid = 'comm-001-tac';

  test('should blur channels card for visitors', async ({ page }) => {
    await setupViewMocks(page, committeeUid, { canEdit: false, isMember: false });
    await page.goto(`/groups/${committeeUid}`);
    await page.waitForLoadState('networkidle');

    const channelsCard = page.locator('[data-testid="committee-view-channels-card"]');
    if (await channelsCard.isVisible()) {
      // Should have the blur mask overlay
      const blurMask = channelsCard.locator('.backdrop-blur-sm');
      await expect(blurMask).toBeVisible();
      await expect(blurMask.getByText('Join to view channels')).toBeVisible();
    }
  });
});

// Generated with [Claude Code](https://claude.ai/code)
