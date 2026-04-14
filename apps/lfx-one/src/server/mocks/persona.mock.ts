// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { PersonaApiResponse } from '@lfx-one/shared/interfaces';

/**
 * Mock persona response for local development.
 * Enable by setting MOCK_PERSONAS=true in your .env file.
 *
 * Covers the key UI scenarios:
 * - 3 foundations (multi-foundation)
 * - 5 child projects across them (multi-project)
 * - Mixed personas: board-member (CNCF), maintainer (Kubernetes, Prometheus), contributor (rest)
 */
export const MOCK_PERSONA_RESPONSE: PersonaApiResponse = {
  personas: ['board-member', 'maintainer', 'contributor'],
  multiFoundation: true,
  multiProject: true,
  error: null,

  personaProjects: {
    'board-member': [
      {
        projectUid: 'cncf-uid',
        projectSlug: 'cncf',
        projectName: 'Cloud Native Computing Foundation',
      },
    ],
    maintainer: [
      {
        projectUid: 'kubernetes-uid',
        projectSlug: 'kubernetes',
        projectName: 'Kubernetes',
      },
      {
        projectUid: 'prometheus-uid',
        projectSlug: 'prometheus',
        projectName: 'Prometheus',
      },
    ],
    contributor: [
      {
        projectUid: 'envoy-uid',
        projectSlug: 'envoy',
        projectName: 'Envoy',
      },
      {
        projectUid: 'linux-kernel-uid',
        projectSlug: 'linux-kernel',
        projectName: 'Linux Kernel',
      },
      {
        projectUid: 'sigstore-uid',
        projectSlug: 'sigstore',
        projectName: 'Sigstore',
      },
      {
        projectUid: 'openssf-uid',
        projectSlug: 'openssf',
        projectName: 'Open Source Security Foundation',
      },
    ],
  },

  organizations: [],

  projects: [
    // ── Cloud Native Computing Foundation (CNCF) ─────────────────────────────
    // Foundation node (parentProjectUid: null)
    {
      projectUid: 'cncf-uid',
      projectSlug: 'cncf',
      projectName: 'Cloud Native Computing Foundation',
      parentProjectUid: null,
      logoUrl: 'https://landscape.cncf.io/logos/cncf.svg',
      description: 'Hosts critical components of the global technology infrastructure.',
      detections: [{ source: 'board_member' }],
      personas: ['board-member'],
      isFoundation: true,
    },
    // Child projects of CNCF
    {
      projectUid: 'kubernetes-uid',
      projectSlug: 'kubernetes',
      projectName: 'Kubernetes',
      parentProjectUid: 'cncf-uid',
      logoUrl: 'https://raw.githubusercontent.com/kubernetes/kubernetes/master/logo/logo.png',
      description: 'Production-Grade Container Scheduling and Management.',
      detections: [{ source: 'cdp_roles', extra: { roles: [{ role: 'Maintainer' }] } }],
      personas: ['maintainer'],
      isFoundation: false,
    },
    {
      projectUid: 'prometheus-uid',
      projectSlug: 'prometheus',
      projectName: 'Prometheus',
      parentProjectUid: 'cncf-uid',
      logoUrl: null,
      description: 'Power your metrics and alerting with a leading open-source monitoring solution.',
      detections: [{ source: 'cdp_roles', extra: { roles: [{ role: 'Maintainer' }] } }],
      personas: ['maintainer'],
      isFoundation: false,
    },
    {
      projectUid: 'envoy-uid',
      projectSlug: 'envoy',
      projectName: 'Envoy',
      parentProjectUid: 'cncf-uid',
      logoUrl: null,
      description: 'Cloud-native high-performance edge/middle/service proxy.',
      detections: [{ source: 'github_contribution' }],
      personas: ['contributor'],
      isFoundation: false,
    },

    // ── The Linux Foundation ──────────────────────────────────────────────────
    // Foundation node
    {
      projectUid: 'lf-uid',
      projectSlug: 'linux-foundation',
      projectName: 'The Linux Foundation',
      parentProjectUid: null,
      logoUrl: null,
      description: 'Home of Linux, Node.js and other mission critical projects.',
      detections: [{ source: 'github_contribution' }],
      personas: ['contributor'],
      isFoundation: true,
    },
    // Child project under LF
    {
      projectUid: 'linux-kernel-uid',
      projectSlug: 'linux-kernel',
      projectName: 'Linux Kernel',
      parentProjectUid: 'lf-uid',
      logoUrl: null,
      description: 'The Linux kernel is a free and open-source, monolithic, modular, multitasking, Unix-like operating system kernel.',
      detections: [{ source: 'github_contribution' }],
      personas: ['contributor'],
      isFoundation: false,
    },

    // ── Open Source Security Foundation (OpenSSF) ────────────────────────────
    // Foundation node
    {
      projectUid: 'openssf-uid',
      projectSlug: 'openssf',
      projectName: 'Open Source Security Foundation',
      parentProjectUid: null,
      logoUrl: null,
      description: 'Improving the security of open source software.',
      detections: [{ source: 'github_contribution' }],
      personas: ['contributor'],
      isFoundation: true,
    },
    // Child project under OpenSSF
    {
      projectUid: 'sigstore-uid',
      projectSlug: 'sigstore',
      projectName: 'Sigstore',
      parentProjectUid: 'openssf-uid',
      logoUrl: null,
      description: 'A new standard for signing, verifying and protecting software.',
      detections: [{ source: 'github_contribution' }],
      personas: ['contributor'],
      isFoundation: false,
    },
  ],
};
