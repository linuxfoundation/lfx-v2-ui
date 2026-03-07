// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response, Router } from 'express';

import { CommitteeController } from '../controllers/committee.controller';

const router = Router();
const committeeController = new CommitteeController();

// GET /public/api/committees — list all public committees (no auth required)
router.get('/', (req: Request, res: Response, next: NextFunction) => committeeController.getCommittees(req, res, next));

export default router;
