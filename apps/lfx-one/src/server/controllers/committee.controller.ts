// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  CommitteeCreateData,
  CommitteeUpdateData,
  CreateCommitteeMemberRequest,
  CreateGroupInviteRequest,
  GroupJoinApplicationRequest,
} from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { CommitteeService } from '../services/committee.service';

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
      const committees = await this.committeeService.getCommittees(req, req.query);

      logger.success(req, 'get_committees', startTime, {
        committee_count: committees.length,
      });

      res.json(committees);
    } catch (error) {
      next(error);
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
   * POST /committees/:id/invites
   */
  public async createInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      next(ServiceValidationError.forField('id', 'Committee ID is required', { operation: 'create_invites', service: 'committee_controller', path: req.path }));
      return;
    }
    const startTime = logger.startOperation(req, 'create_invites', { committee_id: committeeId });

    try {
      const payload: CreateGroupInviteRequest = req.body;
      const invites = await this.committeeService.createInvites(req, committeeId, payload);

      logger.success(req, 'create_invites', startTime, {
        committee_id: committeeId,
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
    const committeeId = req.params['id'];
    if (!committeeId) {
      next(ServiceValidationError.forField('id', 'Committee ID is required', { operation: 'get_invites', service: 'committee_controller', path: req.path }));
      return;
    }
    const startTime = logger.startOperation(req, 'get_invites', { committee_id: committeeId });

    try {
      const invites = await this.committeeService.getInvites(req, committeeId);

      logger.success(req, 'get_invites', startTime, {
        committee_id: committeeId,
        invite_count: invites.length,
      });

      res.json(invites);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /committees/:id/applications
   */
  public async applyToJoin(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      next(ServiceValidationError.forField('id', 'Committee ID is required', { operation: 'apply_to_join', service: 'committee_controller', path: req.path }));
      return;
    }
    const startTime = logger.startOperation(req, 'apply_to_join', { committee_id: committeeId });

    try {
      const payload: GroupJoinApplicationRequest = req.body;
      const application = await this.committeeService.applyToJoin(req, committeeId, payload);

      logger.success(req, 'apply_to_join', startTime, { committee_id: committeeId });
      res.status(201).json(application);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/applications
   */
  public async getApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    if (!committeeId) {
      next(
        ServiceValidationError.forField('id', 'Committee ID is required', { operation: 'get_applications', service: 'committee_controller', path: req.path })
      );
      return;
    }
    const startTime = logger.startOperation(req, 'get_applications', { committee_id: committeeId });

    try {
      const applications = await this.committeeService.getApplications(req, committeeId);

      logger.success(req, 'get_applications', startTime, {
        committee_id: committeeId,
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
    const committeeId = req.params['id'];
    const applicationId = req.params['applicationId'];
    if (!committeeId) {
      next(
        ServiceValidationError.forField('id', 'Committee ID is required', { operation: 'approve_application', service: 'committee_controller', path: req.path })
      );
      return;
    }
    if (!applicationId) {
      next(
        ServiceValidationError.forField('applicationId', 'Application ID is required', {
          operation: 'approve_application',
          service: 'committee_controller',
          path: req.path,
        })
      );
      return;
    }
    const startTime = logger.startOperation(req, 'approve_application', { committee_id: committeeId, application_id: applicationId });

    try {
      const application = await this.committeeService.approveApplication(req, committeeId, applicationId);

      logger.success(req, 'approve_application', startTime, { committee_id: committeeId, application_id: applicationId });
      res.json(application);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /committees/:id/applications/:applicationId/reject
   */
  public async rejectApplication(req: Request, res: Response, next: NextFunction): Promise<void> {
    const committeeId = req.params['id'];
    const applicationId = req.params['applicationId'];
    if (!committeeId) {
      next(
        ServiceValidationError.forField('id', 'Committee ID is required', { operation: 'reject_application', service: 'committee_controller', path: req.path })
      );
      return;
    }
    if (!applicationId) {
      next(
        ServiceValidationError.forField('applicationId', 'Application ID is required', {
          operation: 'reject_application',
          service: 'committee_controller',
          path: req.path,
        })
      );
      return;
    }
    const startTime = logger.startOperation(req, 'reject_application', { committee_id: committeeId, application_id: applicationId });

    try {
      const application = await this.committeeService.rejectApplication(req, committeeId, applicationId);

      logger.success(req, 'reject_application', startTime, { committee_id: committeeId, application_id: applicationId });
      res.json(application);
    } catch (error) {
      next(error);
    }
  }
}
