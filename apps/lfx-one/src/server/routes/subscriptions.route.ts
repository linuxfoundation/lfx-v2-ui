// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { SubscriptionController } from '../controllers/subscription.controller';

const router = Router();

const subscriptionController = new SubscriptionController();

// GET /api/subscriptions?email=...
router.get('/', (req, res, next) => subscriptionController.getUserSubscriptions(req, res, next));

// POST /api/subscriptions/:mailingListId/subscribe
router.post('/:mailingListId/subscribe', (req, res, next) => subscriptionController.subscribe(req, res, next));

// DELETE /api/subscriptions/:mailingListId/members/:memberId
router.delete('/:mailingListId/members/:memberId', (req, res, next) => subscriptionController.unsubscribe(req, res, next));

export default router;
