# End-User Documentation — Authoring Guide

This directory contains the end-user help documentation for [LFX Self Serve](https://app.lfx.dev).
Content is served live from the running application at `/docs`, making it indexable by web crawlers,
linkable from GitHub issues, and available to Intercom for knowledge-base ingestion.

## Directory Structure

```
docs/enduser/
├── index.md                    # Metadata-only file (not rendered by the API; /docs uses DocsLandingComponent)
├── <section>/
│   ├── index.md                # Section overview (rendered at /docs/<section>)
│   └── <topic>/
│       └── index.md            # Article (rendered at /docs/<section>/<topic>)
```

Each section maps to a product area (meetings, committees, votes, etc.). The `index.md` at the
section level is the overview; sub-directories are individual how-to articles.

> **Note:** The top-level `docs/enduser/index.md` is **not** served by the public API. The `/docs`
> landing page is rendered by the Angular `DocsLandingComponent`, which builds the feature card grid
> from the section tree returned by `GET /public/api/docs`. The file exists as a placeholder for
> future Intercom ingestion.

## Frontmatter Contract

Every file **must** include a YAML frontmatter block at the top:

```yaml
---
title: 'Human-readable page title' # required — used for <title>, nav, and Intercom
description: 'One-sentence summary.' # required — used for meta description and Intercom
product_area: Meetings # required — maps to Intercom collection
audience: [contributor, maintainer] # optional — list from: contributor, maintainer, board-member, executive-director
tags: [meetings, schedule, calendar] # optional — space-separated keywords for search
last_updated: 2026-05-27 # required — ISO date; update when content changes
intercom_collection: Meetings # optional — explicit Intercom collection override
---
```

**Required fields:** `title`, `description`, `product_area`, `last_updated`

## Adding a New Article

1. Create a directory under the appropriate section: `docs/enduser/<section>/<topic>/`
2. Add `index.md` with the required frontmatter.
3. Write the body in standard Markdown (headings, lists, code blocks, tables, links).
4. Avoid raw HTML tags — the renderer passes content through `marked` (CommonMark/GFM) then
   `DOMPurify` with default settings. DOMPurify allows most safe HTML but strips script tags,
   event handlers, and other dangerous constructs. Keep content in plain Markdown for
   maximum Intercom compatibility.
5. Use relative links to other articles: `../manage-meetings/` not `/docs/meetings/manage-meetings`.

## Adding a New Section

1. Create `docs/enduser/<section>/index.md` with frontmatter.
2. Add a row to the table in `docs/enduser/index.md`.
3. The section will auto-appear in the `/docs` sidebar nav on next server restart.

## Conventions

- One article per directory (always `index.md`, never `my-topic.md`).
- Keep articles focused — one task or concept per file.
- `last_updated` must be updated whenever the article body changes; it surfaces in the Intercom sync.
- Do not add VitePress-specific YAML keys (`layout`, `hero`, `features`) — they are ignored by the runtime renderer.

## How Content is Served

The Express SSR server reads files from this directory at request time via
`apps/lfx-one/src/server/services/docs-content.service.ts`. In production the files are bundled
into the browser dist at `/docs-enduser/` via the Angular assets pipeline.

- **Public API:** `GET /public/api/docs` (section tree), `GET /public/api/docs/:section/:topic?` (article)
- **Angular routes:** `/docs` (landing), `/docs/:section/:topic?` (article)
- **Auth:** no authentication required — all `/docs` routes are public
