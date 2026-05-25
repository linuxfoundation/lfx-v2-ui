// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { BackendInitiative } from '../types/crowdfunding.types';

export const MOCK_INITIATIVES: BackendInitiative[] = [
  {
    id: 'b3f2c1a0-1111-4aaa-8bbb-c0d0e0f01234',
    initiative_type: 'general_fund',
    owner_id: 'org-opentelemetry',
    name: 'OpenTelemetry Community Fund',
    slug: 'opentelemetry',
    status: 'active',
    description: 'Growing the observability standard for cloud-native software',
    color: '#f5a623',
    logo_url: 'https://cdn.linuxfoundation.org/img/projects/opentelemetry.svg',
    website_url: 'https://opentelemetry.io',
    created_on: '2024-01-15T00:00:00Z',
    updated_on: '2026-05-01T00:00:00Z',
    financials: {
      total_raised_cents: 6800000,
      supporters: 94,
      goals_total_cents: 17500000,
      total_disbursed_cents: 4500000,
      available_balance_cents: 2300000,
    },
  },
  {
    id: 'b3f2c1a0-2222-4aaa-8bbb-c0d0e0f05678',
    initiative_type: 'security_audit',
    owner_id: 'org-zephyr',
    name: 'Zephyr RTOS Security Hardening',
    slug: 'zephyr-security',
    status: 'active',
    description: 'Securing the real-time OS powering billions of IoT devices',
    color: '#f5a623',
    logo_url: 'https://cdn.linuxfoundation.org/img/projects/zephyr.svg',
    website_url: 'https://zephyrproject.org',
    created_on: '2024-03-10T00:00:00Z',
    updated_on: '2026-04-20T00:00:00Z',
    financials: {
      total_raised_cents: 5200000,
      supporters: 41,
      goals_total_cents: 20000000,
      total_disbursed_cents: 1800000,
      available_balance_cents: 3400000,
    },
  },
  {
    id: 'b3f2c1a0-3333-4aaa-8bbb-c0d0e0f09012',
    initiative_type: 'mentorship',
    owner_id: 'org-linux-kernel',
    name: 'Linux Kernel Mentorship Fund',
    slug: 'linux-kernel-mentorship',
    status: 'pending',
    description: 'Supporting contributors entering the Linux kernel ecosystem',
    color: '#417cff',
    logo_url: 'https://cdn.linuxfoundation.org/img/projects/linux-kernel.svg',
    website_url: 'https://kernel.org',
    created_on: '2026-04-01T00:00:00Z',
    updated_on: '2026-05-10T00:00:00Z',
    financials: {
      total_raised_cents: 0,
      supporters: 0,
      goals_total_cents: 0,
    },
  },
];
