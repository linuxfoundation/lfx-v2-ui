// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Wire format the browser produces from PushManager.subscribe(). Mirrors
 * `PushSubscriptionJSON` from lib.dom.d.ts but pinned so the server doesn't
 * need to reach into DOM types.
 */
export interface WebPushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Subscription record persisted by the server. The user_id ties it back to
 * the authenticated principal so we can fan out per-user pushes.
 */
export interface StoredPushSubscription extends WebPushSubscriptionJSON {
  user_id: string;
  created_at: string;
  last_seen_at: string;
}

/** Allowed payload shapes for push notifications fired from the server. */
export type PushPayloadKind = 'meeting_reminder' | 'pending_action' | 'test';

export interface PushPayload {
  kind: PushPayloadKind;
  title: string;
  body: string;
  /** Where to take the user when they tap the notification. */
  url?: string;
  /** Optional icon override; defaults to the PWA icon. */
  icon?: string;
  /** Tag is used by the SW to coalesce notifications of the same kind. */
  tag?: string;
}
