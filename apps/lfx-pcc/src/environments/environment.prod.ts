// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export const environment = {
  production: true,
  urls: {
    profile: 'https://openprofile.dev',
  },
  datadog: {
    enabled: true,
    applicationId: process.env['DD_APPLICATION_ID'] || '',
    clientToken: process.env['DD_CLIENT_TOKEN'] || '',
    site: 'datadoghq.com',
    service: 'lfx-projects-self-service',
    env: process.env['DD_ENV'] || 'prod',
  },
};
