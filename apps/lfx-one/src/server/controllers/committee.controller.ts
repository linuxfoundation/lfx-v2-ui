// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommitteeCreateData, CommitteeUpdateData, CreateCommitteeMemberRequest } from '@lfx-one/shared/interfaces';
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

  // ── Dashboard Sub-Resource Endpoints ─────────────────────────────────────

  /**
   * GET /committees/:id/votes
   */
  public async getCommitteeVotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_votes', { committee_id: id });
    try {
      const votes = await this.committeeService.getCommitteeVotes(req, id);
      logger.success(req, 'get_committee_votes', startTime, { committee_id: id, count: votes.length });
      res.json(votes);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/resolutions
   */
  public async getCommitteeResolutions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_resolutions', { committee_id: id });
    try {
      const resolutions = await this.committeeService.getCommitteeResolutions(req, id);
      logger.success(req, 'get_committee_resolutions', startTime, { committee_id: id, count: resolutions.length });
      res.json(resolutions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/activity
   */
  public async getCommitteeActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_activity', { committee_id: id });
    try {
      const activity = await this.committeeService.getCommitteeActivity(req, id);
      logger.success(req, 'get_committee_activity', startTime, { committee_id: id, count: activity.length });
      res.json(activity);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/contributors
   */
  public async getCommitteeContributors(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_contributors', { committee_id: id });
    try {
      const contributors = await this.committeeService.getCommitteeContributors(req, id);
      logger.success(req, 'get_committee_contributors', startTime, { committee_id: id, count: contributors.length });
      res.json(contributors);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/deliverables
   */
  public async getCommitteeDeliverables(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_deliverables', { committee_id: id });
    try {
      const deliverables = await this.committeeService.getCommitteeDeliverables(req, id);
      logger.success(req, 'get_committee_deliverables', startTime, { committee_id: id, count: deliverables.length });
      res.json(deliverables);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/discussions
   */
  public async getCommitteeDiscussions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_discussions', { committee_id: id });
    try {
      const discussions = await this.committeeService.getCommitteeDiscussions(req, id);
      logger.success(req, 'get_committee_discussions', startTime, { committee_id: id, count: discussions.length });
      res.json(discussions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/events
   */
  public async getCommitteeEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_events', { committee_id: id });
    try {
      const events = await this.committeeService.getCommitteeEvents(req, id);
      logger.success(req, 'get_committee_events', startTime, { committee_id: id, count: events.length });
      res.json(events);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/campaigns
   */
  public async getCommitteeCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_campaigns', { committee_id: id });
    try {
      const campaigns = await this.committeeService.getCommitteeCampaigns(req, id);
      logger.success(req, 'get_committee_campaigns', startTime, { committee_id: id, count: campaigns.length });
      res.json(campaigns);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/engagement
   */
  public async getCommitteeEngagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_engagement', { committee_id: id });
    try {
      const metrics = await this.committeeService.getCommitteeEngagement(req, id);
      logger.success(req, 'get_committee_engagement', startTime, { committee_id: id });
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/budget
   */
  public async getCommitteeBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_budget', { committee_id: id });
    try {
      const budget = await this.committeeService.getCommitteeBudget(req, id);
      logger.success(req, 'get_committee_budget', startTime, { committee_id: id });
      res.json(budget);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /committees/:id/documents
   */
  public async getCommitteeDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { id } = req.params;
    const startTime = logger.startOperation(req, 'get_committee_documents', { committee_id: id });
    try {
      const documents = await this.committeeService.getCommitteeDocuments(req, id);
      logger.success(req, 'get_committee_documents', startTime, { committee_id: id, count: documents.length });
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
}
