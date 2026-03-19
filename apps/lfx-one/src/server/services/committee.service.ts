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
  CommitteeEngagementMetrics,
  CommitteeEvent,
  CommitteeMember,
  CommitteeOutreachCampaign,
  CommitteeResolution,
  CommitteeSettingsData,
  CommitteeUpdateData,
  CommitteeVote,
  CreateCommitteeMemberRequest,
  Meeting,
  PaginatedResponse,
  MyCommittee,
  QueryServiceCountResponse,
  QueryServiceResponse,
} from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { getUsernameFromAuth } from '../utils/auth-helper';

import { ResourceNotFoundError } from '../errors';
import { logger } from './logger.service';
import { AccessCheckService } from './access-check.service';
import { ETagService } from './etag.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

// MeetingService is dynamically imported to avoid circular dependency.
// Use import('...') type to reference the class without a static import.
type MeetingServiceType = InstanceType<typeof import('./meeting.service').MeetingService>;

/**
 * Service for handling committee business logic
 */
export class CommitteeService {
  private accessCheckService: AccessCheckService;
  private etagService: ETagService;
  private microserviceProxy: MicroserviceProxyService;
  // Promise-based lazy initializer to avoid concurrent imports creating duplicate instances
  private meetingServicePromise?: Promise<MeetingServiceType>;

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

    // Get member count for each committee in parallel
    committees = await Promise.all(
      committees.map(async (committee) => {
        const memberCount = await this.getCommitteeMembersCount(req, committee.uid);
        return {
          ...committee,
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
   * Fetches a single committee by ID
   */
  public async getCommitteeById(req: Request, committeeId: string): Promise<Committee> {
    const committee = await this.microserviceProxy.proxyRequest<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'GET');

    if (!committee) {
      throw new ResourceNotFoundError('Committee', committeeId, {
        operation: 'get_committee_by_id',
        service: 'committee_service',
        path: `/committees/${committeeId}`,
      });
    }

    // Fetch committee settings for enrichment
    const settings = await this.getCommitteeSettings(req, committeeId);

    const committeeWithEnrichment = {
      ...committee,
      ...settings,
    };

    // Add writer access field to the committee
    return await this.accessCheckService.addAccessToResource(req, committeeWithEnrichment, 'committee');
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
    // Extract settings and channel fields from core committee data
    const { business_email_required, is_audit_enabled, show_meeting_attendees, member_visibility, mailing_list, chat_channel, ...committeeData } = data;

    const hasSettingsUpdate =
      business_email_required !== undefined || is_audit_enabled !== undefined || show_meeting_attendees !== undefined || member_visibility !== undefined;
    const hasChannelsUpdate = mailing_list !== undefined || chat_channel !== undefined;
    const hasCoreUpdate = Object.keys(committeeData).length > 0;

    let updatedCommittee: Committee;

    if (hasCoreUpdate) {
      // Step 1: Fetch committee with ETag
      const { etag } = await this.etagService.fetchWithETag<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'update_committee');

      // Step 2: Update core committee fields with ETag (PUT)
      updatedCommittee = await this.etagService.updateWithETag<Committee>(
        req,
        'LFX_V2_SERVICE',
        `/committees/${committeeId}`,
        etag,
        committeeData,
        'update_committee'
      );
    } else {
      // No core fields to update — fetch current committee for the response
      updatedCommittee = await this.microserviceProxy.proxyRequest<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'GET');
    }

    // Step 3: Update channels via PATCH (mailing_list/chat_channel are not accepted by PUT)
    if (hasChannelsUpdate) {
      try {
        const channelsPayload: Record<string, any> = {};
        if (mailing_list !== undefined) channelsPayload['mailing_list'] = mailing_list;
        if (chat_channel !== undefined) channelsPayload['chat_channel'] = chat_channel;

        logger.debug(req, 'update_committee_channels', 'Updating committee channels via PATCH', {
          committee_uid: committeeId,
          fields: Object.keys(channelsPayload),
        });

        const patched = await this.microserviceProxy.proxyRequest<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'PATCH', {}, channelsPayload);

        updatedCommittee = { ...updatedCommittee, ...patched };
      } catch (error) {
        logger.warning(req, 'update_committee_channels', 'PATCH failed for channels, returning current committee data', {
          committee_uid: committeeId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Step 5: Update settings if provided
    if (hasSettingsUpdate) {
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

    // Step 1: Fetch current member with ETag
    const { data: currentMember, etag } = await this.etagService.fetchWithETag<CommitteeMember>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/members/${memberId}`,
      'update_committee_member'
    );

    // Step 2: Merge partial update with current data (PUT requires full resource)
    const mergedData = { ...currentMember, ...data };

    // Step 3: Update member with ETag
    const updatedMember = await this.etagService.updateWithETag<CommitteeMember>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/members/${memberId}`,
      etag,
      mergedData,
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

  // ── Persona Helper ──────────────────────────────────────────────────────

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

  // ── Dashboard Sub-Resource Methods ──────────────────────────────────────────

  public async getCommitteeVotes(req: Request, committeeId: string): Promise<CommitteeVote[]> {
    try {
      const { resources: committeeVoteResources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeVote>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        {
          type: 'committee_vote',
          tags: `committee_uid:${committeeId}`,
        }
      );

      if (committeeVoteResources.length > 0) {
        return committeeVoteResources.map((r) => r.data);
      }

      const committee = await this.microserviceProxy.proxyRequest<Committee>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'GET');
      const projectUid: string | undefined = committee?.project_uid;

      if (!projectUid) {
        return [];
      }

      const { resources: voteResources } = await this.microserviceProxy.proxyRequest<
        QueryServiceResponse<{
          uid: string;
          name: string;
          status: string;
          end_time: string;
          committee_uid: string;
          num_response_received?: number;
          total_voting_request_invitations?: number;
        }>
      >(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'vote',
        parent: `project:${projectUid}`,
        // TODO(LFXV2-1218): Implement cursor-based pagination for complete vote results
        page_size: 500,
      });

      if (voteResources.length >= 500) {
        logger.warning(req, 'get_committee_votes', 'Vote results may be truncated — page_size limit reached', {
          committee_uid: committeeId,
          project_uid: projectUid,
          fetched_count: voteResources.length,
        });
      }

      return voteResources
        .filter((r) => r.data.committee_uid === committeeId)
        .map((r) => {
          const totalResponses = r.data.num_response_received ?? 0;
          return {
            uid: r.data.uid,
            title: r.data.name,
            status: CommitteeService.getVoteStatus(r.data.status),
            deadline: r.data.end_time,
            // Per-option breakdown is not available from the vote resource.
            // Assign all responses to votes_for so UI progress bars reflect the
            // real response count instead of showing misleading zeros.
            votes_for: totalResponses,
            votes_against: 0,
            votes_abstain: 0,
            total_responses: totalResponses,
            total_eligible: r.data.total_voting_request_invitations ?? 0,
            created_by: '',
          };
        });
    } catch (error) {
      logger.warning(req, 'get_committee_votes', 'Failed to fetch committee votes, returning empty', {
        committee_uid: committeeId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  public async getCommitteeResolutions(req: Request, committeeId: string): Promise<CommitteeResolution[]> {
    return this.getSubResource<CommitteeResolution>(req, committeeId, 'committee_resolution', 'get_committee_resolutions');
  }

  public async getCommitteeActivity(req: Request, committeeId: string): Promise<CommitteeActivity[]> {
    return this.getSubResource<CommitteeActivity>(req, committeeId, 'committee_activity', 'get_committee_activity');
  }

  public async getCommitteeContributors(req: Request, committeeId: string): Promise<CommitteeContributor[]> {
    return this.getSubResource<CommitteeContributor>(req, committeeId, 'committee_contributor', 'get_committee_contributors');
  }

  public async getCommitteeDeliverables(req: Request, committeeId: string): Promise<CommitteeDeliverable[]> {
    return this.getSubResource<CommitteeDeliverable>(req, committeeId, 'committee_deliverable', 'get_committee_deliverables');
  }

  public async getCommitteeDiscussions(req: Request, committeeId: string): Promise<CommitteeDiscussionThread[]> {
    return this.getSubResource<CommitteeDiscussionThread>(req, committeeId, 'committee_discussion', 'get_committee_discussions');
  }

  public async getCommitteeEvents(req: Request, committeeId: string): Promise<CommitteeEvent[]> {
    return this.getSubResource<CommitteeEvent>(req, committeeId, 'committee_event', 'get_committee_events');
  }

  public async getCommitteeCampaigns(req: Request, committeeId: string): Promise<CommitteeOutreachCampaign[]> {
    return this.getSubResource<CommitteeOutreachCampaign>(req, committeeId, 'committee_campaign', 'get_committee_campaigns');
  }

  public async getCommitteeEngagement(req: Request, committeeId: string): Promise<CommitteeEngagementMetrics | null> {
    try {
      return await this.microserviceProxy.proxyRequest<CommitteeEngagementMetrics>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/engagement`, 'GET');
    } catch {
      logger.warning(req, 'get_committee_engagement', 'Failed to fetch committee engagement, returning null', {
        committee_uid: committeeId,
      });
      return null;
    }
  }

  public async getCommitteeBudget(req: Request, committeeId: string): Promise<CommitteeBudgetSummary | null> {
    try {
      return await this.microserviceProxy.proxyRequest<CommitteeBudgetSummary>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/budget`, 'GET');
    } catch {
      logger.warning(req, 'get_committee_budget', 'Failed to fetch committee budget, returning null', {
        committee_uid: committeeId,
      });
      return null;
    }
  }

  /**
   * Fetches meetings associated with a committee.
   */
  public async getCommitteeMeetings(req: Request, committeeId: string, query: Record<string, any> = {}): Promise<PaginatedResponse<Meeting>> {
    try {
      // Whitelist allowed query params to prevent unexpected parameters from reaching downstream
      const allowedParams = ['page_size', 'page_token', 'order_by', 'committee_uid'];
      const sanitizedQuery: Record<string, string> = {};
      for (const key of allowedParams) {
        if (query[key]) sanitizedQuery[key] = String(query[key]);
      }

      const params = {
        ...sanitizedQuery,
        committee_uid: committeeId,
      };

      logger.debug(req, 'get_committee_meetings', 'Fetching meetings for committee', {
        committee_uid: committeeId,
      });

      // Lazy import to avoid circular dependency — Promise ensures only one instance is created
      if (!this.meetingServicePromise) {
        this.meetingServicePromise = import('./meeting.service').then((m) => new m.MeetingService());
      }
      const meetingService = await this.meetingServicePromise;
      const result = await meetingService.getMeetings(req, params);

      logger.debug(req, 'get_committee_meetings', 'Fetched committee meetings', {
        committee_uid: committeeId,
        count: result.data.length,
      });

      return result;
    } catch {
      logger.warning(req, 'get_committee_meetings', 'Failed to fetch committee meetings, returning empty', {
        committee_uid: committeeId,
      });
      return { data: [], page_token: undefined };
    }
  }

  // ── My Committees ─────────────────────────────────────────────────────────

  public async getMyCommittees(req: Request, projectUid?: string): Promise<MyCommittee[]> {
    const username = await getUsernameFromAuth(req);
    if (!username) {
      return [];
    }

    // Fetch all committee_member records for the current user
    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<CommitteeMember>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
      v: '1',
      type: 'committee_member',
      tags_all: [`username:${username}`],
    });

    const memberships = resources.map((r) => r.data);

    if (memberships.length === 0) {
      return [];
    }

    logger.debug(req, 'get_my_committees', 'Found user memberships', {
      username,
      membership_count: memberships.length,
    });

    // Build a map of committee_uid → role for quick lookup
    const membershipMap = new Map<string, { role: string; member_uid: string }>();
    for (const m of memberships) {
      membershipMap.set(m.committee_uid, {
        role: m.role?.name || 'Member',
        member_uid: m.uid,
      });
    }

    // Fetch committee details for each membership in parallel
    const committeeUids = Array.from(membershipMap.keys());
    const committees = await Promise.all(
      committeeUids.map(async (uid) => {
        try {
          const committee = await this.microserviceProxy.proxyRequest<Committee>(req, 'LFX_V2_SERVICE', `/committees/${uid}`, 'GET');
          const memberCount = await this.getCommitteeMembersCount(req, uid);
          const membership = membershipMap.get(uid)!;
          return {
            ...committee,
            total_members: memberCount,
            my_role: membership.role,
            my_member_uid: membership.member_uid,
          } as MyCommittee;
        } catch (error) {
          logger.warning(req, 'get_my_committees', 'Failed to enrich committee membership, skipping committee', {
            committee_uid: uid,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return null;
        }
      })
    );

    const result = committees.filter((c): c is MyCommittee => c !== null);

    // Filter by project_uid server-side if provided
    if (projectUid) {
      return result.filter((c) => c.project_uid === projectUid);
    }

    return result;
  }

  // ── Join / Leave Methods ────────────────────────────────────────────────────

  public async joinCommittee(req: Request, committeeId: string): Promise<CommitteeMember> {
    return this.microserviceProxy.proxyRequest<CommitteeMember>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/join`, 'POST');
  }

  public async leaveCommittee(req: Request, committeeId: string): Promise<void> {
    await this.microserviceProxy.proxyRequest(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/leave`, 'DELETE');
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

  /**
   * Generic helper for fetching committee sub-resources from the query service.
   * All tag-based sub-resource queries follow the same pattern: query by type + committee_uid tag,
   * map results to data, and return empty array on failure.
   */
  private async getSubResource<T>(req: Request, committeeId: string, resourceType: string, operation: string): Promise<T[]> {
    try {
      logger.debug(req, operation, `Fetching ${operation.replace(/_/g, ' ')}`, { committee_id: committeeId });

      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<T>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: resourceType,
        tags: `committee_uid:${committeeId}`,
      });

      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, operation, `Failed to fetch ${operation.replace(/_/g, ' ')}, returning empty`, {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  /**
   * Maps upstream vote status strings to the normalized status used by the UI.
   */
  private static getVoteStatus(status: string): 'open' | 'closed' | 'cancelled' {
    if (status === 'ended') return 'closed';
    if (status === 'cancelled') return 'cancelled';
    return 'open';
  }
}
