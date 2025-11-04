// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ANALYTICS_DEFAULTS } from '@lfx-one/shared/constants';
import {
  ActiveWeeksStreakResponse,
  ActiveWeeksStreakRow,
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
  OrganizationTechnicalCommitteeResponse,
  OrganizationTechnicalCommitteeRow,
  OrganizationTotalCommitsResponse,
  ProjectCountRow,
  ProjectItem,
  UserCodeCommitsResponse,
  UserCodeCommitsRow,
  UserProjectActivityRow,
  UserProjectsResponse,
  UserPullRequestsResponse,
  UserPullRequestsRow,
} from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { AuthenticationError, ResourceNotFoundError } from '../errors';
import { Logger } from '../helpers/logger';
import { SnowflakeService } from '../services/snowflake.service';

/**
 * Controller for handling analytics HTTP requests
 * Fetches analytics data from Snowflake for dashboard visualizations
 */
export class AnalyticsController {
  private snowflakeService: SnowflakeService | null = null;

  /**
   * GET /api/analytics/active-weeks-streak
   * Get active weeks streak data for the authenticated user
   */
  public async getActiveWeeksStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_active_weeks_streak');

    try {
      // Get user email from authenticated session
      const userEmail = req.oidc?.user?.['email'];

      if (!userEmail) {
        throw new AuthenticationError('User email not found in authentication context', {
          operation: 'get_active_weeks_streak',
        });
      }

      // Execute Snowflake query with parameterized email
      const query = `
        SELECT WEEKS_AGO, IS_ACTIVE
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.ACTIVE_WEEKS_STREAK
        WHERE EMAIL = ?
        ORDER BY WEEKS_AGO ASC
        LIMIT 52
      `;

      const result = await this.getSnowflakeService().execute<ActiveWeeksStreakRow>(query, [userEmail]);

      // If no data found for user, return 404
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Active weeks streak data', userEmail, {
          operation: 'get_active_weeks_streak',
        });
      }

      // Calculate current streak (consecutive weeks of activity from week 0)
      // Data is ordered by WEEKS_AGO ASC, so index 0 is week 0 (current week)
      let currentStreak = 0;

      for (const row of result.rows) {
        if (row.IS_ACTIVE === 1) {
          currentStreak++;
        } else {
          break; // Stop at first inactive week
        }
      }

      // Build response
      const response: ActiveWeeksStreakResponse = {
        data: result.rows,
        currentStreak,
        totalWeeks: result.rows.length,
      };

      Logger.success(req, 'get_active_weeks_streak', startTime, {
        email: userEmail,
        total_weeks: result.rows.length,
        current_streak: currentStreak,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_active_weeks_streak', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/pull-requests-merged
   * Get pull requests merged activity data for the authenticated user
   */
  public async getPullRequestsMerged(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_pull_requests_merged');

    try {
      // Get user email from authenticated session
      const userEmail = req.oidc?.user?.['email'];

      if (!userEmail) {
        throw new AuthenticationError('User email not found in authentication context', {
          operation: 'get_pull_requests_merged',
        });
      }

      // Execute Snowflake query with parameterized email
      // Use window function to calculate total in SQL for accuracy
      // Filter for last 30 days of data
      const query = `
        SELECT
          ACTIVITY_DATE,
          DAILY_COUNT,
          SUM(DAILY_COUNT) OVER () as TOTAL_COUNT
        FROM ANALYTICS.PLATINUM_LFX_ONE.USER_PULL_REQUESTS
        WHERE EMAIL = ?
          AND ACTIVITY_DATE >= DATEADD(DAY, -30, CURRENT_DATE())
        ORDER BY ACTIVITY_DATE ASC
      `;

      const result = await this.getSnowflakeService().execute<UserPullRequestsRow>(query, [userEmail]);

      // If no data found for user, return 404
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Pull requests data', userEmail, {
          operation: 'get_pull_requests_merged',
        });
      }

      // Get total from SQL calculation (same value on all rows from window function)
      const totalPullRequests = result.rows[0].TOTAL_COUNT;

      // Build response
      const response: UserPullRequestsResponse = {
        data: result.rows,
        totalPullRequests,
        totalDays: result.rows.length,
      };

      Logger.success(req, 'get_pull_requests_merged', startTime, {
        email: userEmail,
        total_days: result.rows.length,
        total_pull_requests: totalPullRequests,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_pull_requests_merged', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/code-commits
   * Get code commits activity data for the authenticated user
   */
  public async getCodeCommits(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_code_commits');

    try {
      // Get user email from authenticated session
      const userEmail = req.oidc?.user?.['email'];

      if (!userEmail) {
        throw new AuthenticationError('User email not found in authentication context', {
          operation: 'get_code_commits',
        });
      }

      // Execute Snowflake query with parameterized email
      // Use window function to calculate total in SQL for accuracy
      // Filter for last 30 days of data
      const query = `
        SELECT
          ACTIVITY_DATE,
          DAILY_COUNT,
          SUM(DAILY_COUNT) OVER () as TOTAL_COUNT
        FROM ANALYTICS.PLATINUM_LFX_ONE.USER_CODE_COMMITS
        WHERE EMAIL = ?
          AND ACTIVITY_DATE >= DATEADD(DAY, -30, CURRENT_DATE())
        ORDER BY ACTIVITY_DATE ASC
      `;

      const result = await this.getSnowflakeService().execute<UserCodeCommitsRow>(query, [userEmail]);

      // If no data found for user, return 404
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Code commits data', userEmail, {
          operation: 'get_code_commits',
        });
      }

      // Get total from SQL calculation (same value on all rows from window function)
      const totalCommits = result.rows[0].TOTAL_COUNT;

      // Build response
      const response: UserCodeCommitsResponse = {
        data: result.rows,
        totalCommits,
        totalDays: result.rows.length,
      };

      Logger.success(req, 'get_code_commits', startTime, {
        email: userEmail,
        total_days: result.rows.length,
        total_commits: totalCommits,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_code_commits', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/my-projects
   * Get user's projects with activity data for the last 30 days
   * Supports pagination via query parameters: page (default 1) and limit (default 10)
   */
  public async getMyProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_my_projects');

    try {
      // Get user email from authenticated session (commented for future implementation)
      // const userEmail = req.oidc?.user?.['email'];
      // if (!userEmail) {
      //   throw new AuthenticationError('User email not found in authentication context', {
      //     operation: 'get_my_projects',
      //   });
      // }

      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query['limit'] as string, 10) || 10));
      const offset = (page - 1) * limit;

      // First, get total count of unique projects
      const countQuery = `
        SELECT COUNT(DISTINCT PROJECT_ID) as TOTAL_PROJECTS
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM.PROJECT_CODE_ACTIVITY
        WHERE ACTIVITY_DATE >= DATEADD(DAY, -30, CURRENT_DATE())
      `;

      const countResult = await this.getSnowflakeService().execute<ProjectCountRow>(countQuery, []);
      const totalProjects = countResult.rows[0]?.TOTAL_PROJECTS || 0;

      // If no projects found, return empty response
      if (totalProjects === 0) {
        Logger.success(req, 'get_my_projects', startTime, {
          page,
          limit,
          total_projects: 0,
        });

        res.json({
          data: [],
          totalProjects: 0,
        });
        return;
      }

      // Get paginated projects with all their activity data
      // Use CTE to first get paginated project list, then join for activity data
      const query = `
        WITH PaginatedProjects AS (
          SELECT DISTINCT PROJECT_ID, PROJECT_NAME, PROJECT_SLUG
          FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM.PROJECT_CODE_ACTIVITY
          WHERE ACTIVITY_DATE >= DATEADD(DAY, -30, CURRENT_DATE())
          ORDER BY PROJECT_NAME, PROJECT_ID
          LIMIT ? OFFSET ?
        )
        SELECT
          p.PROJECT_ID,
          p.PROJECT_NAME,
          p.PROJECT_SLUG,
          a.ACTIVITY_DATE,
          a.DAILY_TOTAL_ACTIVITIES,
          a.DAILY_CODE_ACTIVITIES,
          a.DAILY_NON_CODE_ACTIVITIES
        FROM PaginatedProjects p
        JOIN ANALYTICS_DEV.DEV_JEVANS_PLATINUM.PROJECT_CODE_ACTIVITY a
          ON p.PROJECT_ID = a.PROJECT_ID
        WHERE a.ACTIVITY_DATE >= DATEADD(DAY, -30, CURRENT_DATE())
        ORDER BY p.PROJECT_NAME, p.PROJECT_ID, a.ACTIVITY_DATE ASC
      `;

      const result = await this.getSnowflakeService().execute<UserProjectActivityRow>(query, [limit, offset]);

      // Group rows by PROJECT_ID and transform into ProjectItem[]
      const projectsMap = new Map<string, ProjectItem>();

      for (const row of result.rows) {
        if (!projectsMap.has(row.PROJECT_ID)) {
          // Initialize new project with placeholder values
          projectsMap.set(row.PROJECT_ID, {
            name: row.PROJECT_NAME,
            logo: undefined, // Component will show default icon
            role: 'Member', // Placeholder
            affiliations: [], // Placeholder
            codeActivities: [],
            nonCodeActivities: [],
            status: 'active', // Placeholder
          });
        }

        // Add daily activity values to arrays
        const project = projectsMap.get(row.PROJECT_ID)!;
        project.codeActivities.push(row.DAILY_CODE_ACTIVITIES);
        project.nonCodeActivities.push(row.DAILY_NON_CODE_ACTIVITIES);
      }

      // Convert map to array
      const projects = Array.from(projectsMap.values());

      // Build response
      const response: UserProjectsResponse = {
        data: projects,
        totalProjects,
      };

      Logger.success(req, 'get_my_projects', startTime, {
        page,
        limit,
        returned_projects: projects.length,
        total_projects: totalProjects,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_my_projects', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-maintainers
   * Get organization-level maintainer and project statistics
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationMaintainers(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_maintainers');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      const query = `
        SELECT MAINTAINERS, PROJECTS, ACCOUNT_ID, ACCOUNT_NAME
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_MAINTAINERS
        WHERE ACCOUNT_ID = ?
        LIMIT 1
      `;

      const result = await this.getSnowflakeService().execute<MemberDashboardMaintainersRow>(query, [accountId]);

      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization maintainers data', accountId, {
          operation: 'get_organization_maintainers',
        });
      }

      const row = result.rows[0];
      const response: OrganizationMaintainersResponse = {
        maintainers: row.MAINTAINERS,
        projects: row.PROJECTS,
        accountId: row.ACCOUNT_ID,
      };

      Logger.success(req, 'get_organization_maintainers', startTime, {
        account_id: accountId,
        maintainers: response.maintainers,
        projects: response.projects,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_maintainers', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/membership-tier
   * Get organization membership tier details including dates and pricing
   * Query params: accountId (optional) - Organization account ID
   */
  public async getMembershipTier(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_membership_tier');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      // TODO: Get PROJECT_ID from user profile or session
      const projectId = ANALYTICS_DEFAULTS.PROJECT_ID;
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      // Query for membership tier information from consolidated dashboard table
      const query = `
        SELECT *
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_MEMBERSHIP_TIER
        WHERE ACCOUNT_ID = ?
          AND PROJECT_ID = ?
        LIMIT 1
      `;

      const result = await this.getSnowflakeService().execute<MembershipTierRow>(query, [accountId, projectId]);

      // If no data found, return 404
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Membership tier data', accountId, {
          operation: 'get_membership_tier',
        });
      }

      const row = result.rows[0];

      // Extract tier name (remove " Membership" suffix if present)
      const tier = row.MEMBERSHIP_TIER.replace(' Membership', '');

      // Build response
      const response: MembershipTierResponse = {
        tier,
        membershipStartDate: row.CURRENT_MEMBERSHIP_START_DATE,
        membershipEndDate: row.CURRENT_MEMBERSHIP_END_DATE,
        membershipPrice: row.MEMBERSHIP_PRICE,
        membershipStatus: row.MEMBERSHIP_STATUS,
        accountId: row.ACCOUNT_ID,
      };

      Logger.success(req, 'get_membership_tier', startTime, {
        account_id: accountId,
        project_id: projectId,
        tier: response.tier,
        status: response.membershipStatus,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_membership_tier', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-contributors
   * Get organization-level contributor statistics
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationContributors(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_contributors');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      // Query for organization contributors
      const query = `
        SELECT CONTRIBUTORS, ACCOUNT_ID, ACCOUNT_NAME, PROJECTS
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_CONTRIBUTORS
        WHERE ACCOUNT_ID = ?
        LIMIT 1
      `;

      const result = await this.getSnowflakeService().execute<OrganizationContributorsRow>(query, [accountId]);

      // If no data found, return 404
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization contributors data', accountId, {
          operation: 'get_organization_contributors',
        });
      }

      const row = result.rows[0];

      // Build response
      const response: OrganizationContributorsResponse = {
        contributors: row.CONTRIBUTORS,
        accountId: row.ACCOUNT_ID,
        accountName: row.ACCOUNT_NAME,
        projects: row.PROJECTS,
      };

      Logger.success(req, 'get_organization_contributors', startTime, {
        account_id: accountId,
        contributors: response.contributors,
        projects: response.projects,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_contributors', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-event-attendance
   * Get organization event attendance statistics (total attendees and speakers)
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationEventAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_event_attendance');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

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

      const result = await this.getSnowflakeService().execute<OrganizationEventAttendanceRow>(query, [accountId]);

      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization event attendance data', accountId, {
          operation: 'get_organization_event_attendance',
        });
      }

      const row = result.rows[0];
      const response: OrganizationEventAttendanceResponse = {
        totalAttendees: row.TOTAL_ATTENDEES,
        totalSpeakers: row.TOTAL_SPEAKERS,
        totalEvents: row.TOTAL_EVENTS,
        accountId: row.ACCOUNT_ID,
        accountName: row.ACCOUNT_NAME,
      };

      Logger.success(req, 'get_organization_event_attendance', startTime, {
        account_id: accountId,
        total_attendees: response.totalAttendees,
        total_speakers: response.totalSpeakers,
        total_events: response.totalEvents,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_event_attendance', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-technical-committee
   * Get organization-level technical committee participation (TOC/TSC/TAG representatives)
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationTechnicalCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_technical_committee');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      // Query with SQL aggregation for better performance
      const query = `
        SELECT
          SUM(COUNT) AS TOTAL_REPRESENTATIVES,
          COUNT(DISTINCT PROJECT_ID) AS TOTAL_PROJECTS,
          MAX(ACCOUNT_ID) AS ACCOUNT_ID
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.TECHNICAL_COMMITTEE_MEMBER_COUNT
        WHERE ACCOUNT_ID = ?
        GROUP BY ACCOUNT_ID
      `;

      const result = await this.getSnowflakeService().execute<OrganizationTechnicalCommitteeRow>(query, [accountId]);

      // If no data found, return 404
      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization technical committee data', accountId, {
          operation: 'get_organization_technical_committee',
        });
      }

      const row = result.rows[0];

      // Build response
      const response: OrganizationTechnicalCommitteeResponse = {
        totalRepresentatives: row.TOTAL_REPRESENTATIVES,
        totalProjects: row.TOTAL_PROJECTS,
        accountId: row.ACCOUNT_ID,
      };

      Logger.success(req, 'get_organization_technical_committee', startTime, {
        account_id: accountId,
        total_representatives: response.totalRepresentatives,
        total_projects: response.totalProjects,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_technical_committee', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-projects-participating
   * Get organization-level projects participating count
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationProjectsParticipating(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_projects_participating');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;
      // Hardcoded segment_id as per user requirement
      const segmentId = ANALYTICS_DEFAULTS.SEGMENT_ID;

      const query = `
        SELECT ACCOUNT_ID, SEGMENT_ID, PROJECTS_PARTICIPATING
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_PROJECTS_PARTICIPATING
        WHERE ACCOUNT_ID = ?
          AND SEGMENT_ID = ?
        LIMIT 1
      `;

      const result = await this.getSnowflakeService().execute<MemberDashboardProjectsParticipatingRow>(query, [accountId, segmentId]);

      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization projects participating data', accountId, {
          operation: 'get_organization_projects_participating',
        });
      }

      const row = result.rows[0];
      const response: OrganizationProjectsParticipatingResponse = {
        projectsParticipating: row.PROJECTS_PARTICIPATING,
        accountId: row.ACCOUNT_ID,
        segmentId: row.SEGMENT_ID,
      };

      Logger.success(req, 'get_organization_projects_participating', startTime, {
        account_id: accountId,
        segment_id: segmentId,
        projects_participating: response.projectsParticipating,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_projects_participating', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-total-commits
   * Get organization-level total commits count
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationTotalCommits(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_total_commits');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;
      // Hardcoded segment_id as per user requirement
      const segmentId = ANALYTICS_DEFAULTS.SEGMENT_ID;

      const query = `
        SELECT ACCOUNT_ID, SEGMENT_ID, TOTAL_COMMITS
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_TOTAL_COMMITS
        WHERE ACCOUNT_ID = ?
          AND SEGMENT_ID = ?
        LIMIT 1
      `;

      const result = await this.getSnowflakeService().execute<MemberDashboardTotalCommitsRow>(query, [accountId, segmentId]);

      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization total commits data', accountId, {
          operation: 'get_organization_total_commits',
        });
      }

      const row = result.rows[0];
      const response: OrganizationTotalCommitsResponse = {
        totalCommits: row.TOTAL_COMMITS,
        accountId: row.ACCOUNT_ID,
        segmentId: row.SEGMENT_ID,
      };

      Logger.success(req, 'get_organization_total_commits', startTime, {
        account_id: accountId,
        segment_id: segmentId,
        total_commits: response.totalCommits,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_total_commits', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-certified-employees
   * Get organization-level certified employees and certifications count
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationCertifiedEmployees(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_certified_employees');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;
      // TODO: Get PROJECT_ID from user profile or session
      const projectId = ANALYTICS_DEFAULTS.PROJECT_ID;

      const query = `
        SELECT CERTIFICATIONS, CERTIFIED_EMPLOYEES, ACCOUNT_ID, PROJECT_ID
        FROM ANALYTICS_DEV.DEV_JEVANS_PLATINUM_LFX_ONE.MEMBER_DASHBOARD_CERTIFIED_EMPLOYEES
        WHERE ACCOUNT_ID = ?
          AND PROJECT_ID = ?
        LIMIT 1
      `;

      const result = await this.getSnowflakeService().execute<MemberDashboardCertifiedEmployeesRow>(query, [accountId, projectId]);

      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization certified employees data', accountId, {
          operation: 'get_organization_certified_employees',
        });
      }

      const row = result.rows[0];
      const response: OrganizationCertifiedEmployeesResponse = {
        certifications: row.CERTIFICATIONS,
        certifiedEmployees: row.CERTIFIED_EMPLOYEES,
        accountId: row.ACCOUNT_ID,
      };

      Logger.success(req, 'get_organization_certified_employees', startTime, {
        account_id: accountId,
        project_id: projectId,
        certifications: response.certifications,
        certified_employees: response.certifiedEmployees,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_certified_employees', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-board-meeting-attendance
   * Get organization-level board meeting attendance with percentage calculation
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationBoardMeetingAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_board_meeting_attendance');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;
      // TODO: Get PROJECT_ID from user profile or session
      const projectId = ANALYTICS_DEFAULTS.PROJECT_ID;

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

      const result = await this.getSnowflakeService().execute<MemberDashboardBoardMeetingAttendanceRow>(query, [accountId, projectId]);

      if (result.rows.length === 0) {
        throw new ResourceNotFoundError('Organization board meeting attendance data', accountId, {
          operation: 'get_organization_board_meeting_attendance',
        });
      }

      const row = result.rows[0];
      const response: OrganizationBoardMeetingAttendanceResponse = {
        totalMeetings: row.TOTAL_MEETINGS,
        attendedMeetings: row.ATTENDED_MEETINGS,
        notAttendedMeetings: row.NOT_ATTENDED_MEETINGS,
        attendancePercentage: row.ATTENDANCE_PERCENTAGE,
        accountId: row.ACCOUNT_ID,
      };

      Logger.success(req, 'get_organization_board_meeting_attendance', startTime, {
        account_id: accountId,
        project_id: projectId,
        total_meetings: response.totalMeetings,
        attended_meetings: response.attendedMeetings,
        attendance_percentage: response.attendancePercentage,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_board_meeting_attendance', startTime, error);
      next(error);
    }
  }

  /**
   * GET /api/analytics/organization-event-sponsorships
   * Get organization-level event sponsorships grouped by currency with total event count
   * Query params: accountId (optional) - Organization account ID
   */
  public async getOrganizationEventSponsorships(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_organization_event_sponsorships');

    try {
      // Get accountId from query params, fallback to default Microsoft Corporation
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;
      // TODO: Get PROJECT_ID from user profile or session
      const projectId = ANALYTICS_DEFAULTS.PROJECT_ID;

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

      const result = await this.getSnowflakeService().execute<OrganizationEventSponsorshipsAggregateRow>(query, [accountId, projectId]);

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

      const eventCountResult = await this.getSnowflakeService().execute<OrganizationEventSponsorshipsEventCountRow>(eventCountQuery, [accountId, projectId]);
      const totalEvents = eventCountResult.rows[0]?.TOTAL_EVENTS || 0;

      // Build currency summaries
      const currencySummaries = result.rows.map((row) => ({
        amount: row.TOTAL_AMOUNT,
        currencyCode: row.CURRENCY_CODE,
      }));

      const response: OrganizationEventSponsorshipsResponse = {
        currencySummaries,
        totalEvents,
        accountId: result.rows[0].ACCOUNT_ID,
      };

      Logger.success(req, 'get_organization_event_sponsorships', startTime, {
        account_id: accountId,
        project_id: projectId,
        currency_summaries: currencySummaries,
        total_events: totalEvents,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_event_sponsorships', startTime, error);
      next(error);
    }
  }

  /**
   * Lazy initialization of SnowflakeService
   * Ensures serverLogger is fully initialized before creating the service
   */
  private getSnowflakeService(): SnowflakeService {
    if (!this.snowflakeService) {
      this.snowflakeService = new SnowflakeService();
    }
    return this.snowflakeService;
  }
}
