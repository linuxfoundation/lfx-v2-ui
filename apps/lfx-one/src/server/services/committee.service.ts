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
  GroupMailingList,
  GroupsIOMailingList,
  GroupsIOService,
  QueryServiceCountResponse,
  QueryServiceResponse,
} from '@lfx-one/shared/interfaces';
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

    // Production: not yet implemented
    return [];
  }

  /**
   * Fetches a single committee by ID
   */
  public async getCommitteeById(req: Request, committeeId: string): Promise<Committee> {
    // Use query service instead of broken /committees/:id REST endpoint
    const params = { type: 'committee' };
    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Committee>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', params);
    const committee = resources.map((r) => r.data).find((c) => c.uid === committeeId) || null;

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
        name: ml.group_name,
        url,
        subscriber_count: ml.subscriber_count,
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
}
