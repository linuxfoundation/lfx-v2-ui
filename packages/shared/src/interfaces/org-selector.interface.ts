// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type { Signal, WritableSignal } from '@angular/core';
import type { Subject } from 'rxjs';

/**
 * One row in the org selector dropdown. Carries BOTH identifiers per spec Q1 so the
 * client can read either the canonical UUID (member-service) or the legacy Salesforce
 * `accountId` (Snowflake / existing /api/orgs/:accountId/lens/* routes) without a
 * second resolver round-trip.
 */
export interface OrgItem {
  /** Canonical b2b_org identifier (UUID 8-4-4-4-12). Sourced from query-service `resource.id`. */
  uid: string;
  /**
   * Legacy Salesforce account id (15 or 18 chars). Sourced from `resource.data.sfid`.
   * Null only for orgs that were never registered with Salesforce (rare in production).
   * Clients MUST tolerate null — selection still works on `uid` alone, but downstream
   * Snowflake-keyed routes will not be reachable.
   */
  accountId: string | null;
  /** Display name. Always non-empty (query-service strips nameless orgs). */
  name: string;
  /** Logo URL; null when no logo is configured. */
  logoUrl: string | null;
  /** Optional primary web domain (e.g. "redhat.com"). */
  primaryDomain?: string | null;
  /** LF member-org flag (filled when the indexed doc exposes it). */
  isMember?: boolean;
}

/**
 * Display projection of an OrgItem with selection + role decoration metadata.
 */
export interface DisplayOrgItem {
  item: OrgItem;
  isSelected: boolean;
  roleLabel: string;
  roleIcon: string;
}

/**
 * Wire shape returned by `GET /api/nav/org-items`. Mirrors `LensItemsResponse`
 * one-to-one with `type=b2b_org` substitution per `contracts/bff-org-items.md`.
 */
export interface OrgItemsResponse {
  /** Current page rows. */
  items: OrgItem[];
  /** Null when no more pages remain. */
  next_page_token: string | null;
  /**
   * True ONLY on the deterministic-empty failure response (FR-005). False when
   * `items` is `[]` because the user genuinely has no matching results.
   */
  upstream_failed: boolean;
  /** Optional total when the upstream returns it cheaply; clients tolerate null. */
  total?: number | null;
}

/**
 * BFF → query-service shape constructed by `OrgNavigationService.buildQuery`.
 * Not persisted; rebuilt per request.
 */
export interface OrgItemsQuery {
  type: 'b2b_org';
  /** Set only when caller passed a non-whitespace `name`. */
  name?: string;
  /** Set only on continuation requests. */
  page_token?: string;
  /** `best_match` when `name` is set; `name_asc` otherwise. */
  sort: 'name_asc' | 'best_match';
  /**
   * Always present (possibly empty). FGA is enforced upstream automatically
   * (writer ⊕ auditor ⊕ key-contact cascade) — no explicit filter needed for that.
   */
  filters: string[];
  /** Used by the `selected_uid` injection second-call path. */
  filters_or?: string[];
}

/**
 * Internal getter param shape used by `OrgNavigationService.getOrgItems`.
 */
export interface GetOrgItemsParams {
  pageToken?: string;
  name?: string;
  /**
   * Hint: when set and not in the first natural page, the server makes a second
   * `/query/resources?filters=uid:{selectedUid}` call and prepends the row.
   * Mutually exclusive with `pageToken`.
   */
  selectedUid?: string;
}

/**
 * Wire shape returned by `GET /api/orgs/me/role-grants`. The BFF flattens the
 * upstream nested `b2b_org_settings` shape to two disjoint string arrays. See
 * `contracts/bff-org-role-grants.md`.
 */
export interface RoleGrantsResponse {
  /** `b2b_org.uid` values where the caller has the `writer` role. */
  writers: string[];
  /**
   * `b2b_org.uid` values where the caller has the `auditor` role AND is NOT
   * also a writer on the same org (writer-wins; intersection is empty).
   */
  auditors: string[];
  /** Caller's resolved username (from JWT). */
  username: string;
  /** Server-side load timestamp (ISO 8601 UTC). */
  loaded_at: string;
}

/**
 * Canonical org record returned by `GET /api/orgs/uid/:uid` (or `/sfid/:accountId`
 * or polymorphic `/:id`). The BFF transforms the member-service snake_case
 * response to camelCase per `contracts/bff-org-canonical-record.md`.
 */
export interface OrgCanonicalRecord {
  uid: string;
  /** Legacy Salesforce id; null for orgs without an sfid. */
  accountId: string | null;
  name: string;
  description?: string | null;
  website?: string | null;
  primaryDomain?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  sector?: string | null;
  numberOfEmployees?: number | null;
  /** b2b_org.uid of the parent; null for top-level orgs. */
  parentUid?: string | null;
  isMember: boolean;
}

/**
 * Internal page result used by the client `OrgNavigationService` reactive pipeline.
 * `reset=true` marks a fresh first page vs. an append emission.
 */
export interface OrgListPage {
  items: OrgItem[];
  nextPageToken: string | null;
  upstreamFailed: boolean;
  reset: boolean;
}

/**
 * Carries the dispatch generation so stale responses can be filtered out of the
 * merged stream (spec FR-011 race-guard).
 */
export interface TaggedOrgListPage {
  page: OrgListPage;
  generation: number;
}

/**
 * Client-side reactive state container — single-state (no foundation/project
 * bifurcation; orgs are a flat list).
 */
export interface OrgListState {
  searchTerm: WritableSignal<string>;
  items: Signal<OrgItem[]>;
  loading: WritableSignal<boolean>;
  loaded: WritableSignal<boolean>;
  nextPageToken: WritableSignal<string | null>;
  hasMore: Signal<boolean>;
  pendingDefaultSelection: WritableSignal<boolean>;
  /** Incremented on every reset; nextPage emissions tagged with the value at dispatch. */
  generation: WritableSignal<number>;
  loadMore$: Subject<string>;
  reload$: Subject<void>;
}
