// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { MailingListAudienceAccess, MailingListType } from '@lfx-one/shared/enums';
import { UserSubscription, UserSubscriptionsResponse } from '@lfx-one/shared/interfaces';

/**
 * Returns mock subscription data for UI development.
 * Replace with real HTTP calls once the backend aggregation is available in the
 * target environment.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionMockService {
  public getEmails(): string[] {
    return MOCK_EMAILS;
  }

  public getSubscriptions(email: string): UserSubscriptionsResponse {
    return {
      email,
      subscriptions: MOCK_SUBSCRIPTIONS.map((s) => ({
        ...s,
        // Simulate that the primary email is subscribed to some lists
        subscribed: email === MOCK_EMAILS[0] ? s.subscribed : false,
        member_uid: email === MOCK_EMAILS[0] ? s.member_uid : undefined,
      })),
    };
  }
}

// ─── Mock Emails ──────────────────────────────────────────────────────────────

const MOCK_EMAILS = ['nuno@linuxfoundation.org', 'nuno.eufrasio@gmail.com'];

// ─── Mock Subscriptions ───────────────────────────────────────────────────────

const MOCK_SUBSCRIPTIONS: UserSubscription[] = [
  // ── Kubernetes / CNCF ──────────────────────────────────────────────────────
  {
    mailing_list_uid: 'ml-cncf-dev-001',
    title: 'CNCF Dev',
    description:
      'General development discussion for the Cloud Native Computing Foundation. Covers project proposals, contributor updates, and technical decisions.',
    type: MailingListType.DISCUSSION_OPEN,
    audience_access: MailingListAudienceAccess.PUBLIC,
    project_uid: 'proj-cncf-001',
    project_name: 'Cloud Native Computing Foundation',
    project_slug: 'cncf',
    service_uid: 'svc-cncf-001',
    subscriber_count: 4812,
    subscribed: true,
    member_uid: 'member-cncf-dev-001',
  },
  {
    mailing_list_uid: 'ml-cncf-announce-001',
    title: 'CNCF Announcements',
    description: 'Official announcements from the CNCF governing board, TOC, and project maintainers. Low-traffic, high-signal.',
    type: MailingListType.ANNOUNCEMENT,
    audience_access: MailingListAudienceAccess.PUBLIC,
    project_uid: 'proj-cncf-001',
    project_name: 'Cloud Native Computing Foundation',
    project_slug: 'cncf',
    service_uid: 'svc-cncf-001',
    subscriber_count: 12340,
    subscribed: true,
    member_uid: 'member-cncf-ann-001',
  },
  {
    mailing_list_uid: 'ml-cncf-toc-001',
    title: 'TOC Discussion',
    description: 'Technical Oversight Committee discussion list for project proposals, sandbox reviews, and graduation criteria.',
    type: MailingListType.DISCUSSION_MODERATED,
    audience_access: MailingListAudienceAccess.APPROVAL_REQUIRED,
    project_uid: 'proj-cncf-001',
    project_name: 'Cloud Native Computing Foundation',
    project_slug: 'cncf',
    service_uid: 'svc-cncf-001',
    subscriber_count: 987,
    subscribed: false,
  },

  // ── Kubernetes ─────────────────────────────────────────────────────────────
  {
    mailing_list_uid: 'ml-k8s-dev-001',
    title: 'Kubernetes Dev',
    description: 'Primary development mailing list for the Kubernetes project. Covers SIG updates, release planning, and architectural discussions.',
    type: MailingListType.DISCUSSION_OPEN,
    audience_access: MailingListAudienceAccess.PUBLIC,
    project_uid: 'proj-k8s-001',
    project_name: 'Kubernetes',
    project_slug: 'kubernetes',
    service_uid: 'svc-k8s-001',
    subscriber_count: 9201,
    subscribed: true,
    member_uid: 'member-k8s-dev-001',
  },
  {
    mailing_list_uid: 'ml-k8s-security-001',
    title: 'Kubernetes Security Discuss',
    description: 'Security vulnerability reports, CVE disclosures, and security hardening discussions for Kubernetes and its ecosystem.',
    type: MailingListType.DISCUSSION_MODERATED,
    audience_access: MailingListAudienceAccess.APPROVAL_REQUIRED,
    project_uid: 'proj-k8s-001',
    project_name: 'Kubernetes',
    project_slug: 'kubernetes',
    service_uid: 'svc-k8s-001',
    subscriber_count: 2134,
    subscribed: false,
  },
  {
    mailing_list_uid: 'ml-k8s-release-001',
    title: 'Kubernetes Release',
    description: 'Coordination list for Kubernetes release teams. Includes milestone updates, freeze notices, and release candidate announcements.',
    type: MailingListType.ANNOUNCEMENT,
    audience_access: MailingListAudienceAccess.PUBLIC,
    project_uid: 'proj-k8s-001',
    project_name: 'Kubernetes',
    project_slug: 'kubernetes',
    service_uid: 'svc-k8s-001',
    subscriber_count: 5670,
    subscribed: false,
  },

  // ── OpenTelemetry ──────────────────────────────────────────────────────────
  {
    mailing_list_uid: 'ml-otel-dev-001',
    title: 'OpenTelemetry Dev',
    description: 'Development discussion for the OpenTelemetry project. Covers specification changes, SDK implementation, and SIG coordination.',
    type: MailingListType.DISCUSSION_OPEN,
    audience_access: MailingListAudienceAccess.PUBLIC,
    project_uid: 'proj-otel-001',
    project_name: 'OpenTelemetry',
    project_slug: 'opentelemetry',
    service_uid: 'svc-otel-001',
    subscriber_count: 3456,
    subscribed: false,
  },
  {
    mailing_list_uid: 'ml-otel-announce-001',
    title: 'OpenTelemetry Announcements',
    description: 'Release announcements, project milestones, and community news for the OpenTelemetry ecosystem.',
    type: MailingListType.ANNOUNCEMENT,
    audience_access: MailingListAudienceAccess.PUBLIC,
    project_uid: 'proj-otel-001',
    project_name: 'OpenTelemetry',
    project_slug: 'opentelemetry',
    service_uid: 'svc-otel-001',
    subscriber_count: 7823,
    subscribed: true,
    member_uid: 'member-otel-ann-001',
  },

  // ── Linux Kernel ───────────────────────────────────────────────────────────
  {
    mailing_list_uid: 'ml-lkml-001',
    title: 'Linux Kernel Mailing List',
    description: 'The primary discussion forum for Linux kernel development. Patches, bug reports, and design discussions for the Linux kernel.',
    type: MailingListType.DISCUSSION_OPEN,
    audience_access: MailingListAudienceAccess.PUBLIC,
    project_uid: 'proj-kernel-001',
    project_name: 'Linux Kernel',
    project_slug: 'linux-kernel',
    service_uid: 'svc-kernel-001',
    subscriber_count: 28450,
    subscribed: false,
  },
  {
    mailing_list_uid: 'ml-kernel-security-001',
    title: 'Kernel Security',
    description: 'Coordinated security vulnerability disclosure and fix coordination for the Linux kernel.',
    type: MailingListType.DISCUSSION_MODERATED,
    audience_access: MailingListAudienceAccess.INVITE_ONLY,
    project_uid: 'proj-kernel-001',
    project_name: 'Linux Kernel',
    project_slug: 'linux-kernel',
    service_uid: 'svc-kernel-001',
    subscriber_count: 412,
    subscribed: false,
  },
];
