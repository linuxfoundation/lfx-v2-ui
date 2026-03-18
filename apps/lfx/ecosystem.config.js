// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

module.exports = {
  apps: [
    {
      name: 'lfx',
      script: 'dist/lfx/server/server.mjs',
      env: {
        PM2: 'true',
        NODE_ENV: 'production',
        PORT: 4201,
      },
      max_restarts: 10,
      exp_backoff_restart_delay: 100,
      watch: false,
      autorestart: true,
      instances: 1,
      exec_mode: 'cluster',
    },
  ],
};
