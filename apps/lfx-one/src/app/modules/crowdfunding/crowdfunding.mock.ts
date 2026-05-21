// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { environment } from '@environments/environment';
import { FundType } from '@lfx-one/shared/enums';
import { CrowdfundingInitiative, CrowdfundingInitiativeDetail } from '@lfx-one/shared/interfaces';

export const MOCK_INITIATIVES: CrowdfundingInitiative[] = [
  {
    id: 'otel',
    name: 'OpenTelemetry Community Fund',
    description: 'Growing the observability standard for cloud-native software',
    icon: '📡',
    fundType: FundType.GENERAL_FUND,
    status: 'active',
    raised: 68000,
    goal: 175000,
    sponsorsCount: 94,
    publicUrl: environment.urls.crowdfunding,
  },
  {
    id: 'zephyr',
    name: 'Zephyr RTOS Security Hardening',
    description: 'Securing the real-time OS powering billions of IoT devices',
    icon: '⚡',
    fundType: FundType.SECURITY_AUDIT,
    status: 'active',
    raised: 52000,
    goal: 200000,
    sponsorsCount: 41,
    publicUrl: environment.urls.crowdfunding,
  },
  {
    id: 'lkm',
    name: 'Linux Kernel Mentorship Fund',
    description: 'Supporting contributors entering the Linux kernel ecosystem',
    icon: '🌱',
    fundType: FundType.MENTORSHIP,
    status: 'pending',
    raised: 0,
    goal: null,
    sponsorsCount: 0,
  },
];

export const MOCK_INITIATIVE_DETAIL: CrowdfundingInitiativeDetail = {
  id: 'otel',
  name: 'OpenTelemetry Community Fund',
  description: 'Growing the observability standard for cloud-native software.',
  icon: '📡',
  fundType: FundType.GENERAL_FUND,
  status: 'active',
  raised: 68000,
  goal: 175000,
  sponsorsCount: 94,
  publicUrl: environment.urls.crowdfunding,
  about:
    'Funds maintainer stipends, CI/CD infrastructure, community events, and documentation for the OpenTelemetry project — the emerging standard for distributed tracing and observability.',
  balance: 23000,
  monthlyDelta: 3200,
  tags: ['Observability', 'Cloud Native', 'CNCF'],
  alloc: [
    { name: 'Maintainer Stipends', spent: 28000, total: 70000, pct: 40 },
    { name: 'Infrastructure & CI', spent: 12000, total: 40000, pct: 30 },
    { name: 'Community Events', spent: 5000, total: 35000, pct: 14 },
    { name: 'Documentation', spent: 0, total: 30000, pct: 0 },
  ],
  donationsIn: [
    { who: 'Google Cloud', org: true, amount: 15000, date: 'May 8, 2026' },
    { who: 'Cisco', org: true, amount: 5000, date: 'May 1, 2026' },
    { who: 'Microsoft', org: true, amount: 10000, date: 'Apr 2, 2026' },
    { who: 'Sarah Chen', amount: 250, date: 'Apr 14, 2026' },
    { who: 'Intel', org: true, amount: 8000, date: 'Mar 15, 2026' },
    { who: 'Red Hat', org: true, amount: 4750, date: 'Feb 20, 2026' },
  ],
  donationsOut: [
    { who: 'Maintainer Stipends — Q1', amount: 12000, date: 'Mar 31, 2026' },
    { who: 'Infrastructure — DigitalOcean', amount: 4000, date: 'Apr 18, 2026' },
    { who: 'KubeCon Community Meetup', amount: 5000, date: 'Mar 22, 2026' },
  ],
};
