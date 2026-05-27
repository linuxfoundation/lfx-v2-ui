// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import express, { Request, Response, Router } from 'express';

import { isValidSlug } from '@lfx-one/shared/utils';

import { serverLogger } from '../server-logger';
import { docsContentService } from '../services/docs-content.service';

const router: Router = express.Router();

// GET /public/api/docs — section tree (landing nav + sidebar)
router.get('/', (_req: Request, res: Response) => {
  try {
    const sections = docsContentService.listSections();
    res.json({ sections });
  } catch (err) {
    serverLogger.error({ err }, 'docs: failed to list sections');
    res.status(500).json({ error: 'Failed to load documentation index' });
  }
});

// GET /public/api/docs/:section — section overview article
router.get('/:section', (req: Request, res: Response) => {
  const { section } = req.params;
  if (!isValidSlug(section)) {
    res.status(400).json({ error: 'Invalid section slug' });
    return;
  }
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
  if (!isValidSlug(section) || !isValidSlug(topic)) {
    res.status(400).json({ error: 'Invalid slug' });
    return;
  }
  const article = docsContentService.getArticle([section, topic]);
  if (!article) {
    res.status(404).json({ error: 'Article not found' });
    return;
  }
  res.json(article);
});

export default router;
