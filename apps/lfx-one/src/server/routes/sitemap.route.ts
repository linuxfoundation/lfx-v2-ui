// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import express, { Request, Response, Router } from 'express';

import { logger } from '../services/logger.service';
import { docsContentService } from '../services/docs-content.service';

const router: Router = express.Router();

const BASE_URL = (process.env['APP_URL'] ?? 'https://app.lfx.dev').replace(/\/+$/, '');

/** Escape the five XML special characters to prevent invalid XML or injection. */
function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

router.get('/', (req: Request, res: Response) => {
  const startTime = logger.startOperation(req, 'generate_sitemap');
  try {
    const entries = docsContentService.getSitemap();
    const urls = entries
      .map(
        (e) => `  <url>
    <loc>${escapeXml(BASE_URL + e.path)}</loc>
    <lastmod>${escapeXml(e.lastmod)}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`
      )
      .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    logger.success(req, 'generate_sitemap', startTime, { url_count: entries.length });
    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (err) {
    logger.error(req, 'generate_sitemap', startTime, err);
    res.status(500).setHeader('Content-Type', 'application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<error>Failed to generate sitemap</error>`);
  }
});

export default router;
