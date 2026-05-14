// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { OrgLensFoundationsController } from '../controllers/org-lens-foundations.controller';

const router = Router();

const orgLensFoundationsController = new OrgLensFoundationsController();

// GET /api/orgs/:accountId/lens/foundations-and-projects
router.get('/:accountId/lens/foundations-and-projects', (req, res, next) => orgLensFoundationsController.getFoundationsAndProjects(req, res, next));

export default router;
