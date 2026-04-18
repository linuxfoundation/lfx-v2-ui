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
  lens: Lens;
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

export interface GetLensItemsParams {
  lens: NavLens;
  pageToken?: string;
  name?: string;
}
