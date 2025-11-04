// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  MemberDashboardBoardMeetingAttendanceRow,
  MemberDashboardCertifiedEmployeesRow,
  MemberDashboardMaintainersRow,
  MemberDashboardProjectsParticipatingRow,
  MemberDashboardTotalCommitsRow,
  MembershipTierResponse,
  MembershipTierRow,
  OrganizationBoardMeetingAttendanceResponse,
  OrganizationCertifiedEmployeesResponse,
  OrganizationContributorsResponse,
  OrganizationContributorsRow,
  OrganizationEventAttendanceResponse,
  OrganizationEventAttendanceRow,
  OrganizationEventSponsorshipsAggregateRow,
  OrganizationEventSponsorshipsEventCountRow,
  OrganizationEventSponsorshipsResponse,
  OrganizationMaintainersResponse,
  OrganizationProjectsParticipatingResponse,
  OrganizationSuggestion,
  OrganizationSuggestionsResponse,
  OrganizationTechnicalCommitteeResponse,
  OrganizationTechnicalCommitteeRow,
  OrganizationTotalCommitsResponse,
} from '@lfx-one/shared';
import { Request } from 'express';

import { ResourceNotFoundError } from '../errors';
import { MicroserviceProxyService } from './microservice-proxy.service';
import { SnowflakeService } from './snowflake.service';

/**
 * Service for handling organization-related operations and analytics
 *
 * Generated with [Claude Code](https://claude.ai/code)
 */
export class OrganizationService {
  private microserviceProxy: MicroserviceProxyService;
  private snowflakeService: SnowflakeService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
    this.snowflakeService = new SnowflakeService();
  }

  /**
   * Search for organizations using the microservice proxy
   * @param req - Express request object (needed for authentication)
   * @param query - The search query
   * @returns Promise of organization suggestions
   */
  public async searchOrganizations(req: Request, query: string): Promise<OrganizationSuggestion[]> {
    const params = {
      v: 1,
      query,
    };

    const response = await this.microserviceProxy.proxyRequest<OrganizationSuggestionsResponse>(req, 'LFX_V2_SERVICE', '/query/orgs/suggest', 'GET', params);

    return response.suggestions || [];
  }

  /**
   * Get organization-level maintainer and project statistics
   * @param accountId - Organization account ID
   * @returns Maintainer and project counts
   */
  public async getMaintainers(accountId: string): Promise<OrganizationMaintainersResponse> {
    const query = `
      SELECT MAINTAINERS, PROJECTS, ACCOUNT_ID, ACCOUNT_NAME
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_MAINTAINERS
      WHERE ACCOUNT_ID = ?
      LIMIT 1
    `;

    const result = await this.snowflakeService.execute<MemberDashboardMaintainersRow>(query, [accountId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization maintainers data', accountId, {
        operation: 'get_organization_maintainers',
      });
    }

    const row = result.rows[0];

    return {
      maintainers: row.MAINTAINERS,
      projects: row.PROJECTS,
      accountId: row.ACCOUNT_ID,
    };
  }

  /**
   * Get organization membership tier details including dates and pricing
   * @param accountId - Organization account ID
   * @param projectId - Project ID
   * @returns Membership tier information
   */
  public async getMembershipTier(accountId: string, projectId: string): Promise<MembershipTierResponse> {
    const query = `
      SELECT *
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_MEMBERSHIP_TIER
      WHERE ACCOUNT_ID = ?
        AND PROJECT_ID = ?
      LIMIT 1
    `;

    const result = await this.snowflakeService.execute<MembershipTierRow>(query, [accountId, projectId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Membership tier data', accountId, {
        operation: 'get_membership_tier',
      });
    }

    const row = result.rows[0];

    // Extract tier name (remove " Membership" suffix if present)
    const tier = row.MEMBERSHIP_TIER.replace(' Membership', '');

    return {
      tier,
      membershipStartDate: row.CURRENT_MEMBERSHIP_START_DATE,
      membershipEndDate: row.CURRENT_MEMBERSHIP_END_DATE,
      membershipPrice: row.MEMBERSHIP_PRICE,
      membershipStatus: row.MEMBERSHIP_STATUS,
      accountId: row.ACCOUNT_ID,
    };
  }

  /**
   * Get organization-level contributor statistics
   * @param accountId - Organization account ID
   * @returns Contributor statistics
   */
  public async getContributors(accountId: string): Promise<OrganizationContributorsResponse> {
    const query = `
      SELECT CONTRIBUTORS, ACCOUNT_ID, ACCOUNT_NAME, PROJECTS
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_CONTRIBUTORS
      WHERE ACCOUNT_ID = ?
      LIMIT 1
    `;

    const result = await this.snowflakeService.execute<OrganizationContributorsRow>(query, [accountId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization contributors data', accountId, {
        operation: 'get_organization_contributors',
      });
    }

    const row = result.rows[0];

    return {
      contributors: row.CONTRIBUTORS,
      accountId: row.ACCOUNT_ID,
      accountName: row.ACCOUNT_NAME,
      projects: row.PROJECTS,
    };
  }

  /**
   * Get organization event attendance statistics
   * @param accountId - Organization account ID
   * @returns Total attendees, speakers, and events
   */
  public async getEventAttendance(accountId: string): Promise<OrganizationEventAttendanceResponse> {
    const query = `
      SELECT
        SUM(ATTENDEES) AS TOTAL_ATTENDEES,
        SUM(SPEAKERS) AS TOTAL_SPEAKERS,
        COUNT(*) AS TOTAL_EVENTS,
        MAX(ACCOUNT_ID) AS ACCOUNT_ID,
        MAX(ACCOUNT_NAME) AS ACCOUNT_NAME
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_EVENT_ATTENDANCE
      WHERE ACCOUNT_ID = ?
      GROUP BY ACCOUNT_ID
    `;

    const result = await this.snowflakeService.execute<OrganizationEventAttendanceRow>(query, [accountId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization event attendance data', accountId, {
        operation: 'get_organization_event_attendance',
      });
    }

    const row = result.rows[0];

    return {
      totalAttendees: row.TOTAL_ATTENDEES,
      totalSpeakers: row.TOTAL_SPEAKERS,
      totalEvents: row.TOTAL_EVENTS,
      accountId: row.ACCOUNT_ID,
      accountName: row.ACCOUNT_NAME,
    };
  }

  /**
   * Get organization-level technical committee participation
   * @param accountId - Organization account ID
   * @returns TOC/TSC/TAG representatives count
   */
  public async getTechnicalCommittee(accountId: string): Promise<OrganizationTechnicalCommitteeResponse> {
    const query = `
      SELECT
        SUM(COUNT) AS TOTAL_REPRESENTATIVES,
        COUNT(DISTINCT PROJECT_ID) AS TOTAL_PROJECTS,
        MAX(ACCOUNT_ID) AS ACCOUNT_ID
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.TECHNICAL_COMMITTEE_MEMBER_COUNT
      WHERE ACCOUNT_ID = ?
      GROUP BY ACCOUNT_ID
    `;

    const result = await this.snowflakeService.execute<OrganizationTechnicalCommitteeRow>(query, [accountId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization technical committee data', accountId, {
        operation: 'get_organization_technical_committee',
      });
    }

    const row = result.rows[0];

    return {
      totalRepresentatives: row.TOTAL_REPRESENTATIVES,
      totalProjects: row.TOTAL_PROJECTS,
      accountId: row.ACCOUNT_ID,
    };
  }

  /**
   * Get organization-level projects participating count
   * @param accountId - Organization account ID
   * @param segmentId - Segment ID (temporary mapping for project IDs)
   * @returns Projects participating count
   */
  public async getProjectsParticipating(accountId: string, segmentId: string): Promise<OrganizationProjectsParticipatingResponse> {
    const query = `
      SELECT ACCOUNT_ID, SEGMENT_ID, PROJECTS_PARTICIPATING
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_PROJECTS_PARTICIPATING
      WHERE ACCOUNT_ID = ?
        AND SEGMENT_ID = ?
      LIMIT 1
    `;

    const result = await this.snowflakeService.execute<MemberDashboardProjectsParticipatingRow>(query, [accountId, segmentId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization projects participating data', accountId, {
        operation: 'get_organization_projects_participating',
      });
    }

    const row = result.rows[0];

    return {
      projectsParticipating: row.PROJECTS_PARTICIPATING,
      accountId: row.ACCOUNT_ID,
      segmentId: row.SEGMENT_ID,
    };
  }

  /**
   * Get organization-level total commits count
   * @param accountId - Organization account ID
   * @param segmentId - Segment ID (temporary mapping for project IDs)
   * @returns Total commits count
   */
  public async getTotalCommits(accountId: string, segmentId: string): Promise<OrganizationTotalCommitsResponse> {
    const query = `
      SELECT ACCOUNT_ID, SEGMENT_ID, TOTAL_COMMITS
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_TOTAL_COMMITS
      WHERE ACCOUNT_ID = ?
        AND SEGMENT_ID = ?
      LIMIT 1
    `;

    const result = await this.snowflakeService.execute<MemberDashboardTotalCommitsRow>(query, [accountId, segmentId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization total commits data', accountId, {
        operation: 'get_organization_total_commits',
      });
    }

    const row = result.rows[0];

    return {
      totalCommits: row.TOTAL_COMMITS,
      accountId: row.ACCOUNT_ID,
      segmentId: row.SEGMENT_ID,
    };
  }

  /**
   * Get organization-level certified employees and certifications count
   * @param accountId - Organization account ID
   * @param projectId - Project ID
   * @returns Certified employees and certifications count
   */
  public async getCertifiedEmployees(accountId: string, projectId: string): Promise<OrganizationCertifiedEmployeesResponse> {
    const query = `
      SELECT CERTIFICATIONS, CERTIFIED_EMPLOYEES, ACCOUNT_ID, PROJECT_ID
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_CERTIFIED_EMPLOYEES
      WHERE ACCOUNT_ID = ?
        AND PROJECT_ID = ?
      LIMIT 1
    `;

    const result = await this.snowflakeService.execute<MemberDashboardCertifiedEmployeesRow>(query, [accountId, projectId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization certified employees data', accountId, {
        operation: 'get_organization_certified_employees',
      });
    }

    const row = result.rows[0];

    return {
      certifications: row.CERTIFICATIONS,
      certifiedEmployees: row.CERTIFIED_EMPLOYEES,
      accountId: row.ACCOUNT_ID,
    };
  }

  /**
   * Get organization-level board meeting attendance with percentage
   * @param accountId - Organization account ID
   * @param projectId - Project ID
   * @returns Board meeting attendance statistics
   */
  public async getBoardMeetingAttendance(accountId: string, projectId: string): Promise<OrganizationBoardMeetingAttendanceResponse> {
    const query = `
      SELECT
        TOTAL_MEETINGS,
        ATTENDED_MEETINGS,
        NOT_ATTENDED_MEETINGS,
        CASE
          WHEN TOTAL_MEETINGS > 0 THEN (ATTENDED_MEETINGS::FLOAT / TOTAL_MEETINGS::FLOAT) * 100
          ELSE 0
        END AS ATTENDANCE_PERCENTAGE,
        ACCOUNT_ID,
        PROJECT_ID
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_BOARD_MEETING_ATTENDANCE
      WHERE ACCOUNT_ID = ?
        AND PROJECT_ID = ?
      LIMIT 1
    `;

    const result = await this.snowflakeService.execute<MemberDashboardBoardMeetingAttendanceRow>(query, [accountId, projectId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization board meeting attendance data', accountId, {
        operation: 'get_organization_board_meeting_attendance',
      });
    }

    const row = result.rows[0];

    return {
      totalMeetings: row.TOTAL_MEETINGS,
      attendedMeetings: row.ATTENDED_MEETINGS,
      notAttendedMeetings: row.NOT_ATTENDED_MEETINGS,
      attendancePercentage: row.ATTENDANCE_PERCENTAGE,
      accountId: row.ACCOUNT_ID,
    };
  }

  /**
   * Get organization-level event sponsorships grouped by currency
   * @param accountId - Organization account ID
   * @param projectId - Project ID
   * @returns Event sponsorships by currency with total event count
   */
  public async getEventSponsorships(accountId: string, projectId: string): Promise<OrganizationEventSponsorshipsResponse> {
    // Query to get sum per currency
    const query = `
      SELECT
        SUM(PRICE) AS TOTAL_AMOUNT,
        CURRENCY_CODE,
        MAX(ACCOUNT_ID) AS ACCOUNT_ID
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_EVENT_SPONSORSHIPS
      WHERE ACCOUNT_ID = ?
        AND PROJECT_ID = ?
      GROUP BY CURRENCY_CODE
      ORDER BY CURRENCY_CODE
    `;

    const result = await this.snowflakeService.execute<OrganizationEventSponsorshipsAggregateRow>(query, [accountId, projectId]);

    if (result.rows.length === 0) {
      throw new ResourceNotFoundError('Organization event sponsorships data', accountId, {
        operation: 'get_organization_event_sponsorships',
      });
    }

    // Query to get total distinct events (across all currencies)
    const eventCountQuery = `
      SELECT COUNT(DISTINCT EVENT_ID) AS TOTAL_EVENTS
      FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_EVENT_SPONSORSHIPS
      WHERE ACCOUNT_ID = ?
        AND PROJECT_ID = ?
    `;

    const eventCountResult = await this.snowflakeService.execute<OrganizationEventSponsorshipsEventCountRow>(eventCountQuery, [accountId, projectId]);
    const totalEvents = eventCountResult.rows[0]?.TOTAL_EVENTS || 0;

    // Build currency summaries
    const currencySummaries = result.rows.map((row) => ({
      amount: row.TOTAL_AMOUNT,
      currencyCode: row.CURRENCY_CODE,
    }));

    return {
      currencySummaries,
      totalEvents,
      accountId: result.rows[0].ACCOUNT_ID,
    };
  }
}
