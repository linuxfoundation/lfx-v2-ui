// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { PushController } from '../controllers/push.controller';

const router = Router();
const controller = new PushController();

router.get('/public-key', controller.getPublicKey);
router.post('/subscribe', controller.subscribe);
router.post('/unsubscribe', controller.unsubscribe);
router.post('/test', controller.sendTest);
router.post('/notify', controller.notify);

export default router;
