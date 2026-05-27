// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import DOMPurify from 'isomorphic-dompurify';
import matter from 'gray-matter';
import { marked } from 'marked';

import { isValidSlugParts } from '@lfx-one/shared/utils';

import { serverLogger } from '../server-logger';

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
  // Build-time fallback: during Angular route extraction the CWD is the repo root
  const cwdPath = resolve(process.cwd(), 'docs/enduser');
  if (existsSync(cwdPath)) {
    return cwdPath;
  }
  throw new Error('docs-content: cannot locate docs/enduser directory');
}

function readFrontmatter(filePath: string): { frontmatter: DocFrontmatter; content: string } | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    const parsed = matter(raw);
    const fm = parsed.data as DocFrontmatter;
    if (!fm.title || !fm.description) {
      serverLogger.warn({ filePath }, 'docs-content: article missing required frontmatter fields (title, description)');
    }
    return { frontmatter: fm, content: parsed.content };
  } catch (err) {
    serverLogger.error({ filePath, err }, 'docs-content: failed to read article');
    return null;
  }
}

function renderMarkdown(content: string): string {
  const rawHtml = marked.parse(content) as string;
  return DOMPurify.sanitize(rawHtml);
}

let _sectionCache: DocSection[] | null = null;

export class DocsContentService {
  private readonly docsRoot: string;

  public constructor() {
    this.docsRoot = resolveDocsRoot();
  }

  public listSections(): DocSection[] {
    // In development, skip the cache so file edits are reflected immediately
    // without a restart. Directory mtime is unreliable for tracking edits to
    // individual markdown files.
    if (process.env['NODE_ENV'] !== 'production') {
      _sectionCache = null;
    }

    if (_sectionCache) {
      return _sectionCache;
    }

    const sections: DocSection[] = [];
    const today = new Date().toISOString().split('T')[0];

    // Sort alphabetically so section/topic order is deterministic across filesystems.
    const entries = readdirSync(this.docsRoot, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sectionSlug = entry.name;
      const sectionIndex = join(this.docsRoot, sectionSlug, 'index.md');
      if (!existsSync(sectionIndex)) continue;

      const sectionMeta = readFrontmatter(sectionIndex);
      if (!sectionMeta) continue;

      const topics: DocTopic[] = [];
      const topicEntries = readdirSync(join(this.docsRoot, sectionSlug), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
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
    // Validate each slug segment before using in a path expression.
    if (!isValidSlugParts(slugParts)) {
      return null;
    }

    const filePath = resolve(this.docsRoot, ...slugParts, 'index.md');
    // Prevent path traversal: resolved path must stay inside docsRoot.
    if (!filePath.startsWith(`${this.docsRoot}${sep}`)) {
      return null;
    }
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
}

export const docsContentService = new DocsContentService();
