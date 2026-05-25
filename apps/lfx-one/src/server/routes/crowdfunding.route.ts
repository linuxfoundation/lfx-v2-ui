// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { Router } from 'express';

import { CrowdfundingController } from '../controllers/crowdfunding.controller';

const router = Router();
const crowdfundingController = new CrowdfundingController();

// /stats must be registered before /:id-style routes to avoid shadowing
router.get('/initiatives/stats', (req, res, next) => crowdfundingController.getInitiativesStats(req, res, next));
router.get('/initiatives', (req, res, next) => crowdfundingController.getMyInitiatives(req, res, next));

export default router;
