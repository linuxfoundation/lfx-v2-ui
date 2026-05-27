// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import DOMPurify from 'isomorphic-dompurify';
import matter from 'gray-matter';
import { marked } from 'marked';

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
}

export interface DocSection {
  slug: string;
  title: string;
  description: string;
  topics: DocTopic[];
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

function resolveDocsRoot(): string {
  // Production: files are bundled into the browser dist under /docs-enduser
  const prodPath = resolve(serverDistFolder, '../browser/docs-enduser');
  if (existsSync(prodPath)) {
    return prodPath;
  }
  // Development: read directly from the source tree
  const devPath = resolve(serverDistFolder, '../../../../docs/enduser');
  if (existsSync(devPath)) {
    return devPath;
  }
  throw new Error('docs-content: cannot locate docs/enduser directory');
}

function readFrontmatter(filePath: string): { frontmatter: DocFrontmatter; content: string } | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const fm = parsed.data as DocFrontmatter;
    if (!fm.title || !fm.description) {
      logger.warn({ filePath }, 'docs-content: article missing required frontmatter fields (title, description)');
    }
    return { frontmatter: fm, content: parsed.content };
  } catch (err) {
    logger.error({ filePath, err }, 'docs-content: failed to read article');
    return null;
  }
}

function renderMarkdown(content: string): string {
  const rawHtml = marked.parse(content) as string;
  return DOMPurify.sanitize(rawHtml);
}

let _sectionCache: DocSection[] | null = null;
let _sectionCacheMtime: number | null = null;

export class DocsContentService {
  private readonly docsRoot: string;

  constructor() {
    this.docsRoot = resolveDocsRoot();
  }

  listSections(): DocSection[] {
    // In development, invalidate the cache when the directory mtime changes.
    if (process.env['NODE_ENV'] !== 'production') {
      const mtime = statSync(this.docsRoot).mtimeMs;
      if (_sectionCacheMtime !== mtime) {
        _sectionCache = null;
        _sectionCacheMtime = mtime;
      }
    }

    if (_sectionCache) {
      return _sectionCache;
    }

    const sections: DocSection[] = [];

    const entries = readdirSync(this.docsRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sectionSlug = entry.name;
      const sectionIndex = join(this.docsRoot, sectionSlug, 'index.md');
      if (!existsSync(sectionIndex)) continue;

      const sectionMeta = readFrontmatter(sectionIndex);
      if (!sectionMeta) continue;

      const topics: DocTopic[] = [];
      const topicEntries = readdirSync(join(this.docsRoot, sectionSlug), { withFileTypes: true });
      for (const topicEntry of topicEntries) {
        if (!topicEntry.isDirectory()) continue;
        const topicSlug = topicEntry.name;
        const topicIndex = join(this.docsRoot, sectionSlug, topicSlug, 'index.md');
        if (!existsSync(topicIndex)) continue;
        const topicMeta = readFrontmatter(topicIndex);
        if (!topicMeta) continue;
        topics.push({
          slug: topicSlug,
          title: topicMeta.frontmatter.title ?? topicSlug,
          description: topicMeta.frontmatter.description ?? '',
          path: `/docs/${sectionSlug}/${topicSlug}`,
        });
      }

      sections.push({
        slug: sectionSlug,
        title: sectionMeta.frontmatter.title ?? sectionSlug,
        description: sectionMeta.frontmatter.description ?? '',
        topics,
      });
    }

    _sectionCache = sections;
    return sections;
  }

  getArticle(slugParts: string[]): DocArticle | null {
    const filePath = join(this.docsRoot, ...slugParts, 'index.md');
    if (!existsSync(filePath)) {
      return null;
    }
    const result = readFrontmatter(filePath);
    if (!result) return null;

    const html = renderMarkdown(result.content);
    const breadcrumbs: { label: string; path: string }[] = [{ label: 'Help', path: '/docs' }];

    if (slugParts.length >= 1) {
      const sectionIndex = join(this.docsRoot, slugParts[0], 'index.md');
      const sectionMeta = existsSync(sectionIndex) ? readFrontmatter(sectionIndex) : null;
      breadcrumbs.push({ label: sectionMeta?.frontmatter.title ?? slugParts[0], path: `/docs/${slugParts[0]}` });
    }
    if (slugParts.length >= 2) {
      breadcrumbs.push({ label: result.frontmatter.title, path: `/docs/${slugParts.join('/')}` });
    }

    return { frontmatter: result.frontmatter, html, slug: slugParts, breadcrumbs };
  }

  getSitemap(): DocSitemapEntry[] {
    const entries: DocSitemapEntry[] = [{ path: '/docs', lastmod: new Date().toISOString().split('T')[0] }];
    const sections = this.listSections();
    for (const section of sections) {
      entries.push({ path: `/docs/${section.slug}`, lastmod: new Date().toISOString().split('T')[0] });
      for (const topic of section.topics) {
        entries.push({ path: topic.path, lastmod: new Date().toISOString().split('T')[0] });
      }
    }
    return entries;
  }
}

export const docsContentService = new DocsContentService();
