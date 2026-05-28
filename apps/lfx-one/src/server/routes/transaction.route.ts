// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Router } from 'express';

import { TransactionController } from '../controllers/transaction.controller';

const router = Router();
const transactionController = new TransactionController();

router.get('/', (req, res, next) => transactionController.getTransactions(req, res, next));

export default router;
