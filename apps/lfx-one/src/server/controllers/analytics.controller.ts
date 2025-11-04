// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ANALYTICS_DEFAULTS } from '@lfx-one/shared/constants';
import { NextFunction, Request, Response } from 'express';

import { AuthenticationError } from '../errors';
import { Logger } from '../helpers/logger';
import { OrganizationService } from '../services/organization.service';
import { UserService } from '../services/user.service';

/**
 * Controller for handling analytics HTTP requests
 * Routes requests to appropriate domain services
 *
 * Generated with [Claude Code](https://claude.ai/code)
 */
export class AnalyticsController {
  private userService: UserService;
  private organizationService: OrganizationService;

  public constructor() {
    this.userService = new UserService();
    this.organizationService = new OrganizationService();
  }

  /**
   * GET /api/analytics/active-weeks-streak
   * Get active weeks streak data for the authenticated user
   */
  public async getActiveWeeksStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = Logger.start(req, 'get_active_weeks_streak');

    try {
      const userEmail = req.oidc?.user?.['email'];

      if (!userEmail) {
        throw new AuthenticationError('User email not found in authentication context', {
          operation: 'get_active_weeks_streak',
        });
      }

      const response = await this.userService.getActiveWeeksStreak(userEmail);

      Logger.success(req, 'get_active_weeks_streak', startTime, {
        email: userEmail,
        total_weeks: response.totalWeeks,
        current_streak: response.currentStreak,
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
      const userEmail = req.oidc?.user?.['email'];

      if (!userEmail) {
        throw new AuthenticationError('User email not found in authentication context', {
          operation: 'get_pull_requests_merged',
        });
      }

      const response = await this.userService.getPullRequestsMerged(userEmail);

      Logger.success(req, 'get_pull_requests_merged', startTime, {
        email: userEmail,
        total_days: response.totalDays,
        total_pull_requests: response.totalPullRequests,
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
      const userEmail = req.oidc?.user?.['email'];

      if (!userEmail) {
        throw new AuthenticationError('User email not found in authentication context', {
          operation: 'get_code_commits',
        });
      }

      const response = await this.userService.getCodeCommits(userEmail);

      Logger.success(req, 'get_code_commits', startTime, {
        email: userEmail,
        total_days: response.totalDays,
        total_commits: response.totalCommits,
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
      // Parse pagination parameters
      const page = Math.max(1, parseInt(req.query['page'] as string, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query['limit'] as string, 10) || 10));

      const response = await this.userService.getMyProjects(page, limit);

      Logger.success(req, 'get_my_projects', startTime, {
        page,
        limit,
        returned_projects: response.data.length,
        total_projects: response.totalProjects,
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
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      const response = await this.organizationService.getMaintainers(accountId);

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
      const projectId = ANALYTICS_DEFAULTS.PROJECT_ID;
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      const response = await this.organizationService.getMembershipTier(accountId, projectId);

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
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      const response = await this.organizationService.getContributors(accountId);

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
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      const response = await this.organizationService.getEventAttendance(accountId);

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
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;

      const response = await this.organizationService.getTechnicalCommittee(accountId);

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
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;
      const segmentId = ANALYTICS_DEFAULTS.SEGMENT_ID;

      const response = await this.organizationService.getProjectsParticipating(accountId, segmentId);

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

      const response = await this.organizationService.getTotalCommits(accountId, segmentId);

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

      const response = await this.organizationService.getCertifiedEmployees(accountId, projectId);

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

      const response = await this.organizationService.getBoardMeetingAttendance(accountId, projectId);

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
      const accountId = (req.query['accountId'] as string) || ANALYTICS_DEFAULTS.ACCOUNT_ID;
      const projectId = ANALYTICS_DEFAULTS.PROJECT_ID;

      const response = await this.organizationService.getEventSponsorships(accountId, projectId);

      Logger.success(req, 'get_organization_event_sponsorships', startTime, {
        account_id: accountId,
        project_id: projectId,
        currency_summaries: response.currencySummaries,
        total_events: response.totalEvents,
      });

      res.json(response);
    } catch (error) {
      Logger.error(req, 'get_organization_event_sponsorships', startTime, error);
      next(error);
    }
  }
}
