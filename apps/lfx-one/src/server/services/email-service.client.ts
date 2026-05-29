// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// This file is intentionally empty. The Express layer no longer talks directly
// to lfx-v2-email-service — all email delivery and engagement queries are now
// owned by lfx-v2-newsletter-service, which calls the email-service NATS
// subjects from Go. See apps/lfx-one/src/server/services/newsletter.service.ts.
export {};
