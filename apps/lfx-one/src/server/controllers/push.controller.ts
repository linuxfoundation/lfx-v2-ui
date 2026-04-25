// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { PushPayload, WebPushSubscriptionJSON } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { PushNotificationService } from '../services/push-notification.service';
import { getEffectiveSub } from '../utils/auth-helper';

export class PushController {
  private readonly pushService = PushNotificationService.getInstance();

  public getPublicKey = (req: Request, res: Response, next: NextFunction): void => {
    const startTime = logger.startOperation(req, 'get_push_public_key');
    try {
      const publicKey = this.pushService.getPublicKey();
      logger.success(req, 'get_push_public_key', startTime, { has_key: Boolean(publicKey) });
      res.json({ publicKey: publicKey ?? null, enabled: this.pushService.isEnabled() });
    } catch (error) {
      next(error);
    }
  };

  public subscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = logger.startOperation(req, 'subscribe_push');
    try {
      const userId = getEffectiveSub(req);
      if (!userId) {
        return next(ServiceValidationError.forField('user_id', 'Authentication required', { operation: 'subscribe_push' }));
      }
      const subscription = req.body as WebPushSubscriptionJSON;
      if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        return next(ServiceValidationError.forField('subscription', 'Invalid push subscription payload', { operation: 'subscribe_push' }));
      }
      await this.pushService.saveSubscription(req, userId, subscription);
      logger.success(req, 'subscribe_push', startTime);
      res.status(201).json({ ok: true });
    } catch (error) {
      next(error);
    }
  };

  public unsubscribe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = logger.startOperation(req, 'unsubscribe_push');
    try {
      const userId = getEffectiveSub(req);
      if (!userId) {
        return next(ServiceValidationError.forField('user_id', 'Authentication required', { operation: 'unsubscribe_push' }));
      }
      const endpoint = (req.body as { endpoint?: string })?.endpoint;
      if (!endpoint) {
        return next(ServiceValidationError.forField('endpoint', 'endpoint is required', { operation: 'unsubscribe_push' }));
      }
      const removed = await this.pushService.removeSubscription(req, userId, endpoint);
      logger.success(req, 'unsubscribe_push', startTime, { removed });
      res.json({ ok: true, removed });
    } catch (error) {
      next(error);
    }
  };

  public sendTest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = logger.startOperation(req, 'send_test_push');
    try {
      const userId = getEffectiveSub(req);
      if (!userId) {
        return next(ServiceValidationError.forField('user_id', 'Authentication required', { operation: 'send_test_push' }));
      }
      const payload: PushPayload = {
        kind: 'test',
        title: 'LFX One',
        body: 'Push notifications are working — you can now be notified about pending votes and meeting reminders.',
        url: '/',
        tag: 'test',
      };
      const result = await this.pushService.sendToUser(req, userId, payload);
      logger.success(req, 'send_test_push', startTime, result);
      res.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  };
}
