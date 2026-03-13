// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { CommitteeController } from '../controllers/committee.controller';

const router = Router();
const committeeController = new CommitteeController();

// GET /public/api/committees/:id - get a single public committee by ID
router.get('/:id', (req, res, next) => committeeController.getPublicCommitteeById(req, res, next));

export default router;
