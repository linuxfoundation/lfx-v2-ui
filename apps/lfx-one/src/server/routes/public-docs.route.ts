// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import express, { Request, Response, Router } from 'express';

import { isValidSlug } from '@lfx-one/shared/utils';

import { logger } from '../services/logger.service';
import { docsContentService } from '../services/docs-content.service';

const router: Router = express.Router();

// Cache-Control budget for public doc API responses:
// - max-age=300  → browsers / private caches may cache for 5 minutes
// - s-maxage=3600 → shared caches (CDN) may cache for 1 hour
// Docs content changes only on deploy, so these TTLs are conservative.
const DOCS_CACHE_CONTROL = 'public, max-age=300, s-maxage=3600';

// GET /public/api/docs — section tree (landing nav + sidebar)
router.get('/', (req: Request, res: Response) => {
  const startTime = logger.startOperation(req, 'list_doc_sections');
  try {
    const sections = docsContentService.listSections();
    res.setHeader('Cache-Control', DOCS_CACHE_CONTROL);
    logger.success(req, 'list_doc_sections', startTime, { count: sections.length });
    res.json({ sections });
  } catch (err) {
    logger.error(req, 'list_doc_sections', startTime, err);
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
  res.setHeader('Cache-Control', DOCS_CACHE_CONTROL);
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
  res.setHeader('Cache-Control', DOCS_CACHE_CONTROL);
  res.json(article);
});

export default router;
