// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { CommitteeController } from '../controllers/committee.controller';

const router = Router();
const committeeController = new CommitteeController();

// GET /public/api/committees — list public committees (optionally filtered by ?project_uid=)
router.get('/', (req, res, next) => committeeController.getPublicCommittees(req, res, next));

export default router;
