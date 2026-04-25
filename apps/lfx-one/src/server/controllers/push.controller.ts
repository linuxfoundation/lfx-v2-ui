// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { PERSONA_COOKIE_KEY } from '@lfx-one/shared/constants';
import { PersistedPersonaState, PushPayload, WebPushSubscriptionJSON } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { AuthorizationError, ServiceValidationError } from '../errors';
import { logger } from '../services/logger.service';
import { PushNotificationService } from '../services/push-notification.service';
import { getEffectiveSub } from '../utils/auth-helper';

const FAN_OUT_PERSONAS = new Set<string>(['executive-director', 'board-member']);

interface NotifyBody {
  payload?: Partial<PushPayload> & { title: string; body: string };
  userIds?: string[];
}

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

  /**
   * Generic trigger surface — fires a push to the caller, or (for ED / Board
   * personas) to a list of user ids. Designed to be the entry point any
   * future trigger source (cron, NATS subscriber, webhook) can call.
   */
  public notify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const startTime = logger.startOperation(req, 'send_push');
    try {
      const userId = getEffectiveSub(req);
      if (!userId) {
        return next(ServiceValidationError.forField('user_id', 'Authentication required', { operation: 'send_push' }));
      }
      const body = (req.body ?? {}) as NotifyBody;
      const { payload, userIds } = body;
      if (!payload?.title || !payload.body) {
        return next(ServiceValidationError.forField('payload', 'payload.title and payload.body are required', { operation: 'send_push' }));
      }
      const targets = userIds && userIds.length > 0 ? userIds : [userId];
      const fanOut = targets.length > 1 || (targets.length === 1 && targets[0] !== userId);
      if (fanOut && !this.callerCanFanOut(req)) {
        return next(new AuthorizationError('Only ED or Board Member personas can target other users'));
      }
      const fullPayload: PushPayload = {
        kind: payload.kind ?? 'test',
        title: payload.title,
        body: payload.body,
        url: payload.url,
        icon: payload.icon,
        tag: payload.tag,
      };
      const result = await this.pushService.sendToUsers(req, targets, fullPayload);
      logger.success(req, 'send_push', startTime, { ...result, target_count: targets.length, fan_out: fanOut });
      res.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  };

  private callerCanFanOut(req: Request): boolean {
    const cookieHeader = req.headers.cookie ?? '';
    const match = cookieHeader.match(new RegExp(`${PERSONA_COOKIE_KEY}=([^;]+)`));
    if (!match?.[1]) {
      return false;
    }
    try {
      const parsed = JSON.parse(decodeURIComponent(match[1])) as PersistedPersonaState;
      return parsed.primary !== undefined && FAN_OUT_PERSONAS.has(parsed.primary);
    } catch {
      return false;
    }
  }
}
