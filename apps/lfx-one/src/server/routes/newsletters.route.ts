// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { NewsletterController } from '../controllers/newsletter.controller';
import { requireExecutiveDirector } from '../middleware/require-executive-director.middleware';

const router = Router();
const newsletterController = new NewsletterController();

router.use(requireExecutiveDirector);

router.post('/recipient-count', (req, res, next) => newsletterController.getRecipientCount(req, res, next));
router.post('/test-send', (req, res, next) => newsletterController.testSend(req, res, next));
router.post('/send', (req, res, next) => newsletterController.send(req, res, next));

export default router;
