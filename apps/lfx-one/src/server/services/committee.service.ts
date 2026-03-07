// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  Committee,
  CommitteeActivity,
  CommitteeBudgetSummary,
  CommitteeContributor,
  CommitteeCreateData,
  CommitteeDeliverable,
  CommitteeDiscussionThread,
  CommitteeDocument,
  CommitteeEngagementMetrics,
  CommitteeEvent,
  CommitteeMember,
  CommitteeOutreachCampaign,
  CommitteeResolution,
  CommitteeSettingsData,
  CommitteeUpdateData,
  CommitteeVote,
  CreateCommitteeMemberRequest,
  CreateGroupInviteRequest,
  GroupInvite,
  GroupJoinApplication,
  GroupJoinApplicationRequest,
  GroupMailingList,
  GroupsIOMailingList,
  GroupsIOService,
  PublicCommittee,
  PublicCommitteeLinks,
  PublicCommitteeMeeting,
  PublicCommitteeMember,
  QueryServiceCountResponse,
  QueryServiceResponse,
} from '@lfx-one/shared/interfaces';
import { RecurrenceType } from '@lfx-one/shared/enums';
import { Request } from 'express';

import { ResourceNotFoundError } from '../errors';
import { logger } from '../services/logger.service';
import { AccessCheckService } from './access-check.service';
import { ETagService } from './etag.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/**
 * Service for handling committee business logic
 */
export class CommitteeService {
  private accessCheckService: AccessCheckService;
  private etagService: ETagService;
  private microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.accessCheckService = new AccessCheckService();
    this.microserviceProxy = new MicroserviceProxyService();
    this.etagService = new ETagService();
  }

  /**
   * Fetches all committees based on query parameters
   */
  public async getCommittees(req: Request, query: Record<string, any> = {}): Promise<Committee[]> {
    const params = {
      ...query,
      type: 'committee',
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Committee>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', params);

    let committees = resources.map((resource) => resource.data);

    // Get member count and settings for each committee in parallel
    committees = await Promise.all(
      committees.map(async (committee) => {
        const [memberCount, settings] = await Promise.all([this.getCommitteeMembersCount(req, committee.uid), this.getCommitteeSettings(req, committee.uid)]);
        return {
          ...committee,
          ...settings,
          total_members: memberCount,
        };
      })
    );

    // Add writer access field to all committees
    return await this.accessCheckService.addAccessToResources(req, committees, 'committee');
  }

  /**
   * Fetches the count of committees based on query parameters
   */
  public async getCommitteesCount(req: Request, query: Record<string, any> = {}): Promise<number> {
    const params = {
      ...query,
      type: 'committee',
    };

    const { count } = await this.microserviceProxy.proxyRequest<QueryServiceCountResponse>(req, 'LFX_V2_SERVICE', '/query/resources/count', 'GET', params);

    return count;
  }

  /**
   * Fetches committees the current user is a member of, enriched with their role.
   * TODO: Replace mock data with real implementation using getCommitteeMembersByCategory
   * once the backend supports user-filtered committee queries.
   */
  public async getMyCommittees(req: Request): Promise<(Committee & { myRole: string; myMemberUid?: string })[]> {
    // TODO: Real implementation would:
    // 1. Get current user identity from req.oidc
    // 2. Query committee_member resources filtered by user email/username
    // 3. For each membership, fetch the committee and attach the role
    // For now, return mock data for development
    const isDev = process.env['ENV'] === 'development' || process.env['NODE_ENV'] === 'development';

    if (isDev) {
      logger.debug(req, 'get_my_committees', 'Serving mock my-committees data (no backend endpoint yet)');

      // Fetch real committees first, then simulate user membership on a subset
      try {
        const allCommittees = await this.getCommittees(req, {});
        const mockRoles = ['Chair', 'Member', 'Observer', 'Vice Chair', 'Lead'];

        // Simulate the user being a member of up to 3 committees
        const myCommittees = allCommittees.slice(0, Math.min(3, allCommittees.length)).map((committee, index) => ({
          ...committee,
          myRole: mockRoles[index] || 'Member',
          myMemberUid: `mock-member-${index}`,
        }));

        return myCommittees;
      } catch {
        logger.warning(req, 'get_my_committees', 'Failed to fetch committees for mock data, returning empty');
        return [];
      }
    }

    // Production: not yet implemented — backend endpoint pending
    logger.warning(req, 'get_my_committees', 'getMyCommittees is not yet implemented for production; returning empty array');
    return [];
  }

  /**
   * Fetches public-safe committee data for a given project UID.
   * Used by unauthenticated consumers (e.g., foundation websites).
   * Strips private fields (emails, internal IDs, settings).
   */
  public async getPublicCommitteesByProject(req: Request, projectUid: string): Promise<PublicCommittee[]> {
    const params = {
      type: 'committee',
      tags: `project_uid:${projectUid}`,
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Committee>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', params);

    const committees = resources.map((resource) => resource.data).filter((c) => c.public);

    logger.debug(req, 'get_public_committees_by_project', 'Fetched committees for project', {
      project_uid: projectUid,
      total: resources.length,
      public_count: committees.length,
    });

    // Enrich each committee with members, mailing list, and meeting data in parallel
    const publicCommittees = await Promise.all(
      committees.map(async (committee) => {
        const [members, mailingList, meeting] = await Promise.all([
          this.getCommitteeMembersSafe(req, committee.uid),
          this.getCommitteeMailingList(req, committee.uid),
          this.getCommitteeMeetingSafe(req, committee.uid),
        ]);

        return this.toPublicCommittee(committee, members, mailingList, meeting);
      })
    );

    return publicCommittees;
  }

  /**
   * Fetches a single committee by ID.
   * Falls back to the query service if the direct endpoint returns 404.
   */
  public async getCommitteeById(req: Request, committeeId: string): Promise<Committee> {
    let committee: Committee | null = null;

    try {
      committee = await this.microserviceProxy.proxyRequest<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'GET');
    } catch {
      logger.debug(req, 'get_committee_by_id', 'Direct endpoint failed, trying query service fallback', { committee_uid: committeeId });
    }

    // Fallback: search all committees via query service and find by UID
    if (!committee) {
      try {
        const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Committee>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
          type: 'committee',
        });
        const match = resources?.find((r) => r.data?.uid === committeeId || r.id === committeeId);
        committee = match?.data || null;
        if (committee) {
          logger.debug(req, 'get_committee_by_id', 'Resolved committee via query service fallback', { committee_uid: committeeId });
        }
      } catch {
        logger.debug(req, 'get_committee_by_id', 'Query service fallback also failed', { committee_uid: committeeId });
      }
    }

    if (!committee) {
      throw new ResourceNotFoundError('Committee', committeeId, {
        operation: 'get_committee_by_id',
        service: 'committee_service',
        path: `/query/resources?type=committee`,
      });
    }

    // Fetch committee settings and mailing list in parallel
    const [settings, mailingList] = await Promise.all([this.getCommitteeSettings(req, committeeId), this.getCommitteeMailingList(req, committeeId)]);

    const committeeWithSettings: Committee = {
      ...committee,
      ...settings,
      // Only attach mailing_list if found (null means no list associated)
      ...(mailingList !== null && { mailing_list: mailingList }),
    };

    // Add writer access field to the committee
    return await this.accessCheckService.addAccessToResource(req, committeeWithSettings, 'committee');
  }

  /**
   * Creates a new committee with optional settings
   */
  public async createCommittee(req: Request, data: CommitteeCreateData): Promise<Committee> {
    // Extract settings fields
    const { business_email_required, is_audit_enabled, show_meeting_attendees, member_visibility, ...committeeData } = data;

    // Step 1: Create committee
    const newCommittee = await this.microserviceProxy.proxyRequest<Committee>(req, 'LFX_V2_SERVICE', '/committees', 'POST', {}, committeeData);

    // Step 2: Update settings if provided
    if (business_email_required !== undefined || is_audit_enabled !== undefined || show_meeting_attendees !== undefined || member_visibility !== undefined) {
      try {
        await this.updateCommitteeSettings(req, newCommittee.uid, { business_email_required, is_audit_enabled, show_meeting_attendees, member_visibility });
      } catch {
        logger.warning(req, 'create_committee_settings', 'Failed to update committee settings, but committee was created successfully', {
          committee_uid: newCommittee.uid,
        });
      }
    }

    return {
      ...newCommittee,
      ...(business_email_required !== undefined && { business_email_required }),
      ...(is_audit_enabled !== undefined && { is_audit_enabled }),
      ...(show_meeting_attendees !== undefined && { show_meeting_attendees }),
      ...(member_visibility !== undefined && { member_visibility }),
    };
  }

  /**
   * Updates an existing committee using ETag for concurrency control
   */
  public async updateCommittee(req: Request, committeeId: string, data: CommitteeUpdateData): Promise<Committee> {
    // Extract settings fields
    const { business_email_required, is_audit_enabled, show_meeting_attendees, member_visibility, ...committeeData } = data;

    // Step 1: Fetch committee with ETag
    const { etag } = await this.etagService.fetchWithETag<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'update_committee');

    // Step 2: Update committee with ETag
    const updatedCommittee = await this.etagService.updateWithETag<Committee>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}`,
      etag,
      committeeData,
      'update_committee'
    );

    // Step 3: Update settings if provided
    if (business_email_required !== undefined || is_audit_enabled !== undefined || show_meeting_attendees !== undefined || member_visibility !== undefined) {
      try {
        await this.updateCommitteeSettings(req, committeeId, {
          business_email_required,
          is_audit_enabled,
          show_meeting_attendees,
          member_visibility,
        });
      } catch {
        logger.warning(req, 'update_committee_settings', 'Failed to update committee settings, but committee was updated successfully', {
          committee_uid: committeeId,
        });
      }
    }

    return {
      ...updatedCommittee,
      ...(business_email_required !== undefined && { business_email_required }),
      ...(is_audit_enabled !== undefined && { is_audit_enabled }),
      ...(show_meeting_attendees !== undefined && { show_meeting_attendees }),
      ...(member_visibility !== undefined && { member_visibility }),
    };
  }

  /**
   * Deletes a committee using ETag for concurrency control
   */
  public async deleteCommittee(req: Request, committeeId: string): Promise<void> {
    // Step 1: Fetch committee with ETag
    const { etag } = await this.etagService.fetchWithETag<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'delete_committee');

    // Step 2: Delete committee with ETag
    await this.etagService.deleteWithETag(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, etag, 'delete_committee');
  }

  /**
   * Fetches all members for a specific committee
   */
  public async getCommitteeMembers(req: Request, committeeId: string, query: Record<string, any> = {}): Promise<CommitteeMember[]> {
    const params = {
      ...query,
      type: 'committee_member',
      tags: `committee_uid:${committeeId}`,
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeMember>>(
      req,
      'LFX_V2_SERVICE',
      `/query/resources`,
      'GET',
      params
    );

    return resources.map((resource) => resource.data);
  }

  /**
   * Fetches count of all members for a specific committee
   */
  public async getCommitteeMembersCount(req: Request, committeeId: string, query: Record<string, any> = {}): Promise<number> {
    logger.debug(req, 'get_committee_members_count', 'Fetching committee members count', {
      committee_uid: committeeId,
      query,
    });

    const params = {
      ...query,
      type: 'committee_member',
      tags: `committee_uid:${committeeId}`,
    };

    const { count } = await this.microserviceProxy.proxyRequest<QueryServiceCountResponse>(req, 'LFX_V2_SERVICE', `/query/resources/count`, 'GET', params);

    return count;
  }

  /**
   * Fetches a single committee member by ID
   */
  public async getCommitteeMemberById(req: Request, committeeId: string, memberId: string): Promise<CommitteeMember> {
    const member = await this.microserviceProxy.proxyRequest<CommitteeMember>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/members/${memberId}`, 'GET');

    if (!member) {
      throw new ResourceNotFoundError('Committee member', memberId, {
        operation: 'get_committee_member_by_id',
        service: 'committee_service',
        path: `/committees/${committeeId}/members/${memberId}`,
      });
    }

    return member;
  }

  /**
   * Creates a new committee member
   */
  public async createCommitteeMember(req: Request, committeeId: string, data: CreateCommitteeMemberRequest): Promise<CommitteeMember> {
    const newMember = await this.microserviceProxy.proxyRequest<CommitteeMember>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/members`, 'POST', {}, data);

    logger.debug(req, 'create_committee_member', 'Committee member created successfully', {
      committee_uid: committeeId,
      member_uid: newMember.uid,
    });

    return newMember;
  }

  /**
   * Updates an existing committee member using ETag for concurrency control
   */
  public async updateCommitteeMember(
    req: Request,
    committeeId: string,
    memberId: string,
    data: Partial<CreateCommitteeMemberRequest>
  ): Promise<CommitteeMember> {
    // Validate committee exists first
    await this.getCommitteeById(req, committeeId);

    // Step 1: Fetch member with ETag
    const { etag } = await this.etagService.fetchWithETag<CommitteeMember>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/members/${memberId}`,
      'update_committee_member'
    );

    // Step 2: Update member with ETag
    const updatedMember = await this.etagService.updateWithETag<CommitteeMember>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/members/${memberId}`,
      etag,
      data,
      'update_committee_member'
    );

    logger.debug(req, 'update_committee_member', 'Committee member updated successfully', {
      committee_uid: committeeId,
      member_uid: memberId,
    });

    return updatedMember;
  }

  /**
   * Deletes a committee member using ETag for concurrency control
   */
  public async deleteCommitteeMember(req: Request, committeeId: string, memberId: string): Promise<void> {
    // Validate committee exists first
    await this.getCommitteeById(req, committeeId);

    // Step 1: Fetch member with ETag
    const { etag } = await this.etagService.fetchWithETag<CommitteeMember>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/members/${memberId}`,
      'delete_committee_member'
    );

    // Step 2: Delete member with ETag
    await this.etagService.deleteWithETag(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/members/${memberId}`, etag, 'delete_committee_member');

    logger.debug(req, 'delete_committee_member', 'Committee member deleted successfully', {
      committee_uid: committeeId,
      member_uid: memberId,
    });
  }

  /**
   * Fetches committee memberships for a specific user filtered by committee category
   * Used to determine user persona based on committee membership
   * @param req - Express request object
   * @param username - Username to filter by
   * @param userEmail - User email to filter by (as fallback)
   * @param category - Committee category to filter (currently supports: 'Board', 'Maintainers')
   */
  public async getCommitteeMembersByCategory(req: Request, username: string, userEmail: string, category: string): Promise<CommitteeMember[]> {
    const params = {
      v: '1',
      type: 'committee_member',
      tags_all: [`username:${username}`, `committee_category:${category}`],
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeMember>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      params
    );

    const userMemberships = resources.map((resource) => resource.data);

    logger.debug(req, 'get_committee_members_by_category', 'Committee memberships retrieved', {
      username,
      category,
      memberships_count: userMemberships.length,
    });

    return userMemberships;
  }

  // ── Dashboard Sub-Resource Methods ──────────────────────────────────────

  /** Fetches open votes for a committee */
  public async getCommitteeVotes(req: Request, committeeId: string): Promise<CommitteeVote[]> {
    logger.debug(req, 'get_committee_votes', 'Fetching votes', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeVote>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'vote',
        tags: `committee_uid:${committeeId}`,
        status: 'open',
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_votes', 'Failed to fetch votes, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches resolutions for a committee */
  public async getCommitteeResolutions(req: Request, committeeId: string): Promise<CommitteeResolution[]> {
    logger.debug(req, 'get_committee_resolutions', 'Fetching resolutions', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeResolution>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'resolution', tags: `committee_uid:${committeeId}` }
      );
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_resolutions', 'Failed to fetch resolutions, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches recent activity for a committee */
  public async getCommitteeActivity(req: Request, committeeId: string): Promise<CommitteeActivity[]> {
    logger.debug(req, 'get_committee_activity', 'Fetching activity', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeActivity>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'committee_activity', tags: `committee_uid:${committeeId}` }
      );
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_activity', 'Failed to fetch activity, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches top contributors for a committee */
  public async getCommitteeContributors(req: Request, committeeId: string): Promise<CommitteeContributor[]> {
    logger.debug(req, 'get_committee_contributors', 'Fetching contributors', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeContributor>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'committee_contributor', tags: `committee_uid:${committeeId}` }
      );
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_contributors', 'Failed to fetch contributors, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches deliverables for a committee */
  public async getCommitteeDeliverables(req: Request, committeeId: string): Promise<CommitteeDeliverable[]> {
    logger.debug(req, 'get_committee_deliverables', 'Fetching deliverables', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeDeliverable>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'deliverable', tags: `committee_uid:${committeeId}` }
      );
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_deliverables', 'Failed to fetch deliverables, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches discussion threads for a committee */
  public async getCommitteeDiscussions(req: Request, committeeId: string): Promise<CommitteeDiscussionThread[]> {
    logger.debug(req, 'get_committee_discussions', 'Fetching discussions', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeDiscussionThread>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'discussion_thread', tags: `committee_uid:${committeeId}` }
      );
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_discussions', 'Failed to fetch discussions, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches upcoming events for a committee */
  public async getCommitteeEvents(req: Request, committeeId: string): Promise<CommitteeEvent[]> {
    logger.debug(req, 'get_committee_events', 'Fetching events', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeEvent>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_event',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_events', 'Failed to fetch events, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches outreach campaigns for a committee */
  public async getCommitteeCampaigns(req: Request, committeeId: string): Promise<CommitteeOutreachCampaign[]> {
    logger.debug(req, 'get_committee_campaigns', 'Fetching campaigns', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeOutreachCampaign>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'outreach_campaign', tags: `committee_uid:${committeeId}` }
      );
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_campaigns', 'Failed to fetch campaigns, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  /** Fetches engagement metrics for a committee */
  public async getCommitteeEngagement(req: Request, committeeId: string): Promise<CommitteeEngagementMetrics | null> {
    logger.debug(req, 'get_committee_engagement', 'Fetching engagement metrics', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeEngagementMetrics>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'engagement_metrics', tags: `committee_uid:${committeeId}` }
      );
      return resources.length > 0 ? resources[0].data : null;
    } catch {
      logger.warning(req, 'get_committee_engagement', 'Failed to fetch engagement, returning null', { committee_uid: committeeId });
      return null;
    }
  }

  /** Fetches budget summary for a committee */
  public async getCommitteeBudget(req: Request, committeeId: string): Promise<CommitteeBudgetSummary | null> {
    logger.debug(req, 'get_committee_budget', 'Fetching budget', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeBudgetSummary>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'budget_summary', tags: `committee_uid:${committeeId}` }
      );
      return resources.length > 0 ? resources[0].data : null;
    } catch {
      logger.warning(req, 'get_committee_budget', 'Failed to fetch budget, returning null', { committee_uid: committeeId });
      return null;
    }
  }

  /** Fetches documents for a committee */
  public async getCommitteeDocuments(req: Request, committeeId: string): Promise<CommitteeDocument[]> {
    logger.debug(req, 'get_committee_documents', 'Fetching documents', { committee_uid: committeeId });
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeDocument>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'committee_document', tags: `committee_uid:${committeeId}` }
      );
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_documents', 'Failed to fetch documents, returning empty', { committee_uid: committeeId });
      return [];
    }
  }

  // ── Invite & Join Methods ──────────────────────────────────────────────────
  // These proxy to ITX endpoints. The ITX invite/join APIs are currently being
  // built — these stubs call the expected paths so the frontend flow compiles
  // end-to-end and can be tested once ITX ships.

  /** Send invite(s) for a committee */
  public async createInvites(req: Request, committeeId: string, payload: CreateGroupInviteRequest): Promise<GroupInvite[]> {
    return this.microserviceProxy.proxyRequest<GroupInvite[]>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/invites`, 'POST', {}, payload);
  }

  /** List pending invites */
  public async getInvites(req: Request, committeeId: string): Promise<GroupInvite[]> {
    return this.microserviceProxy.proxyRequest<GroupInvite[]>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/invites`, 'GET');
  }

  /** Accept an invite */
  public async acceptInvite(req: Request, committeeId: string, inviteId: string): Promise<GroupInvite> {
    return this.microserviceProxy.proxyRequest<GroupInvite>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/invites/${inviteId}/accept`, 'POST');
  }

  /** Decline an invite */
  public async declineInvite(req: Request, committeeId: string, inviteId: string): Promise<GroupInvite> {
    return this.microserviceProxy.proxyRequest<GroupInvite>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/invites/${inviteId}/decline`, 'POST');
  }

  /** Revoke (cancel) a pending invite */
  public async revokeInvite(req: Request, committeeId: string, inviteId: string): Promise<void> {
    await this.microserviceProxy.proxyRequest<void>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/invites/${inviteId}`, 'DELETE');
  }

  /** Self-join an open committee */
  public async joinCommittee(req: Request, committeeId: string): Promise<CommitteeMember> {
    return this.microserviceProxy.proxyRequest<CommitteeMember>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/join`, 'POST');
  }

  /** Leave a committee */
  public async leaveCommittee(req: Request, committeeId: string): Promise<void> {
    await this.microserviceProxy.proxyRequest<void>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/leave`, 'POST');
  }

  /** Apply to join (join_mode = 'apply') */
  public async applyToJoin(req: Request, committeeId: string, payload: GroupJoinApplicationRequest): Promise<GroupJoinApplication> {
    return this.microserviceProxy.proxyRequest<GroupJoinApplication>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/applications`, 'POST', {}, payload);
  }

  /** List pending applications */
  public async getApplications(req: Request, committeeId: string): Promise<GroupJoinApplication[]> {
    return this.microserviceProxy.proxyRequest<GroupJoinApplication[]>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/applications`, 'GET');
  }

  /** Approve a join application */
  public async approveApplication(req: Request, committeeId: string, applicationId: string): Promise<GroupJoinApplication> {
    return this.microserviceProxy.proxyRequest<GroupJoinApplication>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/applications/${applicationId}/approve`,
      'POST'
    );
  }

  /** Reject a join application */
  public async rejectApplication(req: Request, committeeId: string, applicationId: string): Promise<GroupJoinApplication> {
    return this.microserviceProxy.proxyRequest<GroupJoinApplication>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/applications/${applicationId}/reject`,
      'POST'
    );
  }

  /**
   * Fetches the mailing list associated with a committee via reverse-lookup.
   * The LFX V2 API stores the relationship on the mailing list side (mailing list has
   * a `committees` array). We reverse-lookup by querying mailing lists tagged with
   * `committee_uid:${committeeId}` and return the first match as a lightweight
   * `GroupMailingList` summary (name, url, subscriber_count).
   *
   * @returns Lightweight mailing list summary, or null if no list is associated / on error
   */
  private async getCommitteeMailingList(req: Request, committeeId: string): Promise<GroupMailingList | null> {
    try {
      const params = {
        type: 'groupsio_mailing_list',
        tags: `committee_uid:${committeeId}`,
      };

      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOMailingList>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        params
      );

      if (!resources || resources.length === 0) {
        logger.debug(req, 'get_committee_mailing_list', 'No mailing list found for committee', {
          committee_uid: committeeId,
        });
        return null;
      }

      const ml = resources[0].data;

      // Attempt to construct the archive URL from the parent service's domain.
      // The Groups.io URL pattern is: https://<domain>/g/<group_name>
      let url: string | undefined;
      if (ml.service_uid) {
        try {
          const serviceParams = {
            type: 'groupsio_service',
            tags: `service_uid:${ml.service_uid}`,
          };

          const { resources: serviceResources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOService>>(
            req,
            'LFX_V2_SERVICE',
            '/query/resources',
            'GET',
            serviceParams
          );

          if (serviceResources && serviceResources.length > 0) {
            const service = serviceResources[0].data;
            url = `https://${service.domain}/g/${ml.group_name}`;
          }
        } catch {
          // URL enrichment is best-effort — continue without it
          logger.debug(req, 'get_committee_mailing_list', 'Service fetch failed; mailing list URL will be omitted', {
            committee_uid: committeeId,
            service_uid: ml.service_uid,
          });
        }
      }

      logger.debug(req, 'get_committee_mailing_list', 'Mailing list found for committee', {
        committee_uid: committeeId,
        mailing_list_uid: ml.uid,
        group_name: ml.group_name,
      });

      return {
        uid: ml.uid,
        name: ml.group_name,
        url,
        subscriber_count: ml.subscriber_count,
        audience_access: ml.audience_access,
      };
    } catch {
      logger.debug(req, 'get_committee_mailing_list', 'Failed to fetch mailing list for committee; returning null', {
        committee_uid: committeeId,
      });
      return null;
    }
  }

  /**
   * Fetches committee settings by ID
   * @returns Committee settings or empty object if not found/error
   */
  private async getCommitteeSettings(req: Request, committeeId: string): Promise<CommitteeSettingsData> {
    try {
      const settings = await this.microserviceProxy.proxyRequest<CommitteeSettingsData>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/settings`, 'GET');

      return settings || {};
    } catch {
      logger.debug(req, 'get_committee_settings', 'Failed to fetch committee settings, returning empty', {
        committee_uid: committeeId,
      });
      return {};
    }
  }

  /**
   * Updates committee settings using ETag for concurrency control
   */
  private async updateCommitteeSettings(req: Request, committeeId: string, settings: CommitteeSettingsData): Promise<void> {
    const settingsData = {
      ...(settings.business_email_required !== undefined && {
        business_email_required: settings.business_email_required,
      }),
      ...(settings.is_audit_enabled !== undefined && {
        is_audit_enabled: settings.is_audit_enabled,
      }),
      ...(settings.show_meeting_attendees !== undefined && {
        show_meeting_attendees: settings.show_meeting_attendees,
      }),
      ...(settings.member_visibility !== undefined && {
        member_visibility: settings.member_visibility,
      }),
    };

    // Fetch settings with ETag
    const { etag } = await this.etagService.fetchWithETag<CommitteeSettingsData>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/settings`,
      'update_committee_settings'
    );

    // Update settings with ETag
    await this.etagService.updateWithETag(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/settings`, etag, settingsData, 'update_committee_settings');

    logger.debug(req, 'update_committee_settings', 'Committee settings updated successfully', {
      committee_uid: committeeId,
      settings_data: settingsData,
    });
  }

  // ── Public Endpoint Helpers ───────────────────────────────────────────────

  /**
   * Fetches committee members with error handling — returns empty array on failure.
   */
  private async getCommitteeMembersSafe(req: Request, committeeId: string): Promise<CommitteeMember[]> {
    try {
      return await this.getCommitteeMembers(req, committeeId);
    } catch {
      logger.debug(req, 'get_committee_members_safe', 'Failed to fetch members, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  /**
   * Fetches the next upcoming public meeting for a committee.
   * Returns null if no meeting is found or on error.
   */
  private async getCommitteeMeetingSafe(req: Request, committeeId: string): Promise<PublicCommitteeMeeting | null> {
    try {
      const params = {
        type: 'v1_meeting',
        tags: `committee_uid:${committeeId}`,
      };

      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', params);

      if (!resources || resources.length === 0) {
        return null;
      }

      // Find the first meeting with recurrence or the next upcoming meeting
      const meeting = resources[0].data;

      const result: PublicCommitteeMeeting = {
        time: meeting.start_time,
        timezone: meeting.timezone,
        duration: meeting.duration,
      };

      if (meeting.recurrence) {
        result.recurrence = this.formatRecurrence(meeting.recurrence);
      }

      // Only include join link for public, non-restricted meetings
      if (meeting.visibility === 'public' && !meeting.restricted && meeting.public_link) {
        result.video_link = meeting.public_link;
      }

      return result;
    } catch {
      logger.debug(req, 'get_committee_meeting_safe', 'Failed to fetch meeting, returning null', {
        committee_uid: committeeId,
      });
      return null;
    }
  }

  /**
   * Converts a MeetingRecurrence to a human-readable string.
   */
  private formatRecurrence(recurrence: { type: RecurrenceType; repeat_interval: number; weekly_days?: string }): string {
    const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const interval = recurrence.repeat_interval;

    switch (recurrence.type) {
      case RecurrenceType.DAILY:
        return interval === 1 ? 'Daily' : `Every ${interval} days`;
      case RecurrenceType.WEEKLY: {
        const base = interval === 1 ? 'Every week' : `Every ${interval} weeks`;
        if (recurrence.weekly_days) {
          const days = recurrence.weekly_days
            .split(',')
            .map((d) => dayNames[parseInt(d, 10)] || d)
            .join(', ');
          return `${base} on ${days}`;
        }
        return base;
      }
      case RecurrenceType.MONTHLY:
        return interval === 1 ? 'Monthly' : `Every ${interval} months`;
      default:
        return 'Recurring';
    }
  }

  /**
   * Maps internal Committee + members data to public-safe PublicCommittee DTO.
   * Strips emails, internal IDs, settings, and other private fields.
   */
  private toPublicCommittee(
    committee: Committee,
    members: CommitteeMember[],
    mailingList: GroupMailingList | null,
    meeting: PublicCommitteeMeeting | null
  ): PublicCommittee {
    const chairRoles = new Set(['Chair', 'Co-Chair', 'Vice Chair']);

    const toPublicMember = (m: CommitteeMember): PublicCommitteeMember => ({
      name: [m.first_name, m.last_name].filter(Boolean).join(' '),
      organization: m.organization?.name,
      role: m.role?.name,
    });

    // Also include leadership from the committee entity itself (chair/co_chair fields)
    const chairs: PublicCommitteeMember[] = [];
    if (committee.chair) {
      chairs.push({
        name: [committee.chair.first_name, committee.chair.last_name].filter(Boolean).join(' '),
        organization: committee.chair.organization,
        role: 'Chair',
      });
    }
    if (committee.co_chair) {
      chairs.push({
        name: [committee.co_chair.first_name, committee.co_chair.last_name].filter(Boolean).join(' '),
        organization: committee.co_chair.organization,
        role: 'Co-Chair',
      });
    }

    // Add chairs from member list that aren't already included via leadership fields
    const chairNames = new Set(chairs.map((c) => c.name));
    const memberChairs = members.filter((m) => m.role?.name && chairRoles.has(m.role.name)).map(toPublicMember);
    for (const mc of memberChairs) {
      if (!chairNames.has(mc.name)) {
        chairs.push(mc);
        chairNames.add(mc.name);
      }
    }

    const nonChairMembers = members.filter((m) => !m.role?.name || !chairRoles.has(m.role.name)).map(toPublicMember);

    const externalLinks: PublicCommitteeLinks = {
      ...(committee.website && { website: committee.website }),
      ...(mailingList?.url && { mailing_list_url: mailingList.url }),
      ...(committee.chat_channel?.url && { chat_channel_url: committee.chat_channel.url }),
    };

    return {
      uid: committee.uid,
      name: committee.display_name || committee.name,
      ...(committee.description && { description: committee.description }),
      category: committee.category,
      chairs,
      members: nonChairMembers,
      total_members: committee.total_members || members.length,
      ...(meeting && { meeting_schedule: meeting }),
      external_links: externalLinks,
    };
  }
}
