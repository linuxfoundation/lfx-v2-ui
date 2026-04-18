// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { LENS_PERSONA_MAP, NAV_MAX_UPSTREAM_ITERATIONS, NAV_MIN_ITEMS_PER_RESPONSE } from '@lfx-one/shared/constants';
import {
  EnrichedPersonaProject,
  GetLensItemsParams,
  Lens,
  LensItem,
  LensItemsResponse,
  PersonaApiResponse,
  PersonaType,
  Project,
  QueryServiceResponse,
} from '@lfx-one/shared/interfaces';
import { computeIsFoundation } from '@lfx-one/shared/utils';
import { Request } from 'express';

import { personaDetectionService } from '../utils/persona-helper';
import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/**
 * Backend service powering the foundation/project lens dropdown in the sidebar.
 * Fetches a page of candidates from the query-service and filters it against
 * the user's persona data for the requested lens — unless the user is a tenant
 * root writer, in which case the filter is bypassed.
 */
export class NavigationService {
  private readonly microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
  }

  public async getLensItems(req: Request, params: GetLensItemsParams): Promise<LensItemsResponse> {
    const { lens, pageToken, name } = params;

    // Fetch personas + first upstream page in parallel — neither depends on the other
    // until the persona filter is applied, so this saves ~500ms per request compared
    // to the previous sequential version.
    const [personaResult, firstPage] = await Promise.all([this.fetchPersona(req), this.fetchUpstreamPage(req, lens, pageToken, name)]);

    const { persona, failed: personaFetchFailed } = personaResult;
    const bypassActive = !!persona?.isRootWriter;
    const shouldFilter = !bypassActive && !personaFetchFailed && !!persona;
    const eligibleUids = shouldFilter && persona ? this.collectEligibleProjectUids(persona.projects, LENS_PERSONA_MAP[lens]) : null;

    // When filtering, the universe of possible matches is bounded by eligibleUids. Once
    // we've found them all, further paging is wasted work. When not filtering (bypass),
    // aim for the min-per-response target and let the client paginate on scroll.
    // NB: targetCount=0 (user has no eligible projects) makes the loop body skip entirely.
    const targetCount = eligibleUids ? eligibleUids.size : NAV_MIN_ITEMS_PER_RESPONSE;

    const accumulated: LensItem[] = [];
    let iterations = 0;
    let lastToken: string | null = null;
    let upstreamFailed = firstPage.failed;
    let currentResponse: QueryServiceResponse<Project> | null = firstPage.response;

    while (currentResponse && accumulated.length < targetCount && iterations < NAV_MAX_UPSTREAM_ITERATIONS) {
      iterations += 1;
      const pageItems = this.filterPageResources(currentResponse.resources, lens, eligibleUids);
      accumulated.push(...pageItems.map((p) => this.toLensItem(p)));
      lastToken = currentResponse.page_token ?? null;

      if (!lastToken || accumulated.length >= targetCount) break;

      // Fetch the next upstream page to continue filling the response
      const next = await this.fetchUpstreamPage(req, lens, lastToken, name);
      if (next.failed) {
        upstreamFailed = true;
        lastToken = null;
        break;
      }
      currentResponse = next.response;
    }

    // When filtering, we've gathered the full persona-accessible set — no more client-side
    // pagination is meaningful since the response contains everything the user can see.
    if (eligibleUids) {
      lastToken = null;
    }

    logger.debug(req, 'get_lens_items', 'Built lens items', {
      lens,
      item_count: accumulated.length,
      upstream_iterations: iterations,
      bypass_active: bypassActive,
      persona_fetch_failed: personaFetchFailed,
      upstream_failed: upstreamFailed,
      has_next_page: !!lastToken,
    });

    return {
      items: accumulated,
      next_page_token: lastToken,
      bypass_active: bypassActive,
      persona_fetch_failed: personaFetchFailed,
      upstream_failed: upstreamFailed,
      lens,
    };
  }

  private async fetchPersona(req: Request): Promise<{ persona: PersonaApiResponse | null; failed: boolean }> {
    try {
      const persona = await personaDetectionService.getPersonas(req);
      return { persona, failed: false };
    } catch (error) {
      logger.warning(req, 'get_lens_items', 'Persona fetch failed, falling back to lens-scoped results only', { err: error });
      return { persona: null, failed: true };
    }
  }

  private async fetchUpstreamPage(
    req: Request,
    lens: Lens,
    pageToken: string | undefined,
    name: string | undefined
  ): Promise<{ response: QueryServiceResponse<Project> | null; failed: boolean }> {
    const query = this.buildQuery(lens, pageToken, name);
    try {
      const response = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Project>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', query);
      return { response, failed: false };
    } catch (error) {
      logger.warning(req, 'get_lens_items', 'Upstream query failed', { err: error, lens, has_page_token: !!pageToken });
      return { response: null, failed: true };
    }
  }

  private filterPageResources(resources: QueryServiceResponse<Project>['resources'], lens: Lens, eligibleUids: Set<string> | null): Project[] {
    let projects = resources.map((r) => r.data);
    // Foundation lens applies the full computeIsFoundation definition (stage, funding
    // model, legal entity). The upstream filters cover stage+funding_model but the
    // legal_entity_type negation isn't supported by the filter grammar, so we re-check
    // the whole definition locally for correctness.
    if (lens === 'foundation') {
      projects = projects.filter((p) => computeIsFoundation(p));
    }
    if (eligibleUids) {
      projects = projects.filter((p) => eligibleUids.has(p.uid));
    }
    return projects;
  }

  private buildQuery(lens: Lens, pageToken: string | undefined, name: string | undefined): Record<string, any> {
    const base: Record<string, any> = {
      type: 'project',
      filters: ['stage:Active'],
    };

    // Foundation lens narrows further to membership-funded projects — matches the
    // query-service-supported halves of computeIsFoundation (the legal_entity_type
    // != Internal Allocation negation is still post-filtered since the filter grammar
    // doesn't support exclusions).
    if (lens === 'foundation') {
      base['filters'] = ['stage:Active', 'funding_model:Membership'];
    }

    if (pageToken) base['page_token'] = pageToken;
    if (name) base['name'] = name;

    return base;
  }

  private collectEligibleProjectUids(projects: EnrichedPersonaProject[], allowedPersonas: readonly PersonaType[]): Set<string> {
    const uids = new Set<string>();
    for (const project of projects) {
      if (project.personas.some((p) => allowedPersonas.includes(p))) {
        uids.add(project.projectUid);
      }
    }
    return uids;
  }

  private toLensItem(project: Project): LensItem {
    return {
      uid: project.uid,
      slug: project.slug,
      name: project.name,
      logoUrl: project.logo_url || null,
      isFoundation: computeIsFoundation(project),
    };
  }
}
