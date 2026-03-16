// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { PublicMailingListController } from '../controllers/public-mailing-list.controller';

const router = Router();
const publicMailingListController = new PublicMailingListController();

// POST /public/api/mailing-lists/:id/subscribe - subscribe to a public mailing list (public access, no authentication required)
router.post('/:id/subscribe', (req, res, next) => publicMailingListController.subscribe(req, res, next));

export default router;
