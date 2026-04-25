// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { PushPayload, StoredPushSubscription, WebPushSubscriptionJSON } from '@lfx-one/shared/interfaces';
import { Request } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import webPush, { WebPushError } from 'web-push';

import { logger } from './logger.service';

const DEFAULT_STORE_PATH = path.resolve(process.cwd(), 'apps/lfx-one/.local-data/push-subscriptions.json');

/**
 * Local-only push notification service for personal-research PWAs.
 *
 * Storage is a JSON file under apps/lfx-one/.local-data — fine for a single
 * dev machine, not safe for multi-instance production. Production deployments
 * should swap the persistence layer for Supabase or another shared store.
 */
export class PushNotificationService {
  private static instance: PushNotificationService | null = null;

  private readonly storePath: string;
  private readonly subscriptions = new Map<string, StoredPushSubscription>();
  private readonly publicKey: string | undefined;
  private readonly privateKey: string | undefined;
  private readonly subject: string;
  private readonly enabled: boolean;
  private loaded = false;

  private constructor() {
    this.publicKey = process.env['VAPID_PUBLIC_KEY']?.trim() || undefined;
    this.privateKey = process.env['VAPID_PRIVATE_KEY']?.trim() || undefined;
    this.subject = process.env['VAPID_SUBJECT']?.trim() || 'mailto:dev@local.lfx';
    this.storePath = process.env['PUSH_SUBSCRIPTIONS_FILE']?.trim() || DEFAULT_STORE_PATH;
    this.enabled = Boolean(this.publicKey && this.privateKey);

    if (this.enabled) {
      webPush.setVapidDetails(this.subject, this.publicKey!, this.privateKey!);
    } else {
      logger.warning(undefined, 'push_notification_init', 'VAPID keys not configured — push notifications disabled', {});
    }
  }

  public static getInstance(): PushNotificationService {
    if (!this.instance) {
      this.instance = new PushNotificationService();
    }
    return this.instance;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getPublicKey(): string | undefined {
    return this.publicKey;
  }

  public async saveSubscription(req: Request, userId: string, subscription: WebPushSubscriptionJSON): Promise<void> {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const existing = this.subscriptions.get(subscription.endpoint);
    const record: StoredPushSubscription = {
      ...subscription,
      user_id: userId,
      created_at: existing?.created_at ?? now,
      last_seen_at: now,
    };
    this.subscriptions.set(subscription.endpoint, record);
    await this.persist();
    logger.info(req, 'push_subscription_saved', 'Stored push subscription', {
      user_id: userId,
      endpoint_host: this.endpointHost(subscription.endpoint),
    });
  }

  public async removeSubscription(req: Request, userId: string, endpoint: string): Promise<boolean> {
    await this.ensureLoaded();
    const existing = this.subscriptions.get(endpoint);
    if (!existing || existing.user_id !== userId) {
      return false;
    }
    this.subscriptions.delete(endpoint);
    await this.persist();
    logger.info(req, 'push_subscription_removed', 'Removed push subscription', {
      user_id: userId,
      endpoint_host: this.endpointHost(endpoint),
    });
    return true;
  }

  public async sendToUser(req: Request | undefined, userId: string, payload: PushPayload): Promise<{ delivered: number; failed: number }> {
    return this.sendToUsers(req, [userId], payload);
  }

  /**
   * Fan out a payload to every subscription owned by any user in the list.
   * Expired subscriptions (404 / 410) are dropped from the store on the way out.
   */
  public async sendToUsers(req: Request | undefined, userIds: string[], payload: PushPayload): Promise<{ delivered: number; failed: number }> {
    if (!this.enabled) {
      logger.warning(req, 'push_send', 'Skipped — push notifications disabled', { user_count: userIds.length });
      return { delivered: 0, failed: 0 };
    }
    if (userIds.length === 0) {
      return { delivered: 0, failed: 0 };
    }
    await this.ensureLoaded();
    const userSet = new Set(userIds);
    const targets = Array.from(this.subscriptions.values()).filter((sub) => userSet.has(sub.user_id));
    if (targets.length === 0) {
      logger.debug(req, 'push_send', 'No subscriptions for any target user', { user_count: userIds.length });
      return { delivered: 0, failed: 0 };
    }
    const json = JSON.stringify(payload);
    let delivered = 0;
    let failed = 0;
    const expired: string[] = [];

    for (const sub of targets) {
      try {
        await webPush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, json);
        delivered++;
      } catch (error) {
        failed++;
        if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          expired.push(sub.endpoint);
          logger.warning(req, 'push_send', 'Subscription expired — removing', {
            user_id: sub.user_id,
            endpoint_host: this.endpointHost(sub.endpoint),
            status_code: error.statusCode,
          });
        } else {
          logger.warning(req, 'push_send', 'Push delivery failed', {
            user_id: sub.user_id,
            endpoint_host: this.endpointHost(sub.endpoint),
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
    if (expired.length > 0) {
      for (const endpoint of expired) {
        this.subscriptions.delete(endpoint);
      }
      await this.persist();
    }
    return { delivered, failed };
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    try {
      const raw = await fs.readFile(this.storePath, 'utf-8');
      const records = JSON.parse(raw) as StoredPushSubscription[];
      for (const record of records) {
        this.subscriptions.set(record.endpoint, record);
      }
    } catch (error) {
      // ENOENT is expected on first run.
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        logger.warning(undefined, 'push_store_load', 'Failed to load subscription store', {
          path: this.storePath,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    this.loaded = true;
  }

  private async persist(): Promise<void> {
    const records = Array.from(this.subscriptions.values());
    await fs.mkdir(path.dirname(this.storePath), { recursive: true });
    await fs.writeFile(this.storePath, JSON.stringify(records, null, 2), 'utf-8');
  }

  private endpointHost(endpoint: string): string {
    try {
      return new URL(endpoint).host;
    } catch {
      return 'unknown';
    }
  }
}
