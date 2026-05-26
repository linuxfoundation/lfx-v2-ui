// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { QueryServiceResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/** Maximum number of entries in each direction of the bidirectional uid↔sfid cache. */
const CACHE_MAX_ENTRIES = 10_000;

/** Entries are evicted after 24 hours; org rename / re-create events are rare in practice. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEntry {
  value: string;
  /** Absolute ms-epoch deadline; entries past this are treated as misses. */
  expiresAt: number;
}

/**
 * Process-wide LRU with TTL semantics. We don't pull `lru-cache` into the
 * monorepo for a 10k-entry use case — a Map preserves insertion order which is
 * sufficient for LRU when we re-insert on touch (`get` → `set` to bump). The
 * TTL check happens lazily on read; this avoids a timer for every entry which
 * would dominate cost at the scale this cache operates at.
 */
class LruWithTtl {
  private readonly store = new Map<string, CacheEntry>();

  public constructor(
    private readonly maxEntries: number,
    private readonly ttlMs: number
  ) {}

  public get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Touch — re-insert to bump recency (Map iteration order = insertion order).
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  public set(key: string, value: string): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      // Evict the oldest (first inserted) entry.
      const oldest = this.store.keys().next();
      if (!oldest.done) {
        this.store.delete(oldest.value);
      }
    }
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}

interface B2bOrgIndexedDoc {
  /** `resource.data.sfid` from the query-service indexed document. */
  sfid?: string | null;
}

/**
 * Resolves between the canonical `b2b_org.uid` (UUID) and the legacy
 * Salesforce `accountId` (sfid). Both directions are memoized in process-wide
 * LRU caches with TTL — the mapping is user-independent, so cross-request
 * cache hits are correct and beneficial.
 *
 * On miss, the resolver issues `/query/resources?type=b2b_org&filters=...` with
 * the **caller's** bearer token, so the lookup still respects the caller's
 * FGA visibility. When the caller can't see the org, the resolver returns null
 * (mirrors member-service's "no access ≈ no exist" semantics).
 *
 * Per research.md D-004.
 */
export class OrgIdentityResolver {
  private static singletonInstance: OrgIdentityResolver | null = null;

  private readonly sfidToUid = new LruWithTtl(CACHE_MAX_ENTRIES, CACHE_TTL_MS);
  private readonly uidToSfid = new LruWithTtl(CACHE_MAX_ENTRIES, CACHE_TTL_MS);
  private readonly microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
  }

  /**
   * Returns the single shared instance — using a static accessor instead of a
   * naked module-level `new` keeps the constructor available for tests and
   * keeps the cache state observable from the singleton without polluting the
   * module-load graph for downstream importers.
   */
  public static getInstance(): OrgIdentityResolver {
    if (!OrgIdentityResolver.singletonInstance) {
      OrgIdentityResolver.singletonInstance = new OrgIdentityResolver();
    }
    return OrgIdentityResolver.singletonInstance;
  }

  /**
   * UUID lookup → `{ sfid, cacheHit }`. `sfid` is null when the caller can't
   * see the org or the org has no sfid; `cacheHit` reflects whether the result
   * came from the LRU (true) or required an upstream `/query/resources` call
   * (false). Both null returns and resolved values carry an honest cacheHit
   * value so callers can emit accurate cache-hit-ratio metrics.
   */
  public async getSfidByUid(uid: string, req: Request): Promise<OrgIdentityLookupResult<'sfid'>> {
    const cached = this.uidToSfid.get(uid);
    if (cached !== null) return { sfid: cached, cacheHit: true };

    // Defense-in-depth: reject inputs containing the query-service filter
    // separators before interpolating. UUIDs from `req.params.uid` are normally
    // 8-4-4-4-12 hex+dash and pass the allowlist, but a tampered path param
    // could otherwise alter the query shape. NOTE: we don't URL-encode here
    // either — `ApiClientService.getFullUrl` already percent-encodes via
    // `URLSearchParams`, and double-encoding would silently break valid lookups.
    if (!isFilterSafeIdentifier(uid)) {
      logger.warning(req, 'org_identity_resolver_get_sfid', 'Refusing uid → sfid lookup for input outside filter-safe allowlist');
      return { sfid: null, cacheHit: false };
    }
    try {
      const response = await this.microserviceProxy.proxyRequest<QueryServiceResponse<B2bOrgIndexedDoc>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'b2b_org',
        filters: [`uid:${uid}`],
      });
      const sfid = response?.resources?.[0]?.data?.sfid ?? null;
      if (sfid) {
        this.uidToSfid.set(uid, sfid);
        // Round-trip the inverse mapping too — we already paid for the upstream call.
        this.sfidToUid.set(sfid, uid);
      }
      return { sfid, cacheHit: false };
    } catch (error) {
      logger.warning(req, 'org_identity_resolver_get_sfid', 'Failed to resolve uid → sfid', { err: error, uid });
      return { sfid: null, cacheHit: false };
    }
  }

  /**
   * sfid (Salesforce id) lookup → `{ uid, cacheHit }`. `uid` is null when the
   * caller can't see the org; `cacheHit` is true when the result came from
   * the LRU and false when an upstream `/query/resources` call was performed.
   */
  public async getUidBySfid(sfid: string, req: Request): Promise<OrgIdentityLookupResult<'uid'>> {
    const cached = this.sfidToUid.get(sfid);
    if (cached !== null) return { uid: cached, cacheHit: true };

    if (!isFilterSafeIdentifier(sfid)) {
      logger.warning(req, 'org_identity_resolver_get_uid', 'Refusing sfid → uid lookup for input outside filter-safe allowlist');
      return { uid: null, cacheHit: false };
    }
    try {
      const response = await this.microserviceProxy.proxyRequest<QueryServiceResponse<B2bOrgIndexedDoc>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'b2b_org',
        filters: [`sfid:${sfid}`],
      });
      const uid = response?.resources?.[0]?.id ?? null;
      if (uid) {
        this.sfidToUid.set(sfid, uid);
        this.uidToSfid.set(uid, sfid);
      }
      return { uid, cacheHit: false };
    } catch (error) {
      logger.warning(req, 'org_identity_resolver_get_uid', 'Failed to resolve sfid → uid', { err: error, sfid });
      return { uid: null, cacheHit: false };
    }
  }
}

/**
 * Allowlist for identifiers safely interpolatable into the query-service filter
 * grammar. Covers UUIDs (hex + dashes) and Salesforce IDs (alphanumeric, 15 or
 * 18 chars). Crucially EXCLUDES the filter separators `:` and `,` so a tampered
 * path parameter cannot alter the upstream query shape.
 */
const FILTER_SAFE_IDENTIFIER = /^[A-Za-z0-9_-]+$/;

function isFilterSafeIdentifier(value: string): boolean {
  return value.length > 0 && value.length <= 64 && FILTER_SAFE_IDENTIFIER.test(value);
}

/**
 * Resolver return shape — carries the resolved value AND an honest cacheHit
 * flag so callers can log cache-hit ratios without re-implementing detection.
 * The generic narrows the value key (`uid` vs `sfid`) per call direction.
 */
export type OrgIdentityLookupResult<K extends 'uid' | 'sfid'> = Record<K, string | null> & { cacheHit: boolean };
