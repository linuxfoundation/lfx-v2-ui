// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response, Router } from 'express';

import { ProjectController } from '../controllers/project.controller';

const router = Router();
const projectController = new ProjectController();

// GET /public/api/projects — list projects (no auth required)
router.get('/', (req: Request, res: Response, next: NextFunction) => projectController.getProjects(req, res, next));

export default router;
