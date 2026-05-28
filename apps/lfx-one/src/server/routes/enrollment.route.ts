// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { EnrollmentController } from '../controllers/enrollment.controller';

const router = Router();
const enrollmentController = new EnrollmentController();

router.get('/', (req, res, next) => enrollmentController.getEnrollments(req, res, next));
router.patch('/:id/auto-renew', (req, res, next) => enrollmentController.updateAutoRenew(req, res, next));

export default router;
