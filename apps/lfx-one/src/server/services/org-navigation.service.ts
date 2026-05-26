// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { GetOrgItemsParams, OrgItem, OrgItemsQuery, OrgItemsResponse, QueryServiceResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { isMockOrgItemsEnabled } from '../utils/mock-org-items.util';
import orgSelectorMock from './fixtures/org-selector.mock.json';
import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/** Mock page size — bigger than the prod ~50 default so the dev e2e can scroll-paginate. */
const MOCK_PAGE_SIZE = 8;

/**
 * Shape of the `b2b_org.data` payload returned by the query-service. Only fields
 * the selector actually renders are listed — other fields exist but are ignored.
 */
interface B2bOrgIndexedDoc {
  sfid?: string | null;
  name: string;
  logo_url?: string | null;
  primary_domain?: string | null;
  is_member?: boolean;
}

/**
 * Server-side org-selector data source. Mirrors `NavigationService.getLensItems`
 * structurally per research.md D-001, swapping `type=project` for `type=b2b_org`.
 *
 * Two key behavioral differences from `NavigationService`:
 * 1. **FGA is fully delegated upstream** — no explicit `filters_or` for stage/funding;
 *    the query-service applies the caller's writer/auditor/cascade visibility transparently.
 * 2. **No client-side post-filter** (project-lens has a foundation visibility filter;
 *    orgs are a flat universe).
 */
export class OrgNavigationService {
  private readonly microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
  }

  public async getOrgItems(req: Request, params: GetOrgItemsParams): Promise<OrgItemsResponse> {
    const { pageToken, name } = params;
    let { selectedUid } = params;

    // Defense-in-depth: the navigation controller already rejects this combination at the
    // HTTP layer (selected_uid + page_token are mutually exclusive per FR-013). Direct
    // service callers — present and future — get the same safe behaviour by silently
    // dropping the selected_uid hint on continuation pages.
    if (pageToken && selectedUid) {
      logger.warning(req, 'get_org_items', 'page_token and selected_uid both set — ignoring selected_uid', {
        has_page_token: true,
        has_selected_uid: true,
      });
      selectedUid = undefined;
    }

    if (isMockOrgItemsEnabled()) {
      return this.getMockOrgItems(req, { ...params, selectedUid });
    }

    const firstPage = await this.fetchUpstreamPage(req, pageToken, name);

    if (firstPage.failed || !firstPage.response) {
      // Deterministic empty-on-failure (FR-005) — HTTP status stays 200, the failure
      // signal is in-band so clients can render an error state without crashing.
      return {
        items: [],
        next_page_token: null,
        upstream_failed: true,
      };
    }

    const items: OrgItem[] = firstPage.response.resources.map((r) => this.toOrgItem(r.id, r.data));
    const nextPageToken: string | null = firstPage.response.page_token ?? null;

    // FR-013 selected-uid injection: when the caller's prior selection (from cookie / deep link)
    // isn't already in the natural first page, surface it at the top of the list. Skipped on
    // continuation requests since the user is scrolling, not opening fresh.
    if (selectedUid && !pageToken) {
      const alreadyIncluded = items.some((item) => item.uid === selectedUid);
      if (!alreadyIncluded) {
        const selectedItem = await this.fetchSelectedItem(req, selectedUid);
        if (selectedItem) {
          items.unshift(selectedItem);
        }
      }
    }

    logger.debug(req, 'build_org_items', 'Built org items', {
      item_count: items.length,
      has_next_page: !!nextPageToken,
    });

    return {
      items,
      next_page_token: nextPageToken,
      upstream_failed: false,
    };
  }

  private async fetchUpstreamPage(
    req: Request,
    pageToken: string | undefined,
    name: string | undefined
  ): Promise<{ response: QueryServiceResponse<B2bOrgIndexedDoc> | null; failed: boolean }> {
    const query = this.buildQuery(pageToken, name);
    try {
      const response = await this.microserviceProxy.proxyRequest<QueryServiceResponse<B2bOrgIndexedDoc>>(
        req,
        'LFX_V2_SERVICE',
        '/query/resources',
        'GET',
        query
      );
      return { response, failed: false };
    } catch (error) {
      logger.warning(req, 'fetch_upstream_org_page', 'Upstream b2b_org query failed', {
        err: error,
        has_page_token: !!pageToken,
        has_search: !!name?.trim(),
      });
      return { response: null, failed: true };
    }
  }

  /**
   * Second upstream call to fetch the caller's selected row when it's not in the
   * first natural page. Returns null on miss (caller can't see the requested uid)
   * — the response is returned without the prepended row and the client silently
   * falls back to the first natural row (FR-014).
   */
  private async fetchSelectedItem(req: Request, uid: string): Promise<OrgItem | null> {
    try {
      const response = await this.microserviceProxy.proxyRequest<QueryServiceResponse<B2bOrgIndexedDoc>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'b2b_org',
        filters: [`uid:${encodeURIComponent(uid)}`],
      });
      const resource = response?.resources?.[0];
      if (!resource) return null;
      return this.toOrgItem(resource.id, resource.data);
    } catch (error) {
      logger.warning(req, 'fetch_selected_org_item', 'Failed to fetch selected org', { err: error, uid });
      return null;
    }
  }

  private buildQuery(pageToken: string | undefined, name: string | undefined): OrgItemsQuery {
    // Whitespace-only `name` (e.g. ?name=%20) must not flip sort to best_match
    // or forward a meaningless query upstream — treat empty-after-trim as no search.
    const trimmedName = name?.trim();

    // Switch to relevance ordering whenever the user is searching — alphabetical sort would
    // bury an exact match under every other prefix-matching org.
    const base: OrgItemsQuery = {
      type: 'b2b_org',
      filters: [],
      sort: trimmedName ? 'best_match' : 'name_asc',
    };
    if (pageToken) base.page_token = pageToken;
    if (trimmedName) base.name = trimmedName;
    return base;
  }

  /**
   * Maps a single upstream `b2b_org` resource to the BFF wire shape. The uid
   * lives on `resource.id` (the indexed document key); the legacy sfid is in
   * `resource.data.sfid` per spec Q1.
   */
  private toOrgItem(resourceId: string, data: B2bOrgIndexedDoc | undefined): OrgItem {
    return {
      uid: resourceId,
      accountId: data?.sfid ?? null,
      name: data?.name ?? '',
      logoUrl: data?.logo_url ?? null,
      primaryDomain: data?.primary_domain ?? null,
      isMember: data?.is_member ?? false,
    };
  }

  /**
   * Local-dev mock branch. Filters, paginates, and applies the same
   * `selected_uid` injection rule as the real BFF so the popover behaves
   * identically end-to-end when MOCK_ORG_ITEMS=true. Unreachable at runtime
   * in any environment where the flag is unset — the early-return in
   * `getOrgItems` short-circuits before this method is invoked. (The fixture
   * and this method are still present in the server bundle; "tree-shaken"
   * would only apply to a build-time elimination step, which Node runs
   * don't perform.)
   */
  private getMockOrgItems(req: Request, params: GetOrgItemsParams): OrgItemsResponse {
    const { pageToken, name, selectedUid } = params;
    const all = orgSelectorMock.items as OrgItem[];

    const trimmedName = name?.trim().toLowerCase();
    const filtered = trimmedName ? all.filter((item) => item.name.toLowerCase().includes(trimmedName)) : all;
    const sorted = trimmedName
      ? [...filtered].sort((a, b) => {
          // Crude best_match: rows whose name starts with the query rank above mid-string matches.
          const aStarts = a.name.toLowerCase().startsWith(trimmedName) ? 0 : 1;
          const bStarts = b.name.toLowerCase().startsWith(trimmedName) ? 0 : 1;
          return aStarts - bStarts || a.name.localeCompare(b.name);
        })
      : [...filtered].sort((a, b) => a.name.localeCompare(b.name));

    const startIndex = pageToken ? parseInt(pageToken, 10) || 0 : 0;
    const pageItems = sorted.slice(startIndex, startIndex + MOCK_PAGE_SIZE);
    const nextPageToken = startIndex + MOCK_PAGE_SIZE < sorted.length ? String(startIndex + MOCK_PAGE_SIZE) : null;

    let items = pageItems;
    if (selectedUid && !pageToken) {
      const alreadyIncluded = items.some((item) => item.uid === selectedUid);
      if (!alreadyIncluded) {
        const selected = all.find((item) => item.uid === selectedUid);
        if (selected) {
          items = [selected, ...items];
        }
      }
    }

    logger.debug(req, 'build_org_items_mock', 'Built mock org items', {
      item_count: items.length,
      has_next_page: !!nextPageToken,
      mock: true,
    });

    return {
      items,
      next_page_token: nextPageToken,
      upstream_failed: false,
      total: sorted.length,
    };
  }
}
