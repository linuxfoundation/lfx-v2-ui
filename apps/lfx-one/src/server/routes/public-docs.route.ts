// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import express, { Request, Response, Router } from 'express';

import { logger } from '../services/logger.service';
import { docsContentService } from '../services/docs-content.service';

const router: Router = express.Router();

// GET /public/api/docs — section tree (landing nav + sidebar)
router.get('/', (_req: Request, res: Response) => {
  try {
    const sections = docsContentService.listSections();
    res.json({ sections });
  } catch (err) {
    logger.error({ err }, 'docs: failed to list sections');
    res.status(500).json({ error: 'Failed to load documentation index' });
  }
});

// GET /public/api/docs/:section — section overview article
router.get('/:section', (req: Request, res: Response) => {
  const { section } = req.params;
  const article = docsContentService.getArticle([section]);
  if (!article) {
    res.status(404).json({ error: 'Section not found' });
    return;
  }
  res.json(article);
});

// GET /public/api/docs/:section/:topic — topic article
router.get('/:section/:topic', (req: Request, res: Response) => {
  const { section, topic } = req.params;
  const article = docsContentService.getArticle([section, topic]);
  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }
  res.json(article);
});

export default router;
