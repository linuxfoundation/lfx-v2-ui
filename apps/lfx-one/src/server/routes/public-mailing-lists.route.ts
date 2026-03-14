// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { PublicMailingListController } from '../controllers/public-mailing-list.controller';
import { createRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();
const publicMailingListController = new PublicMailingListController();

// Rate limiter: 10 requests per 15 minutes per IP
const subscribeRateLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
  message: 'Too many subscription requests. Please try again later.',
});

// POST /public/api/mailing-lists/:id/subscribe - subscribe to a public mailing list (public access, no authentication required)
router.post('/:id/subscribe', subscribeRateLimiter, (req, res, next) => publicMailingListController.subscribe(req, res, next));

export default router;
