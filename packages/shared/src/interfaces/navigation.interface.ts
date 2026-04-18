// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Lens } from './lens.interface';

/**
 * Lenses that support the lens-items endpoint (me/org do not)
 */
export type NavLens = Extract<Lens, 'foundation' | 'project'>;

/**
 * Item shown in the foundation/project lens dropdown
 */
export interface LensItem {
  uid: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  isFoundation: boolean;
}

/**
 * Response payload for GET /api/nav/lens-items
 */
export interface LensItemsResponse {
  items: LensItem[];
  next_page_token: string | null;
  bypass_active: boolean;
  persona_fetch_failed: boolean;
  upstream_failed: boolean;
  lens: Lens;
}

/**
 * Internal marker used by the NavigationService fetch pipeline to distinguish
 * reset (fresh first page) from append (pagination continuation) emissions.
 */
export interface LensPage {
  items: LensItem[];
  nextPageToken: string | null;
  bypassActive: boolean;
  personaFetchFailed: boolean;
  upstreamFailed: boolean;
  reset: boolean;
}

/** Parameters accepted by the server-side NavigationService.getLensItems method. */
export interface GetLensItemsParams {
  lens: NavLens;
  pageToken?: string;
  name?: string;
}
