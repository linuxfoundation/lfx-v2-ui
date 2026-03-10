// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Page } from '@playwright/test';

import {
  getAllMockMeetings,
  getAllMockSurveys,
  getMockCommitteeChannels,
  getMockMeetingsByProject,
  getMockProject,
  getMockSurveysByCommittee,
  getMockSurveysByProject,
} from '../fixtures/mock-data';

/**
 * Helper class for mocking the project slug endpoint in Playwright tests
 * Only handles /api/projects/:slug endpoint that depends on NATS
 */
export class ApiMockHelper {
  /**
   * Setup mock for the project slug endpoint only
   * @param page - Playwright page instance
   * @param options - Optional configuration for the mock
   * @param options.writer - Override the writer permission for the project
   */
  static async setupProjectSlugMock(page: Page, options?: { writer?: boolean }): Promise<void> {
    // Mock individual project by slug endpoint (/api/projects/:slug)
    await page.route('**/api/projects/*', async (route) => {
      const url = route.request().url();

      // Skip other endpoints - only handle direct slug requests
      if (url.includes('/search')) {
        await route.continue();
        return;
      }

      const pathSegments = url.split('/');
      const slug = pathSegments[pathSegments.length - 1].split('?')[0]; // Remove query params

      console.log(`[Mock] Intercepting project request for slug: "${slug}"`);

      const project = getMockProject(slug);

      if (!project) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Project not found',
            code: 'PROJECT_NOT_FOUND',
          }),
        });
        return;
      }

      // Apply writer permission override if provided
      let finalProject = project;
      if (options?.writer !== undefined) {
        finalProject = { ...project, writer: options.writer };
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(finalProject),
      });
    });
  }

  /**
   * Setup mock for GET /api/committees/:id that merges channel data into the real API response.
   * Intercepts the response and enriches it with mailing_list and chat_channel if mock data exists.
   * @param page - Playwright page instance
   */
  static async setupCommitteeChannelsMock(page: Page): Promise<void> {
    await page.route('**/api/committees/*', async (route) => {
      const url = route.request().url();

      // Only intercept GET requests for individual committees (not sub-resources)
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      // Extract committee ID from the URL path
      const pathSegments = url.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1].split('?')[0];

      // Skip sub-resource endpoints (members, votes, surveys, etc.)
      const subResourcePaths = [
        'members',
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
        'surveys',
        'invites',
        'applications',
        'join',
        'leave',
        'count',
        'my',
        'settings',
      ];
      if (subResourcePaths.includes(lastSegment)) {
        await route.continue();
        return;
      }

      const committeeId = lastSegment;
      const channels = getMockCommitteeChannels(committeeId);

      if (!channels) {
        await route.continue();
        return;
      }

      // Fetch the real response and merge channel data
      try {
        const response = await route.fetch();
        const body = await response.json();

        const enriched = { ...body, ...channels };

        console.log(`[Mock] Enriching committee ${committeeId} with channel data`);

        await route.fulfill({
          status: response.status(),
          contentType: 'application/json',
          body: JSON.stringify(enriched),
        });
      } catch {
        // If the real API fails, continue without enrichment
        await route.continue();
      }
    });
  }

  /**
   * Setup mock for survey endpoints:
   * - GET /api/surveys (global dashboard, filtered by parent=project:<uid>)
   * - GET /api/committees/:id/surveys (committee surveys tab)
   * @param page - Playwright page instance
   */
  static async setupSurveysMock(page: Page): Promise<void> {
    // Intercept global surveys endpoint: GET /api/surveys?parent=project:<uid>
    await page.route('**/api/surveys?**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const url = new URL(route.request().url());
      const parent = url.searchParams.get('parent') || '';

      // Extract project_uid from parent parameter (format: "project:<uid>")
      const projectUidMatch = parent.match(/project:(\S+)/);
      const projectUid = projectUidMatch?.[1];

      const surveys = projectUid ? getMockSurveysByProject(projectUid) : getAllMockSurveys();

      console.log(`[Mock] Intercepting surveys request (project_uid: ${projectUid || 'all'}, count: ${surveys.length})`);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(surveys),
      });
    });

    // Intercept committee surveys endpoint: GET /api/committees/:id/surveys
    await page.route('**/api/committees/*/surveys', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const url = route.request().url();
      const pathSegments = url.split('/');
      // URL pattern: .../api/committees/<id>/surveys
      const surveysIndex = pathSegments.indexOf('surveys');
      const committeeId = surveysIndex > 0 ? pathSegments[surveysIndex - 1] : '';

      const surveys = committeeId ? getMockSurveysByCommittee(committeeId) : getAllMockSurveys();

      console.log(`[Mock] Intercepting committee surveys request (committee_uid: ${committeeId || 'all'}, count: ${surveys.length})`);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(surveys),
      });
    });
  }

  /**
   * Setup mock for GET /api/meetings
   * Returns mock meetings filtered by project_uid tag if provided
   * @param page - Playwright page instance
   */
  static async setupMeetingsMock(page: Page): Promise<void> {
    await page.route('**/api/meetings?**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      const url = new URL(route.request().url());
      const tags = url.searchParams.get('tags') || '';

      // Extract project_uid from tags parameter (format: "project_uid:<uid>")
      const projectUidMatch = tags.match(/project_uid:(\S+)/);
      const projectUid = projectUidMatch?.[1];

      const meetings = projectUid ? getMockMeetingsByProject(projectUid) : getAllMockMeetings();

      console.log(`[Mock] Intercepting meetings request (project_uid: ${projectUid || 'all'}, count: ${meetings.length})`);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: meetings, page_token: undefined }),
      });
    });
  }
}
