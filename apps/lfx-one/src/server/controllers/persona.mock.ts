// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { PersonaApiResponse } from '@lfx-one/shared/interfaces';

const LF_UID = 'mock-foundation-lf';
const CNCF_UID = 'mock-foundation-cncf';
const K8S_UID = 'mock-project-k8s';
const PROM_UID = 'mock-project-prometheus';
const OTEL_UID = 'mock-project-otel';

export const MOCK_PERSONA_RESPONSE: PersonaApiResponse = {
  personas: ['executive-director', 'maintainer'],
  error: null,
  isRootWriter: false,
  organizations: [],
  projects: [
    {
      projectUid: LF_UID,
      projectSlug: 'the-linux-foundation',
      projectName: 'The Linux Foundation',
      parentProjectUid: null,
      isFoundation: true,
      logoUrl: 'https://cdn.platform.linuxfoundation.org/projects/the-linux-foundation.svg',
      description: 'The Linux Foundation is the organization of choice for the world\'s top developers and companies to build ecosystems that accelerate open technology development.',
      detections: [{ source: 'executive_director' }],
      personas: ['executive-director'],
    },
    {
      projectUid: CNCF_UID,
      projectSlug: 'cncf',
      projectName: 'Cloud Native Computing Foundation',
      parentProjectUid: LF_UID,
      isFoundation: true,
      logoUrl: 'https://cdn.platform.linuxfoundation.org/projects/cncf.svg',
      description: 'CNCF serves as the vendor-neutral home for many of the fastest-growing open source projects, including Kubernetes, Prometheus, and Envoy.',
      detections: [
        {
          source: 'board_member',
          extra: { role: 'Executive Director', voting_status: 'Voting' },
        },
      ],
      personas: ['executive-director'],
    },
    {
      projectUid: K8S_UID,
      projectSlug: 'kubernetes',
      projectName: 'Kubernetes',
      parentProjectUid: CNCF_UID,
      isFoundation: false,
      logoUrl: 'https://cdn.platform.linuxfoundation.org/projects/kubernetes.svg',
      description: 'Production-Grade Container Scheduling and Management.',
      detections: [{ source: 'maintainer' }],
      personas: ['maintainer'],
    },
    {
      projectUid: PROM_UID,
      projectSlug: 'prometheus',
      projectName: 'Prometheus',
      parentProjectUid: CNCF_UID,
      isFoundation: false,
      logoUrl: 'https://cdn.platform.linuxfoundation.org/projects/prometheus.svg',
      description: 'The Prometheus monitoring system and time series database.',
      detections: [{ source: 'maintainer' }],
      personas: ['maintainer'],
    },
    {
      projectUid: OTEL_UID,
      projectSlug: 'opentelemetry',
      projectName: 'OpenTelemetry',
      parentProjectUid: CNCF_UID,
      isFoundation: false,
      logoUrl: 'https://cdn.platform.linuxfoundation.org/projects/opentelemetry.svg',
      description: 'High-quality, ubiquitous, and portable telemetry to enable effective observability.',
      detections: [{ source: 'maintainer' }],
      personas: ['maintainer'],
    },
  ],
  personaProjects: {
    'executive-director': [
      { projectUid: LF_UID, projectSlug: 'the-linux-foundation', projectName: 'The Linux Foundation' },
      { projectUid: CNCF_UID, projectSlug: 'cncf', projectName: 'Cloud Native Computing Foundation' },
    ],
    maintainer: [
      { projectUid: K8S_UID, projectSlug: 'kubernetes', projectName: 'Kubernetes' },
      { projectUid: PROM_UID, projectSlug: 'prometheus', projectName: 'Prometheus' },
      { projectUid: OTEL_UID, projectSlug: 'opentelemetry', projectName: 'OpenTelemetry' },
    ],
  },
};
