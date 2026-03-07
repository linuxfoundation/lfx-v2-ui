// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { PublicCommitteeController } from '../controllers/public-committee.controller';

const router = Router();
const publicCommitteeController = new PublicCommitteeController();

// GET /public/api/committees - list all public committees (no auth required)
router.get('/', (req, res, next) => publicCommitteeController.getPublicCommittees(req, res, next));

export default router;
