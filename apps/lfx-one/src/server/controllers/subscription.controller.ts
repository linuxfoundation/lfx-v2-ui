// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { SubscriptionService } from '../services/subscription.service';

/**
 * Controller for subscription management endpoints
 */
export class SubscriptionController {
  private subscriptionService: SubscriptionService = new SubscriptionService();

  /**
   * GET /api/subscriptions?email=...
   * Returns all mailing lists with subscription status for the given email.
   */
  public async getUserSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    const email = req.query['email'] as string;
    const startTime = logger.startOperation(req, 'get_user_subscriptions', { email });

    try {
      if (!email) {
        next(
          ServiceValidationError.forField('email', 'email query parameter is required', {
            operation: 'get_user_subscriptions',
            service: 'subscription_controller',
            path: req.path,
          })
        );
        return;
      }

      const result = await this.subscriptionService.getUserSubscriptions(req, email);

      logger.success(req, 'get_user_subscriptions', startTime, {
        email,
        subscription_count: result.subscriptions.length,
      });

      res.json(result);
    } catch (error) {
      logger.error(req, 'get_user_subscriptions', startTime, error, { email });
      next(error);
    }
  }

  /**
   * POST /api/subscriptions/:mailingListId/subscribe
   * Subscribes the given email to a mailing list.
   */
  public async subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { mailingListId } = req.params;
    const { email } = req.body as { email: string };
    const startTime = logger.startOperation(req, 'subscribe_mailing_list', { mailing_list_id: mailingListId, email });

    try {
      if (!mailingListId) {
        next(
          ServiceValidationError.forField('mailingListId', 'mailingListId is required', {
            operation: 'subscribe_mailing_list',
            service: 'subscription_controller',
            path: req.path,
          })
        );
        return;
      }

      if (!email) {
        next(
          ServiceValidationError.forField('email', 'email is required', {
            operation: 'subscribe_mailing_list',
            service: 'subscription_controller',
            path: req.path,
          })
        );
        return;
      }

      const member = await this.subscriptionService.subscribe(req, mailingListId, email);

      logger.success(req, 'subscribe_mailing_list', startTime, {
        mailing_list_id: mailingListId,
        member_uid: member.uid,
      });

      res.status(201).json(member);
    } catch (error) {
      logger.error(req, 'subscribe_mailing_list', startTime, error, { mailing_list_id: mailingListId, email });
      next(error);
    }
  }

  /**
   * DELETE /api/subscriptions/:mailingListId/members/:memberId
   * Unsubscribes a member from a mailing list.
   */
  public async unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    const { mailingListId, memberId } = req.params;
    const startTime = logger.startOperation(req, 'unsubscribe_mailing_list', { mailing_list_id: mailingListId, member_id: memberId });

    try {
      if (!mailingListId) {
        next(
          ServiceValidationError.forField('mailingListId', 'mailingListId is required', {
            operation: 'unsubscribe_mailing_list',
            service: 'subscription_controller',
            path: req.path,
          })
        );
        return;
      }

      if (!memberId) {
        next(
          ServiceValidationError.forField('memberId', 'memberId is required', {
            operation: 'unsubscribe_mailing_list',
            service: 'subscription_controller',
            path: req.path,
          })
        );
        return;
      }

      await this.subscriptionService.unsubscribe(req, mailingListId, memberId);

      logger.success(req, 'unsubscribe_mailing_list', startTime, {
        mailing_list_id: mailingListId,
        member_id: memberId,
      });

      res.status(204).send();
    } catch (error) {
      logger.error(req, 'unsubscribe_mailing_list', startTime, error, { mailing_list_id: mailingListId, member_id: memberId });
      next(error);
    }
  }
}
