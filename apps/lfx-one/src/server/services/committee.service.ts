// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  Committee,
  CommitteeCreateData,
  CommitteeMember,
  CommitteeSettingsData,
  CommitteeUpdateData,
  CreateCommitteeMemberRequest,
  CreateGroupInviteRequest,
  GroupInvite,
  GroupJoinApplication,
  GroupJoinApplicationRequest,
  QueryServiceCountResponse,
  QueryServiceResponse,
} from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { ResourceNotFoundError } from '../errors';
import { logger } from '../services/logger.service';
import { AccessCheckService } from './access-check.service';
import { ETagService } from './etag.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

function getVoteStatus(status: string): 'open' | 'closed' | 'cancelled' {
  if (status === 'ended') return 'closed';
  if (status === 'cancelled') return 'cancelled';
  return 'open';
}

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

    // Fetch committee settings and merge
    const settings = await this.getCommitteeSettings(req, committeeId);
    const committeeWithSettings = {
      ...committee,
      ...settings,
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

  // ── Dashboard Sub-Resource Methods ──────────────────────────────────────────

  public async getCommitteeVotes(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources: committeeVoteResources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(
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

      const committee = await this.microserviceProxy.proxyRequest<any>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}`, 'GET');
      const projectUid: string | undefined = committee?.project_uid;

      if (!projectUid) {
        return [];
      }

      const { resources: voteResources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        {
          type: 'vote',
          parent: `project:${projectUid}`,
          page_size: 100,
        }
      );

      return voteResources
        .filter((r) => r.data.committee_uid === committeeId)
        .map((r) => ({
          uid: r.data.uid,
          title: r.data.name,
          status: getVoteStatus(r.data.status),
          deadline: r.data.end_time,
          votes_for: r.data.num_response_received ?? 0,
          votes_against: 0,
          votes_abstain: 0,
          total_eligible: r.data.total_voting_request_invitations ?? 0,
          created_by: '',
        }));
    } catch {
      logger.warning(req, 'get_committee_votes', 'Failed to fetch committee votes, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeResolutions(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_resolution',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_resolutions', 'Failed to fetch committee resolutions, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeActivity(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_activity',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_activity', 'Failed to fetch committee activity, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeContributors(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_contributor',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_contributors', 'Failed to fetch committee contributors, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeDeliverables(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_deliverable',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_deliverables', 'Failed to fetch committee deliverables, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeDiscussions(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_discussion',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_discussions', 'Failed to fetch committee discussions, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeEvents(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_event',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_events', 'Failed to fetch committee events, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeCampaigns(req: Request, committeeId: string): Promise<any[]> {
    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<any>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'committee_campaign',
        tags: `committee_uid:${committeeId}`,
      });
      return resources.map((r) => r.data);
    } catch {
      logger.warning(req, 'get_committee_campaigns', 'Failed to fetch committee campaigns, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async getCommitteeEngagement(req: Request, committeeId: string): Promise<any> {
    try {
      return await this.microserviceProxy.proxyRequest<any>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/engagement`, 'GET');
    } catch {
      logger.warning(req, 'get_committee_engagement', 'Failed to fetch committee engagement, returning null', {
        committee_uid: committeeId,
      });
      return null;
    }
  }

  public async getCommitteeBudget(req: Request, committeeId: string): Promise<any> {
    try {
      return await this.microserviceProxy.proxyRequest<any>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/budget`, 'GET');
    } catch {
      logger.warning(req, 'get_committee_budget', 'Failed to fetch committee budget, returning null', {
        committee_uid: committeeId,
      });
      return null;
    }
  }

  // ── Invite Methods ──────────────────────────────────────────────────────────

  public async createInvites(req: Request, committeeId: string, payload: CreateGroupInviteRequest): Promise<GroupInvite[]> {
    const result = await this.microserviceProxy.proxyRequest<GroupInvite | GroupInvite[]>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/invites`,
      'POST',
      {},
      payload
    );
    return Array.isArray(result) ? result : [result];
  }

  public async getInvites(req: Request, committeeId: string): Promise<GroupInvite[]> {
    try {
      const result = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupInvite>>(
        req,
        'LFX_V2_SERVICE',
        `/committees/${committeeId}/invites`,
        'GET'
      );
      return Array.isArray(result) ? result : result?.resources?.map((r) => r.data) || [];
    } catch {
      logger.warning(req, 'get_invites', 'Failed to fetch invites, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  // ── Application Methods ─────────────────────────────────────────────────────

  public async applyToJoin(req: Request, committeeId: string, payload: GroupJoinApplicationRequest): Promise<GroupJoinApplication> {
    return this.microserviceProxy.proxyRequest<GroupJoinApplication>(req, 'LFX_V2_SERVICE', `/committees/${committeeId}/applications`, 'POST', {}, payload);
  }

  public async getApplications(req: Request, committeeId: string): Promise<GroupJoinApplication[]> {
    try {
      const result = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupJoinApplication>>(
        req,
        'LFX_V2_SERVICE',
        `/committees/${committeeId}/applications`,
        'GET'
      );
      return Array.isArray(result) ? result : result?.resources?.map((r) => r.data) || [];
    } catch {
      logger.warning(req, 'get_applications', 'Failed to fetch applications, returning empty', {
        committee_uid: committeeId,
      });
      return [];
    }
  }

  public async approveApplication(req: Request, committeeId: string, applicationId: string): Promise<GroupJoinApplication> {
    return this.microserviceProxy.proxyRequest<GroupJoinApplication>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/applications/${applicationId}/approve`,
      'POST'
    );
  }

  public async rejectApplication(req: Request, committeeId: string, applicationId: string): Promise<GroupJoinApplication> {
    return this.microserviceProxy.proxyRequest<GroupJoinApplication>(
      req,
      'LFX_V2_SERVICE',
      `/committees/${committeeId}/applications/${applicationId}/reject`,
      'POST'
    );
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
}
