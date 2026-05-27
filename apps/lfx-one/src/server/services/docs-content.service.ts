// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import DOMPurify from 'isomorphic-dompurify';
import matter from 'gray-matter';
import { marked } from 'marked';

import { isValidSlug, isValidSlugParts } from '@lfx-one/shared/utils';

import { logger } from './logger.service';

export interface DocFrontmatter {
  title: string;
  description: string;
  product_area: string;
  audience?: string[];
  tags?: string[];
  last_updated?: string;
  intercom_collection?: string;
}

export interface DocTopic {
  slug: string;
  title: string;
  description: string;
  path: string;
  lastmod: string;
}

export interface DocSection {
  slug: string;
  title: string;
  description: string;
  topics: DocTopic[];
  lastmod: string;
}

export interface DocArticle {
  frontmatter: DocFrontmatter;
  html: string;
  slug: string[];
  breadcrumbs: { label: string; path: string }[];
}

export interface DocSitemapEntry {
  path: string;
  lastmod: string;
}

const serverDistFolder = fileURLToPath(new URL('.', import.meta.url));

/**
 * Locate the docs/enduser content directory. Returns null when no candidate
 * path exists — this happens during Angular's SSR route-extraction step, where
 * `import.meta.url` resolves to a temp compilation directory and the dist tree
 * has not yet been materialised. In that build-time context every public method
 * falls back to an empty/null response so extraction completes without error.
 *
 * Path resolution order (first match wins):
 *  1. Prod   — dist/browser/docs-enduser (Angular assets pipeline output)
 *  2. Dev/CWD — process.cwd()/../../docs/enduser (works when cwd = apps/lfx-one
 *               as set by the Yarn workspace / Turbo runner)
 *  3. Dev/URL — import.meta.url-relative ../../../../docs/enduser (fallback for
 *               environments where the server bundle is deeper in the dist tree)
 */
function resolveDocsRoot(): string | null {
  // 1. Production: files are bundled into the browser dist under /docs-enduser
  const prodPath = resolve(serverDistFolder, '../browser/docs-enduser');
  if (existsSync(prodPath)) {
    return prodPath;
  }
  // 2. Development (Yarn workspace / Turbo): process.cwd() = apps/lfx-one
  const cwdPath = resolve(process.cwd(), '../../docs/enduser');
  if (existsSync(cwdPath)) {
    return cwdPath;
  }
  // 3. Development (import.meta.url relative): server bundle under dist/…/server/
  const devPath = resolve(serverDistFolder, '../../../../docs/enduser');
  if (existsSync(devPath)) {
    return devPath;
  }
  // Build-time: no docs directory reachable; caller will return empty data.
  logger.warning(undefined, 'resolve_docs_root', 'docs/enduser not found — running in build-time mode, serving empty');
  return null;
}

/**
 * Read and parse a markdown file's YAML frontmatter and body.
 *
 * @param docsRoot - The resolved docs root directory (used as a path-containment
 *   guard — any `filePath` that does not reside inside `docsRoot` is rejected
 *   so path-traversal is impossible even if a caller passes a tainted value).
 * @param filePath - Absolute path to an `index.md` file inside `docsRoot`.
 */
function readFrontmatter(docsRoot: string, filePath: string): { frontmatter: DocFrontmatter; content: string } | null {
  // Path-containment guard: reject any path that escapes the docs root.
  // This is the last line of defence against path traversal — callers such as
  // getArticle() already validate slugs and check containment, but having the
  // check here as well satisfies static-analysis tools (e.g. CodeQL
  // js/path-injection) that require sanitisation to be co-located with the
  // readFileSync call.
  if (!filePath.startsWith(`${docsRoot}${sep}`)) {
    return null;
  }
  const startTime = Date.now();
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const fm = parsed.data as DocFrontmatter;
    if (!fm.title || !fm.description) {
      logger.warning(undefined, 'read_frontmatter', 'article missing required frontmatter fields (title, description)', { filePath });
    }
    // gray-matter/js-yaml parses unquoted YAML timestamps (e.g. `last_updated: 2026-05-22`)
    // as JS Date objects. Normalise to YYYY-MM-DD string so downstream serialisation
    // (sitemap, JSON API) always emits a valid ISO date rather than a verbose Date.toString().
    if ((fm.last_updated as unknown) instanceof Date) {
      fm.last_updated = (fm.last_updated as unknown as Date).toISOString().slice(0, 10);
    } else if (fm.last_updated !== undefined) {
      fm.last_updated = String(fm.last_updated).slice(0, 10);
    }
    return { frontmatter: fm, content: parsed.content };
  } catch (err) {
    logger.error(undefined, 'read_frontmatter', startTime, err, { filePath });
    return null;
  }
}

// Add rel="noopener noreferrer" to any <a target="_blank"> links that survive
// DOMPurify sanitisation — defends against reverse-tabnabbing when contributors
// include inline HTML in markdown. Applied once at module load (not per request).
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

function renderMarkdown(content: string): string {
  // Pass `async: false` explicitly to pin synchronous behaviour regardless of
  // any process-global `marked.use(...)` extensions added in the future.
  const rawHtml = marked.parse(content, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml);
}

let _sectionCache: DocSection[] | null = null;
// Article cache — keyed by slugParts.join('/').  In production, articles are
// immutable until the process restarts; in development the cache is cleared on
// every request (same policy as _sectionCache) so edits are reflected
// immediately without a server restart.
const _articleCache = new Map<string, DocArticle>();

export class DocsContentService {
  // In production this is set once at construction time (fast path).
  // In development it starts as null and is re-resolved on the first
  // successful request — avoids a race where Angular's dev server starts
  // the SSR process before browser assets are fully written to disk.
  private docsRoot: string | null;

  public constructor() {
    this.docsRoot = resolveDocsRoot();
  }

  public listSections(): DocSection[] {
    const docsRoot = this.getDocsRoot();
    if (!docsRoot) {
      return [];
    }

    // In development, skip the cache so file edits are reflected immediately
    // without a restart. Directory mtime is unreliable for tracking edits to
    // individual markdown files. The check is opt-in (=== 'development') rather
    // than opt-out (!== 'production') so that deployments with an unset NODE_ENV
    // still benefit from caching instead of re-reading 50+ files per request.
    const isDev = process.env['NODE_ENV'] === 'development';
    if (isDev) {
      _sectionCache = null;
    }

    if (_sectionCache) {
      return _sectionCache;
    }

    const sections: DocSection[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Sort alphabetically so section/topic order is deterministic across filesystems.
    const entries = readdirSync(docsRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sectionSlug = entry.name;
      // Skip non-slug directory names (e.g. .git, __MACOSX, node_modules).
      if (!isValidSlug(sectionSlug)) continue;
      const sectionIndex = join(docsRoot, sectionSlug, 'index.md');
      if (!existsSync(sectionIndex)) continue;

      const sectionMeta = readFrontmatter(docsRoot, sectionIndex);
      if (!sectionMeta) continue;

      const topics: DocTopic[] = [];
      const topicEntries = readdirSync(join(docsRoot, sectionSlug), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
      for (const topicEntry of topicEntries) {
        if (!topicEntry.isDirectory()) continue;
        const topicSlug = topicEntry.name;
        if (!isValidSlug(topicSlug)) continue;
        const topicIndex = join(docsRoot, sectionSlug, topicSlug, 'index.md');
        if (!existsSync(topicIndex)) continue;
        const topicMeta = readFrontmatter(docsRoot, topicIndex);
        if (!topicMeta) continue;
        topics.push({
          slug: topicSlug,
          title: topicMeta.frontmatter.title ?? topicSlug,
          description: topicMeta.frontmatter.description ?? '',
          path: `/docs/${sectionSlug}/${topicSlug}`,
          lastmod: topicMeta.frontmatter.last_updated ?? today,
        });
      }

      sections.push({
        slug: sectionSlug,
        title: sectionMeta.frontmatter.title ?? sectionSlug,
        description: sectionMeta.frontmatter.description ?? '',
        topics,
        lastmod: sectionMeta.frontmatter.last_updated ?? today,
      });
    }

    _sectionCache = sections;
    return sections;
  }

  public getArticle(slugParts: string[]): DocArticle | null {
    const docsRoot = this.getDocsRoot();
    if (!docsRoot) {
      return null;
    }
    // Validate each slug segment before using in a path expression.
    if (!isValidSlugParts(slugParts)) {
      return null;
    }

    // Article cache — same prod/dev policy as _sectionCache.
    const cacheKey = slugParts.join('/');
    const isDev = process.env['NODE_ENV'] === 'development';
    if (!isDev) {
      const cached = _articleCache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const filePath = resolve(docsRoot, ...slugParts, 'index.md');
    // Prevent path traversal: resolved path must stay inside docsRoot.
    if (!filePath.startsWith(`${docsRoot}${sep}`)) {
      return null;
    }
    if (!existsSync(filePath)) {
      return null;
    }
    const result = readFrontmatter(docsRoot, filePath);
    if (!result) return null;

    const html = renderMarkdown(result.content);
    const breadcrumbs: { label: string; path: string }[] = [{ label: 'Help', path: '/docs' }];

    if (slugParts.length >= 1) {
      const sectionIndex = join(docsRoot, slugParts[0], 'index.md');
      const sectionMeta = existsSync(sectionIndex) ? readFrontmatter(docsRoot, sectionIndex) : null;
      breadcrumbs.push({ label: sectionMeta?.frontmatter.title ?? slugParts[0], path: `/docs/${slugParts[0]}` });
    }
    if (slugParts.length >= 2) {
      breadcrumbs.push({ label: result.frontmatter.title, path: `/docs/${slugParts.join('/')}` });
    }

    const article: DocArticle = { frontmatter: result.frontmatter, html, slug: slugParts, breadcrumbs };
    if (!isDev) {
      _articleCache.set(cacheKey, article);
    }
    return article;
  }

  public getSitemap(): DocSitemapEntry[] {
    const sections = this.listSections();
    // Use the most recent section lastmod as the landing page's lastmod.
    const landingLastmod = sections.reduce((max, s) => (s.lastmod > max ? s.lastmod : max), sections[0]?.lastmod ?? new Date().toISOString().split('T')[0]);
    const entries: DocSitemapEntry[] = [{ path: '/docs', lastmod: landingLastmod }];
    for (const section of sections) {
      // Use frontmatter last_updated (stored in section.lastmod) per URL for accurate crawl hints.
      entries.push({ path: `/docs/${section.slug}`, lastmod: section.lastmod });
      for (const topic of section.topics) {
        entries.push({ path: topic.path, lastmod: topic.lastmod });
      }
    }
    return entries;
  }

  /** Returns the docs root, re-probing in dev mode if the constructor missed it. */
  private getDocsRoot(): string | null {
    if (!this.docsRoot && process.env['NODE_ENV'] === 'development') {
      this.docsRoot = resolveDocsRoot();
    }
    return this.docsRoot;
  }
}

export const docsContentService = new DocsContentService();
