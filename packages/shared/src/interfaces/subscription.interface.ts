// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { MailingListAudienceAccess, MailingListType } from '../enums/mailing-list.enum';

/**
 * A mailing list enriched with subscription status for a specific email address.
 */
export interface UserSubscription {
  /** Unique mailing list identifier */
  mailing_list_uid: string;
  /** Display title of the mailing list */
  title: string;
  /** Description of the mailing list purpose */
  description: string;
  /** Mailing list type (announcement, discussion_moderated, discussion_open) */
  type: MailingListType;
  /** Controls who can join this mailing list */
  audience_access: MailingListAudienceAccess;
  /** Associated project UID */
  project_uid: string;
  /** Associated project name */
  project_name: string;
  /** Associated project slug */
  project_slug: string;
  /** Parent service UID */
  service_uid: string;
  /** Number of subscribers */
  subscriber_count: number;
  /** Whether the queried email is subscribed to this list */
  subscribed: boolean;
  /** Member UID — present only when subscribed; required for unsubscription */
  member_uid?: string;
}

/**
 * Response shape for GET /api/subscriptions
 */
export interface UserSubscriptionsResponse {
  /** The email address these subscriptions are scoped to */
  email: string;
  /** Flat list of all mailing lists with subscription status */
  subscriptions: UserSubscription[];
}
