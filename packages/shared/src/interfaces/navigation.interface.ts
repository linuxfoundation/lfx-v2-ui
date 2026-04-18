// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Lens } from './lens.interface';

export type NavLens = Extract<Lens, 'foundation' | 'project'>;

export interface LensItem {
  uid: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  isFoundation: boolean;
}

export interface LensItemsResponse {
  items: LensItem[];
  next_page_token: string | null;
  bypass_active: boolean;
  persona_fetch_failed: boolean;
  upstream_failed: boolean;
  lens: NavLens;
}

/** `reset=true` marks a fresh first page vs. an append emission. */
export interface LensPage {
  items: LensItem[];
  nextPageToken: string | null;
  bypassActive: boolean;
  personaFetchFailed: boolean;
  upstreamFailed: boolean;
  reset: boolean;
}

/** Carries the dispatch generation so stale responses can be filtered out of the merged stream. */
export interface TaggedLensPage {
  page: LensPage;
  generation: number;
}

export interface GetLensItemsParams {
  lens: NavLens;
  pageToken?: string;
  name?: string;
}

/** Upstream query-service params for lens-item lookups. */
export interface LensItemsQuery {
  type: 'project';
  filters: string[];
  sort: 'name_asc';
  page_token?: string;
  name?: string;
}
