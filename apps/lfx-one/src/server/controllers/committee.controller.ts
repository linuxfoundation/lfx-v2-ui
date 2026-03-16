// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  Committee,
  CommitteeCreateData,
  CommitteeUpdateData,
  CreateCommitteeMemberRequest,
  CreateGroupInviteRequest,
  PublicCommittee,
} from '@lfx-one/shared/interfaces';
import { CreateCommitteeJoinApplicationRequest } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { CommitteeService } from '../services/committee.service';
import { generateM2MToken } from '../utils/m2m-token.util';

/**
 * Maps an internal Committee to the public-safe DTO shape.
 */
function toPublicCommittee(c: Committee): PublicCommittee {
  return {
    uid: c.uid,
    name: c.display_name || c.name,
    description: c.description,
    category: c.category,
    chairs: [c.chair, c.co_chair]
      .filter((l): l is NonNullable<typeof l> => !!l)
      .map((l) => ({ name: `${l.first_name} ${l.last_name}`, organization: l.organization, role: l === c.chair ? 'Chair' : 'Co-Chair' })),
    members: [],
    total_members: c.total_members || 0,
    external_links: {
      website: c.website,
      mailing_list_url: c.mailing_list?.url,
      chat_channel_url: c.chat_channel?.url,
    },
  };
}

/**
 * Controller for handling committee HTTP requests
 */
export class CommitteeController {
  private committeeService: CommitteeService = new CommitteeService();

  /**
   * GET /committees
   */
  public async getCommittees(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_committees', {
      query_params: logger.sanitize(req.query as Record<string, any>),
    });

    try {
      const data = await this.committeeService.getCommittees(req, req.query);

      logger.success(req, 'get_committees', startTime, {
        committee_count: data.length,
      });

      res.json(data);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /public/api/committees
   * Returns public-safe committee DTOs filtered to public-only.
   * Optionally scoped by project_uid query param.
   */
  public async getPublicCommittees(req: Request, res: Response, next: NextFunction): Promise<void> {
    const projectUid = req.query['project_uid'] as string | undefined;
    const startTime = logger.startOperation(req, 'get_public_committees', { project_uid: projectUid });

    // Save original token (public route — typically undefined)
    const originalToken = req.bearerToken;

    try {
      // Generate M2M token for unauthenticated backend calls
      const m2mToken = await generateM2MToken(req);
      req.bearerToken = m2mToken;

      const committees = projectUid
        ? await this.committeeService.getPublicCommitteesByProject(req, projectUid)
        : await this.committeeService.getPublicCommittees(req);

      logger.success(req, 'get_public_committees', startTime, {
        project_uid: projectUid,
        committee_count: committees.length,
      });

      res.json(committees.map(toPublicCommittee));
    } catch (error) {
      next(error);
    } finally {
      // Always restore original token to prevent M2M token leak
      if (originalToken !== undefined) {
        req.bearerToken = originalToken;
      } else {
        delete req.bearerToken;
      }
    }
  }

  /**
   * GET /committees/count
   */
  public async getCommitteesCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_committees_count', {
      query_params: logger.sanitize(req.query as Record<string, any>),
    });

    try {
      const count = await this.committeeService.getCommitteesCount(req, req.query);

      logger.success(req, 'get_committees_count', startTime, {
        count,
      });

      res.json({ count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/my
   * Returns committees the current user is a member of, with their role in each.
   */
  public async getMyCommittees(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_my_committees', {});

    try {
      const myCommittees = await this.committeeService.getMyCommittees(req);

      logger.success(req, 'get_my_committees', startTime, {
        committee_count: myCommittees.length,
      });

      res.json(myCommittees);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id
   */
  public async getCommitteeById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_by_id', {
      committee_id: id,
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'get_committee_by_id',
          service: 'committee_controller',
          path: req.path,
        });

        next(validationError);
        return;
      }

      // Get the committee by ID
      const committee = await this.committeeService.getCommitteeById(req, id);

      // Log the success
      logger.success(req, 'get_committee_by_id', startTime, {
        committee_id: id,
        committee_category: committee.category,
      });

      // Send the committee data to the client
      res.json(committee);
    } catch (error) {
      // Send the error to the next middleware
      next(error);
    }
  }

  /**
   * POST /committees
   */
  public async createCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'create_committee', {
      committee_data: logger.sanitize(req.body),
    });

    try {
      const committeeData: CommitteeCreateData = req.body;
      // Create the committee
      const newCommittee = await this.committeeService.createCommittee(req, committeeData);

      // Log the success
      logger.success(req, 'create_committee', startTime, {
        committee_id: newCommittee.uid,
        committee_category: newCommittee.category,
      });

      // Send the new committee data to the client
      res.status(201).json(newCommittee);
    } catch (error) {
      // Send the error to the next middleware
      next(error);
    }
  }

  /**
   * PUT /committees/:id
   */
  public async updateCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'update_committee', {
      committee_id: id,
      update_data: logger.sanitize(req.body),
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'update_committee',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Get the update data
      const updateData: CommitteeUpdateData = req.body;

      // Update the committee
      const updatedCommittee = await this.committeeService.updateCommittee(req, id, updateData);

      // Log the success
      logger.success(req, 'update_committee', startTime, {
        committee_id: id,
      });

      // Send the updated committee data to the client
      res.json(updatedCommittee);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /committees/:id
   */
  public async deleteCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'delete_committee', {
      committee_id: id,
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'delete_committee',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Delete the committee
      await this.committeeService.deleteCommittee(req, id);

      // Log the success
      logger.success(req, 'delete_committee', startTime, {
        committee_id: id,
      });

      // Send the response to the client
      res.status(204).send();
    } catch (error) {
      // Send the error to the next middleware
      next(error);
    }
  }

  /**
   * GET /committees/:id/members
   */
  public async getCommitteeMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_members', {
      committee_id: id,
      query_params: logger.sanitize(req.query as Record<string, any>),
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'get_committee_members',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Get the committee members
      const members = await this.committeeService.getCommitteeMembers(req, id, req.query);

      // Log the success
      logger.success(req, 'get_committee_members', startTime, {
        committee_id: id,
        member_count: members.length,
      });

      // Send the members data to the client
      res.json(members);
    } catch (error) {
      // Send the error to the next middleware
      next(error);
    }
  }

  /**
   * GET /committees/:id/members/:memberId
   */
  public async getCommitteeMemberById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, memberId } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_member_by_id', {
      committee_id: id,
      member_id: memberId,
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'get_committee_member_by_id',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Check if the member ID is provided
      if (!memberId) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('memberId', 'Member ID is required', {
          operation: 'get_committee_member_by_id',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Get the committee member by ID
      const member = await this.committeeService.getCommitteeMemberById(req, id, memberId);

      // Log the success
      logger.success(req, 'get_committee_member_by_id', startTime, {
        committee_id: id,
        member_id: memberId,
      });

      // Send the member data to the client
      res.json(member);
    } catch (error) {
      // Send the error to the next middleware
      next(error);
    }
  }

  /**
   * POST /committees/:id/members
   */
  public async createCommitteeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'create_committee_member', {
      committee_id: id,
      member_data: logger.sanitize(req.body),
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'create_committee_member',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Get the member data
      const memberData: CreateCommitteeMemberRequest = req.body;

      // Create the committee member
      const newMember = await this.committeeService.createCommitteeMember(req, id, memberData);

      // Log the success
      logger.success(req, 'create_committee_member', startTime, {
        committee_id: id,
        member_id: newMember.uid,
      });

      // Send the new member data to the client
      res.status(201).json(newMember);
    } catch (error) {
      // Send the error to the next middleware
      next(error);
    }
  }

  /**
   * PUT /committees/:id/members/:memberId
   */
  public async updateCommitteeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, memberId } = req.params;
    const startTime = logger.startOperation(req, 'update_committee_member', {
      committee_id: id,
      member_id: memberId,
      update_data: logger.sanitize(req.body),
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'update_committee_member',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Check if the member ID is provided
      if (!memberId) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('memberId', 'Member ID is required', {
          operation: 'update_committee_member',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Get the update data
      const updateData: Partial<CreateCommitteeMemberRequest> = req.body;

      // Update the committee member
      const updatedMember = await this.committeeService.updateCommitteeMember(req, id, memberId, updateData);

      // Log the success
      logger.success(req, 'update_committee_member', startTime, {
        committee_id: id,
        member_id: memberId,
      });

      // Send the updated member data to the client
      res.json(updatedMember);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /committees/:id/members/:memberId
   */
  public async deleteCommitteeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, memberId } = req.params;
    const startTime = logger.startOperation(req, 'delete_committee_member', {
      committee_id: id,
      member_id: memberId,
    });

    try {
      // Check if the committee ID is provided
      if (!id) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
          operation: 'delete_committee_member',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Check if the member ID is provided
      if (!memberId) {
        // Create a validation error
        const validationError = ServiceValidationError.forField('memberId', 'Member ID is required', {
          operation: 'delete_committee_member',
          service: 'committee_controller',
          path: req.path,
        });

        // Send the validation error to the next middleware
        next(validationError);
        return;
      }

      // Delete the committee member
      await this.committeeService.deleteCommitteeMember(req, id, memberId);

      // Log the success
      logger.success(req, 'delete_committee_member', startTime, {
        committee_id: id,
        member_id: memberId,
      });

      // Send the response to the client
      res.status(204).send();
    } catch (error) {
      // Send the error to the next middleware
      next(error);
    }
  }

  // ── Invite Endpoints ─────────────────────────────────────────────────────

  /**
   * POST /committees/:id/invites
   * Send invite(s) to join the committee.
   */
  public async createInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'create_invites', { committee_id: id });

    try {
      const payload: CreateGroupInviteRequest = req.body;
      const invites = await this.committeeService.createInvites(req, id, payload);

      logger.success(req, 'create_invites', startTime, {
        committee_id: id,
        invite_count: Array.isArray(invites) ? invites.length : 1,
      });

      res.status(201).json(invites);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/invites
   */
  public async getInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_invites', { committee_id: id });

    try {
      const invites = await this.committeeService.getInvites(req, id);

      logger.success(req, 'get_invites', startTime, {
        committee_id: id,
        invite_count: invites.length,
      });

      res.json(invites);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /committees/:id/invites/:inviteId/accept
   */
  public async acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, inviteId } = req.params;
    const startTime = logger.startOperation(req, 'accept_invite', { committee_id: id, invite_id: inviteId });

    try {
      const invite = await this.committeeService.acceptInvite(req, id, inviteId);

      logger.success(req, 'accept_invite', startTime, { committee_id: id, invite_id: inviteId });
      res.json(invite);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /committees/:id/invites/:inviteId/decline
   */
  public async declineInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, inviteId } = req.params;
    const startTime = logger.startOperation(req, 'decline_invite', { committee_id: id, invite_id: inviteId });

    try {
      const invite = await this.committeeService.declineInvite(req, id, inviteId);

      logger.success(req, 'decline_invite', startTime, { committee_id: id, invite_id: inviteId });
      res.json(invite);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /committees/:id/invites/:inviteId
   * Revoke (cancel) a pending invite.
   */
  public async revokeInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, inviteId } = req.params;
    const startTime = logger.startOperation(req, 'revoke_invite', { committee_id: id, invite_id: inviteId });

    try {
      await this.committeeService.revokeInvite(req, id, inviteId);

      logger.success(req, 'revoke_invite', startTime, { committee_id: id, invite_id: inviteId });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ── Join / Leave Endpoints ───────────────────────────────────────────────

  /**
   * POST /committees/:id/join
   * Self-join an open committee.
   */
  public async joinCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'join_committee', { committee_id: id });

    try {
      const member = await this.committeeService.joinCommittee(req, id);

      logger.success(req, 'join_committee', startTime, { committee_id: id });
      res.status(201).json(member);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /committees/:id/leave
   */
  public async leaveCommittee(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'leave_committee', { committee_id: id });

    try {
      await this.committeeService.leaveCommittee(req, id);

      logger.success(req, 'leave_committee', startTime, { committee_id: id });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // ── Dashboard Sub-Resource Endpoints ────────────────────────────────────

  /**
   * GET /committees/:id/votes
   */
  public async getCommitteeVotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_votes',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_votes', { committee_id: committeeId });
    try {
      const votes = await this.committeeService.getCommitteeVotes(req, committeeId);
      logger.success(req, 'get_committee_votes', startTime, { vote_count: votes.length });
      res.json(votes);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/resolutions
   */
  public async getCommitteeResolutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_resolutions',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_resolutions', { committee_id: committeeId });
    try {
      const resolutions = await this.committeeService.getCommitteeResolutions(req, committeeId);
      logger.success(req, 'get_committee_resolutions', startTime, { resolution_count: resolutions.length });
      res.json(resolutions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/activity
   */
  public async getCommitteeActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_activity',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_activity', { committee_id: committeeId });
    try {
      const activity = await this.committeeService.getCommitteeActivity(req, committeeId);
      logger.success(req, 'get_committee_activity', startTime, { activity_count: activity.length });
      res.json(activity);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/contributors
   */
  public async getCommitteeContributors(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_contributors',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_contributors', { committee_id: committeeId });
    try {
      const contributors = await this.committeeService.getCommitteeContributors(req, committeeId);
      logger.success(req, 'get_committee_contributors', startTime, { contributor_count: contributors.length });
      res.json(contributors);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/deliverables
   */
  public async getCommitteeDeliverables(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_deliverables',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_deliverables', { committee_id: committeeId });
    try {
      const deliverables = await this.committeeService.getCommitteeDeliverables(req, committeeId);
      logger.success(req, 'get_committee_deliverables', startTime, { deliverable_count: deliverables.length });
      res.json(deliverables);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/discussions
   */
  public async getCommitteeDiscussions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_discussions',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_discussions', { committee_id: committeeId });
    try {
      const discussions = await this.committeeService.getCommitteeDiscussions(req, committeeId);
      logger.success(req, 'get_committee_discussions', startTime, { discussion_count: discussions.length });
      res.json(discussions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/events
   */
  public async getCommitteeEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_events',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_events', { committee_id: committeeId });
    try {
      const events = await this.committeeService.getCommitteeEvents(req, committeeId);
      logger.success(req, 'get_committee_events', startTime, { event_count: events.length });
      res.json(events);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/campaigns
   */
  public async getCommitteeCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_campaigns',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_campaigns', { committee_id: committeeId });
    try {
      const campaigns = await this.committeeService.getCommitteeCampaigns(req, committeeId);
      logger.success(req, 'get_committee_campaigns', startTime, { campaign_count: campaigns.length });
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/engagement
   */
  public async getCommitteeEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_engagement',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_engagement', { committee_id: committeeId });
    try {
      const engagement = await this.committeeService.getCommitteeEngagement(req, committeeId);
      logger.success(req, 'get_committee_engagement', startTime, { has_engagement: !!engagement });
      res.json(engagement);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/budget
   */
  public async getCommitteeBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_budget',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_budget', { committee_id: committeeId });
    try {
      const budget = await this.committeeService.getCommitteeBudget(req, committeeId);
      logger.success(req, 'get_committee_budget', startTime, { has_budget: !!budget });
      res.json(budget);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/documents
   */
  public async getCommitteeDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_documents',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_documents', { committee_id: committeeId });
    try {
      const documents = await this.committeeService.getCommitteeDocuments(req, committeeId);
      logger.success(req, 'get_committee_documents', startTime, { document_count: documents.length });
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/surveys
   */
  public async getCommitteeSurveys(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      const validationError = ServiceValidationError.forField('id', 'Committee ID is required', {
        operation: 'get_committee_surveys',
        service: 'committee_controller',
        path: req.path,
      });
      next(validationError);
      return;
    }
    const startTime = logger.startOperation(req, 'get_committee_surveys', { committee_id: committeeId });
    try {
      const surveys = await this.committeeService.getCommitteeSurveys(req, committeeId);
      logger.success(req, 'get_committee_surveys', startTime, { survey_count: surveys.length });
      res.json(surveys);
    } catch (error) {
      next(error);
    }
  }

  // ── Application Endpoints (join_mode = 'apply') ──────────────────────────

  /**
   * POST /committees/:id/applications
   */
  public async applyToJoin(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'apply_to_join', { committee_id: id });

    try {
      const payload: CreateCommitteeJoinApplicationRequest = req.body;
      const application = await this.committeeService.applyToJoin(req, id, payload);

      logger.success(req, 'apply_to_join', startTime, { committee_id: id });
      res.status(201).json(application);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/applications
   */
  public async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_applications', { committee_id: id });

    try {
      const applications = await this.committeeService.getApplications(req, id);

      logger.success(req, 'get_applications', startTime, {
        committee_id: id,
        application_count: applications.length,
      });

      res.json(applications);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /committees/:id/applications/:applicationId/approve
   */
  public async approveApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, applicationId } = req.params;
    const startTime = logger.startOperation(req, 'approve_application', { committee_id: id, application_id: applicationId });

    try {
      const application = await this.committeeService.approveApplication(req, id, applicationId);

      logger.success(req, 'approve_application', startTime, { committee_id: id, application_id: applicationId });
      res.json(application);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /committees/:id/applications/:applicationId/reject
   */
  public async rejectApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id, applicationId } = req.params;
    const startTime = logger.startOperation(req, 'reject_application', { committee_id: id, application_id: applicationId });

    try {
      const application = await this.committeeService.rejectApplication(req, id, applicationId);

      logger.success(req, 'reject_application', startTime, { committee_id: id, application_id: applicationId });
      res.json(application);
    } catch (error) {
      next(error);
    }
  }
}
