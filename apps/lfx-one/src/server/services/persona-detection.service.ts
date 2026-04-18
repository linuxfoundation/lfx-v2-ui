// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { AFFILIATED_PROJECT_UIDS_CACHE_TTL_MS, DETECTION_SOURCE_MAP, PERSONA_PRIORITY, PERSONAS_CACHE_TTL_MS } from '@lfx-one/shared/constants';
import { NatsSubjects } from '@lfx-one/shared/enums';
import {
  Account,
  AffiliatedProjectUidsCacheEntry,
  EnrichedPersonaProject,
  PersonaApiResponse,
  PersonaApiResponseCacheEntry,
  PersonaDetectionResponse,
  PersonaProject,
  PersonaType,
} from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { getEffectiveEmail, getEffectiveUsername } from '../utils/auth-helper';
import { AccessCheckService } from './access-check.service';
import { logger } from './logger.service';
import { NatsService } from './nats.service';

/**
 * Service for detecting user personas via the persona detection NATS RPC.
 * Returns raw detection data without per-project REST enrichment — consumers
 * that need project metadata (name, logo, foundation flag) should look those
 * up via NavigationService or a targeted project-service call.
 */
export class PersonaDetectionService {
  private readonly natsService: NatsService;
  private readonly accessCheckService: AccessCheckService;

  /**
   * Short-lived per-user cache for affiliated project UIDs.
   * Keyed by username (nickname claim) with email as fallback.
   * Stores the in-flight Promise so concurrent requests on the same page load
   * (e.g. events list + foundation dropdown) share a single NATS round-trip.
   */
  private readonly affiliatedUidsCache = new Map<string, AffiliatedProjectUidsCacheEntry>();

  /**
   * Short-lived per-user cache for the full getPersonas response.
   * Dedups concurrent callers within a page-load burst (/api/user/personas +
   * /api/nav/lens-items firing together) into a single NATS round-trip.
   */
  private readonly personasCache = new Map<string, PersonaApiResponseCacheEntry>();

  /**
   * Per-request memoization for checkRootWriter. A single HTTP request may call
   * checkRootWriter multiple times (e.g. nav endpoint checks it first, then falls
   * through to getPersonas which also needs it). WeakMap keyed by the Request
   * object ensures one /access-check call per request, with automatic cleanup
   * when the request object is GC'd.
   */
  private readonly rootWriterRequestCache = new WeakMap<Request, Promise<boolean>>();

  public constructor() {
    this.natsService = new NatsService();
    this.accessCheckService = new AccessCheckService();

    // Sweep expired cache entries every 60 s — well above the 15 s TTL — so
    // entries that are never re-requested don't accumulate indefinitely.
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.affiliatedUidsCache) {
        if (now >= entry.expiresAt) {
          this.affiliatedUidsCache.delete(key);
        }
      }
      for (const [key, entry] of this.personasCache) {
        if (now >= entry.expiresAt) {
          this.personasCache.delete(key);
        }
      }
    }, 60_000).unref();
  }

  /**
   * Return only the project slugs the authenticated user is affiliated with.
   * Slugs are used (rather than persona-service UIDs) because PROJECT_SLUG is
   * the shared cross-reference key between the persona service and the datalake.
   *
   * Cache strategy:
   * - Keyed by username (nickname) with email as fallback; skips cache entirely
   *   when no stable identifier is present (prevents cross-user data leaks).
   * - Stores the in-flight Promise before awaiting so concurrent requests for
   *   the same user share a single NATS round-trip rather than each triggering
   *   their own (addresses the "events list + foundation dropdown" concurrency).
   * - Evicts stale entries eagerly on cache miss and on rejection to prevent
   *   memory growth and poisoned entries.
   *
   * Returns an empty array on error so callers degrade gracefully.
   */
  public async getAffiliatedProjectSlugs(req: Request): Promise<string[]> {
    const username = getEffectiveUsername(req) || '';
    const email = getEffectiveEmail(req) || '';
    const cacheKey = username || email;

    // No stable identifier — bypass cache to prevent cross-user data leaks.
    if (!cacheKey) {
      logger.debug(req, 'get_affiliated_project_slugs', 'No stable cache key, bypassing cache');
      return this.fetchAndResolveAffiliatedSlugs(req, username, email);
    }

    const cached = this.affiliatedUidsCache.get(cacheKey);
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        logger.debug(req, 'get_affiliated_project_slugs', 'Returning cached affiliated project slugs', {
          cacheKey: '***',
        });
        return cached.promise;
      }
      // Stale — evict eagerly so the next caller fetches fresh data.
      this.affiliatedUidsCache.delete(cacheKey);
    }

    // Store the Promise *before* awaiting so concurrent callers retrieve and
    // await the same Promise instead of each triggering a separate NATS call.
    const promise = this.fetchAndResolveAffiliatedSlugs(req, username, email);
    this.affiliatedUidsCache.set(cacheKey, { promise, expiresAt: Date.now() + AFFILIATED_PROJECT_UIDS_CACHE_TTL_MS });

    // Remove on rejection so a failed lookup doesn't poison the cache.
    promise.catch(() => this.affiliatedUidsCache.delete(cacheKey));

    return promise;
  }

  /**
   * Get persona data for the authenticated user from the detection service.
   * Returns detection results with nullable project metadata fields — consumers
   * needing name/logo/foundation flags should fetch those separately.
   *
   * Cache strategy (mirrors getAffiliatedProjectSlugs):
   * - Keyed by username (nickname) with email as fallback; no stable key → bypass
   *   cache entirely to prevent cross-user data leaks.
   * - Stores the in-flight Promise before awaiting so concurrent callers within a
   *   page-load burst share a single NATS round-trip.
   * - Evicts on error-response so transient NATS timeouts don't pin empty results
   *   for the full TTL window.
   */
  public async getPersonas(req: Request): Promise<PersonaApiResponse> {
    const username = getEffectiveUsername(req) || '';
    const email = getEffectiveEmail(req) || '';
    const cacheKey = username || email;

    // No stable identifier — bypass cache to prevent cross-user data leaks.
    if (!cacheKey) {
      logger.debug(req, 'get_personas', 'No stable cache key, bypassing cache');
      return this.computePersonas(req, username, email);
    }

    const cached = this.personasCache.get(cacheKey);
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        logger.debug(req, 'get_personas', 'Returning cached persona response', { cacheKey: '***' });
        return cached.promise;
      }
      // Stale — evict eagerly so the next caller fetches fresh data.
      this.personasCache.delete(cacheKey);
    }

    // Store the Promise *before* awaiting so concurrent callers retrieve and
    // await the same Promise instead of each triggering a separate NATS call.
    const promise = this.computePersonas(req, username, email);
    this.personasCache.set(cacheKey, { promise, expiresAt: Date.now() + PERSONAS_CACHE_TTL_MS });

    // Evict failed lookups so the next caller retries immediately instead of being
    // stuck with an empty/error response for the TTL window.
    promise.then(
      (result) => {
        if (result.error) {
          this.personasCache.delete(cacheKey);
        }
      },
      () => this.personasCache.delete(cacheKey)
    );

    return promise;
  }

  /** Fresh compute of the PersonaApiResponse — called through the cache in getPersonas. */
  private async computePersonas(req: Request, username: string, email: string): Promise<PersonaApiResponse> {
    logger.debug(req, 'get_personas', 'Fetching personas from detection service', {
      username,
      email: email ? '***' : 'empty',
    });

    // Fire persona detection + root-writer access check in parallel — independent calls.
    const [detectionResponse, isRootWriter] = await Promise.all([this.fetchPersonaDetections(req, username, email), this.checkRootWriter(req)]);

    if (detectionResponse.error) {
      logger.warning(req, 'get_personas', 'Persona detection returned error', {
        error_code: detectionResponse.error.code,
        error_message: detectionResponse.error.message,
      });

      return {
        personaProjects: {},
        personas: ['contributor'],
        projects: [],
        organizations: [],
        isRootWriter,
        error: detectionResponse.error.message,
      };
    }

    if (detectionResponse.projects.length === 0) {
      logger.debug(req, 'get_personas', 'No persona detections found for user');

      return {
        personaProjects: {},
        personas: ['contributor'],
        projects: [],
        organizations: [],
        isRootWriter,
        error: null,
      };
    }

    const projects = this.toEnrichedPersonaProjects(detectionResponse);

    const personaProjects = this.buildPersonaProjectsMap(projects);
    const personas = this.collectUniquePersonas(projects);

    logger.debug(req, 'get_personas', 'Persona detection complete', {
      project_count: projects.length,
      persona_count: personas.length,
      personas,
    });

    return {
      personaProjects,
      personas,
      projects,
      organizations: this.extractOrganizations(req, projects),
      isRootWriter,
      error: null,
    };
  }

  /**
   * Check whether the user has writer access on the tenant ROOT project.
   * Uses the /access-check upstream with the user's bearer token — authoritative,
   * no username-to-sub translation needed (unlike scanning the persona response
   * for `source: "writer"` detections). Returns false when LFX_ROOT_PROJECT_UID
   * is unset so local/dev environments without the config degrade gracefully.
   *
   * Memoized per-request via WeakMap so multiple callers within one HTTP request
   * (nav endpoint pre-check + persona-detection internal check) share one upstream call.
   */
  public async checkRootWriter(req: Request): Promise<boolean> {
    const cached = this.rootWriterRequestCache.get(req);
    if (cached) return cached;

    const rootUid = process.env['LFX_ROOT_PROJECT_UID'];
    if (!rootUid) {
      logger.warning(req, 'check_root_writer', 'LFX_ROOT_PROJECT_UID is not set — defaulting isRootWriter to false');
      const falsePromise = Promise.resolve(false);
      this.rootWriterRequestCache.set(req, falsePromise);
      return falsePromise;
    }

    const promise = this.accessCheckService.checkSingleAccess(req, {
      resource: 'project',
      id: rootUid,
      access: 'writer',
    });
    this.rootWriterRequestCache.set(req, promise);
    return promise;
  }

  /** Fetch persona detections and resolve to a deduplicated list of project slugs. */
  private async fetchAndResolveAffiliatedSlugs(req: Request, username: string, email: string): Promise<string[]> {
    const detectionResponse = await this.fetchPersonaDetections(req, username, email);

    if (detectionResponse.error) {
      logger.warning(req, 'get_affiliated_project_slugs', 'Persona detection returned an error, returning empty affiliation list', {
        error_code: detectionResponse.error.code,
        error_message: detectionResponse.error.message,
      });
      return [];
    }

    const slugs = [...new Set(detectionResponse.projects.map((p) => p.project_slug?.toLowerCase()).filter(Boolean))];

    logger.debug(req, 'get_affiliated_project_slugs', 'Resolved affiliated project slugs', {
      slug_count: slugs.length,
      project_slugs: slugs,
    });

    return slugs;
  }

  /**
   * Call the persona detection service via NATS RPC
   */
  private async fetchPersonaDetections(req: Request, username: string, email: string): Promise<PersonaDetectionResponse> {
    logger.debug(req, 'fetch_persona_detections', 'Sending NATS persona request', {
      subject: NatsSubjects.PERSONAS_GET,
      has_username: !!username,
      has_email: !!email,
      email: email ? '***' : 'empty',
    });

    try {
      const codec = this.natsService.getCodec();
      const payload = JSON.stringify({ username, email });
      const response = await this.natsService.request(NatsSubjects.PERSONAS_GET, codec.encode(payload), { timeout: 5000 });
      const decoded = codec.decode(response.data);

      logger.debug(req, 'fetch_persona_detections', 'Raw NATS persona response received', {
        response_length: decoded.length,
        raw_response: decoded.length <= 2000 ? decoded : decoded.slice(0, 2000) + '...[truncated]',
      });

      const parsed = JSON.parse(decoded);

      // Log raw NATS response for debugging detection extras (e.g. organization data)
      const projectCount = Array.isArray(parsed?.projects) ? parsed.projects.length : 0;
      const boardDetections = Array.isArray(parsed?.projects)
        ? parsed.projects.flatMap((p: Record<string, unknown>) =>
            Array.isArray(p['detections'])
              ? (p['detections'] as Record<string, unknown>[]).filter((d: Record<string, unknown>) => d['source'] === 'board_member')
              : []
          )
        : [];
      logger.debug(req, 'fetch_persona_detections', 'Raw NATS persona response', {
        project_count: projectCount,
        board_member_detections: boardDetections.length,
        board_member_has_org: boardDetections.map((d: Record<string, unknown>) => {
          const extra = d['extra'] as Record<string, unknown> | undefined;
          const org = extra?.['organization'] as Record<string, unknown> | undefined;
          return { has_org: !!org, org_id: org?.['id'], org_name: org?.['name'] };
        }),
      });

      // Validate response shape — normalize malformed fields to prevent downstream crashes
      const normalized = {
        projects: Array.isArray(parsed?.projects)
          ? parsed.projects.map((p: Record<string, unknown>) => ({
              project_uid: p['project_uid'] || '',
              project_slug: p['project_slug'] || '',
              detections: Array.isArray(p['detections']) ? p['detections'] : [],
            }))
          : [],
        error: parsed?.error ?? null,
      } as PersonaDetectionResponse;

      logger.debug(req, 'fetch_persona_detections', 'Persona detection normalized', {
        project_count: normalized.projects.length,
        project_uids: normalized.projects.map((p) => p.project_uid),
        has_error: !!normalized.error,
        error_code: normalized.error?.code ?? null,
      });

      return normalized;
    } catch (error) {
      logger.warning(req, 'fetch_persona_detections', 'NATS persona detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        error_name: error instanceof Error ? error.constructor.name : 'Unknown',
      });

      return { projects: [], error: { code: 'nats_error', message: 'Failed to fetch persona detections' } };
    }
  }

  /**
   * Map raw detection projects to the EnrichedPersonaProject shape without REST lookups.
   * Project metadata fields (name, logo, foundation flag, parent, description) are left null /
   * false / empty — consumers that need them should fetch via NavigationService or project-service.
   */
  private toEnrichedPersonaProjects(response: PersonaDetectionResponse): EnrichedPersonaProject[] {
    return response.projects.map((project) => ({
      projectUid: project.project_uid,
      projectSlug: project.project_slug,
      projectName: null,
      parentProjectUid: null,
      isFoundation: false,
      logoUrl: null,
      description: null,
      detections: project.detections,
      personas: this.mapDetectionsToPersonas(project.detections),
    }));
  }

  /**
   * Map detection sources to persona types
   * - board_member → 'board-member'
   * - executive_director → 'executive-director'
   * - cdp_roles with Maintainer role → 'maintainer'
   * - Everything else → 'contributor'
   */
  private mapDetectionsToPersonas(detections: { source: string; extra?: Record<string, unknown> }[]): PersonaType[] {
    const personas = new Set<PersonaType>();

    for (const detection of detections) {
      const mapped = DETECTION_SOURCE_MAP[detection.source];
      if (mapped) {
        personas.add(mapped);
        continue;
      }

      if (detection.source === 'cdp_roles' && detection.extra) {
        const roles = detection.extra['roles'] as { role: string }[] | undefined;
        if (roles?.some((r) => typeof r.role === 'string' && r.role.toLowerCase() === 'maintainer')) {
          personas.add('maintainer');
          continue;
        }
      }

      personas.add('contributor');
    }

    if (personas.size === 0) {
      personas.add('contributor');
    }

    // Contributor is implied by any specific role — if a project already has
    // board-member, executive-director, or maintainer, drop contributor so the
    // project only appears under the more specific persona(s).
    if (personas.size > 1 && personas.has('contributor')) {
      personas.delete('contributor');
    }

    return Array.from(personas);
  }

  /**
   * Build a mapping of persona → projects for lens navigation filtering
   */
  private buildPersonaProjectsMap(projects: EnrichedPersonaProject[]): Partial<Record<PersonaType, PersonaProject[]>> {
    const map: Partial<Record<PersonaType, PersonaProject[]>> = {};

    for (const project of projects) {
      const personaProject: PersonaProject = {
        projectUid: project.projectUid,
        projectSlug: project.projectSlug,
        projectName: project.projectName,
      };

      for (const persona of project.personas) {
        if (!map[persona]) {
          map[persona] = [];
        }
        map[persona]!.push(personaProject);
      }
    }

    return map;
  }

  /**
   * Collect unique personas from all projects, sorted by priority (highest first)
   */
  private collectUniquePersonas(projects: EnrichedPersonaProject[]): PersonaType[] {
    const allPersonas = new Set<PersonaType>();

    for (const project of projects) {
      for (const persona of project.personas) {
        allPersonas.add(persona);
      }
    }

    return PERSONA_PRIORITY.filter((p) => allPersonas.has(p));
  }

  /**
   * Extract unique organizations from board_member detection extras
   * The persona service includes organization data (Salesforce account ID, name, website)
   * in board_member detection extras — map these to Account objects for UI consumption
   */
  private extractOrganizations(req: Request, projects: EnrichedPersonaProject[]): Account[] {
    const seen = new Set<string>();
    const accounts: Account[] = [];

    for (const project of projects) {
      for (const detection of project.detections) {
        if (detection.source === 'board_member' && detection.extra) {
          const org = detection.extra['organization'] as { id?: unknown; name?: unknown } | undefined;
          const orgId = typeof org?.id === 'string' ? org.id : '';
          const orgName = typeof org?.name === 'string' ? org.name : '';

          logger.debug(req, 'extract_organizations', 'Processing board_member detection', {
            project_slug: project.projectSlug,
            has_org: !!org,
            org_id: orgId || null,
            org_name: orgName || null,
          });

          if (orgId && orgName && !seen.has(orgId)) {
            seen.add(orgId);
            accounts.push({ accountId: orgId, accountName: orgName });
          }
        }
      }
    }

    logger.debug(req, 'extract_organizations', 'Organization extraction complete', {
      total_accounts: accounts.length,
      accounts: accounts.map((a) => ({ id: a.accountId, name: a.accountName })),
    });

    return accounts;
  }
}
