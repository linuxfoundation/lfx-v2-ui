// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

export const environment = {
  production: false,
  urls: {
    profile: 'https://myprofile.dev.platform.linuxfoundation.org/',
  },
  datadog: {
    enabled: true,
    applicationId: process.env['DD_APPLICATION_ID'] || '',
    clientToken: process.env['DD_CLIENT_TOKEN'] || '',
    site: 'datadoghq.com',
    service: 'lfx-projects-self-service',
    env: process.env['DD_ENV'] || 'dev',
  },
};
