// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import express, { Request, Response, Router } from 'express';

import { docsContentService } from '../services/docs-content.service';

const router: Router = express.Router();

const BASE_URL = 'https://app.lfx.dev';

router.get('/', (_req: Request, res: Response) => {
  const entries = docsContentService.getSitemap();
  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${BASE_URL}${e.path}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(xml);
});

export default router;
