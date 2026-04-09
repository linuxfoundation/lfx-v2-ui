// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { GroupsIOMailingList, MailingListMember, QueryServiceResponse, UserSubscription, UserSubscriptionsResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/**
 * Service for aggregating a user's mailing list subscription status across all projects.
 *
 * Because no upstream "get subscriptions for user" endpoint exists, this service
 * fetches all mailing lists visible to the authenticated user and then checks
 * membership for each list in parallel.
 */
export class SubscriptionService {
  private microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
  }

  /**
   * Returns all mailing lists visible to the authenticated user, enriched with
   * subscription status for the given email address.
   */
  public async getUserSubscriptions(req: Request, email: string): Promise<UserSubscriptionsResponse> {
    logger.debug(req, 'get_user_subscriptions', 'Fetching all mailing lists for subscription check', { email });

    // 1. Fetch all mailing lists accessible via the user's auth token
    const { resources: listResources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOMailingList>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      { type: 'groupsio_mailing_list' }
    );

    const mailingLists = listResources.map((r) => r.data);

    logger.debug(req, 'get_user_subscriptions', 'Checking subscription status per mailing list', {
      email,
      mailing_list_count: mailingLists.length,
    });

    // 2. Check subscription status for each list in parallel
    const subscriptions = await Promise.all(mailingLists.map((list) => this.checkSubscription(req, list, email)));

    return { email, subscriptions };
  }

  /**
   * Subscribes an email to a mailing list by creating a member record.
   */
  public async subscribe(req: Request, mailingListId: string, email: string): Promise<MailingListMember> {
    logger.debug(req, 'subscribe_mailing_list', 'Subscribing email to mailing list', { mailing_list_uid: mailingListId, email });

    return this.microserviceProxy.proxyRequest<MailingListMember>(
      req,
      'LFX_V2_SERVICE',
      `/groupsio/mailing-lists/${mailingListId}/members`,
      'POST',
      undefined,
      { email }
    );
  }

  /**
   * Unsubscribes a member from a mailing list by deleting their member record.
   */
  public async unsubscribe(req: Request, mailingListId: string, memberId: string): Promise<void> {
    logger.debug(req, 'unsubscribe_mailing_list', 'Unsubscribing member from mailing list', {
      mailing_list_uid: mailingListId,
      member_uid: memberId,
    });

    await this.microserviceProxy.proxyRequest<void>(req, 'LFX_V2_SERVICE', `/groupsio/mailing-lists/${mailingListId}/members/${memberId}`, 'DELETE');
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Fetches members for a single mailing list and checks if the given email is subscribed.
   */
  private async checkSubscription(req: Request, list: GroupsIOMailingList, email: string): Promise<UserSubscription> {
    const base: UserSubscription = {
      mailing_list_uid: list.uid,
      title: list.title,
      description: list.description,
      type: list.type,
      audience_access: list.audience_access,
      project_uid: list.project_uid,
      project_name: list.project_name,
      project_slug: list.project_slug,
      service_uid: list.service_uid,
      subscriber_count: list.subscriber_count,
      subscribed: false,
    };

    try {
      const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<MailingListMember>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        { type: 'groupsio_member', tags: `mailing_list_uid:${list.uid}` }
      );

      const members = resources.map((r) => r.data);
      const match = members.find((m) => m.email?.toLowerCase() === email.toLowerCase());

      if (match) {
        return { ...base, subscribed: true, member_uid: match.uid };
      }
    } catch {
      logger.warning(req, 'check_subscription', 'Failed to fetch members for mailing list, treating as unsubscribed', {
        mailing_list_uid: list.uid,
      });
    }

    return base;
  }
}
