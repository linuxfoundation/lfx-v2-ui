// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Page } from '@playwright/test';

import { mockCommittee, mockCommitteeMembers, mockPendingApplication, mockPendingInvite } from '../fixtures/mock-data/committees.mock';
import { getMockProject } from '../fixtures/mock-data';

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
   * Mock GET /api/committees/:id — returns a single committee
   */
  static async setupCommitteeMock(page: Page, committeeId: string): Promise<void> {
    await page.route(`**/api/committees/${committeeId}`, async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockCommittee, uid: committeeId }),
      });
    });
  }

  /**
   * Mock GET/POST/DELETE /api/committees/:id/members — member CRUD
   */
  static async setupCommitteeMembersMock(page: Page, committeeId: string): Promise<void> {
    // Individual member DELETE
    await page.route(`**/api/committees/${committeeId}/members/*`, async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });
        return;
      }
      await route.continue();
    });

    // List + Create
    await page.route(`**/api/committees/${committeeId}/members`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON();
        const created = {
          uid: `mock-member-${Date.now()}`,
          committee_uid: committeeId,
          committee_name: mockCommittee.name,
          ...body,
          status: 'Active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(created),
        });
        return;
      }

      // GET — return member list
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCommitteeMembers),
      });
    });
  }

  /**
   * Mock POST /api/committees/:id/invites — send invites
   */
  static async setupCommitteeInviteMock(page: Page, committeeId: string): Promise<void> {
    await page.route(`**/api/committees/${committeeId}/invites`, async (route) => {
      if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON();
        const invites = (body.emails || []).map((email: string, i: number) => ({
          ...mockPendingInvite,
          uid: `mock-invite-${Date.now()}-${i}`,
          committee_uid: committeeId,
          invitee_email: email,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        }));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(invites),
        });
        return;
      }

      // GET — return pending invites
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockPendingInvite]),
      });
    });
  }

  /**
   * Mock GET/POST /api/committees/:id/applications — join applications + approve/reject
   */
  static async setupCommitteeApplicationMock(page: Page, committeeId: string): Promise<void> {
    // Approve / Reject sub-routes
    await page.route(`**/api/committees/${committeeId}/applications/*/approve`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockPendingApplication, status: 'approved', reviewed_at: new Date().toISOString() }),
      });
    });

    await page.route(`**/api/committees/${committeeId}/applications/*/reject`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...mockPendingApplication, status: 'rejected', reviewed_at: new Date().toISOString() }),
      });
    });

    // List applications
    await page.route(`**/api/committees/${committeeId}/applications`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([mockPendingApplication]),
      });
    });
  }
}
