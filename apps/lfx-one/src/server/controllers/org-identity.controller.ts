// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { OrgCanonicalRecord, OrgItem, RoleGrantsResponse } from '@lfx-one/shared/interfaces';
import { NextFunction, Request, Response } from 'express';

import { MicroserviceError } from '../errors/microservice.error';
import { ServiceValidationError } from '../errors/service-validation.error';
import orgSelectorMock from '../services/fixtures/org-selector.mock.json';
import { logger } from '../services/logger.service';
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { OrgIdentityResolver } from '../services/org-identity-resolver.service';
import { OrgRoleGrantsService } from '../services/org-role-grants.service';
import { getEffectiveUsername } from '../utils/auth-helper';
import { isMockOrgItemsEnabled } from '../utils/mock-org-items.util';

interface MockCanonicalExtras {
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  sector?: string | null;
  numberOfEmployees?: number | null;
  parentUid?: string | null;
}

/** Standard 8-4-4-4-12 hex UUID regex. Used to dispatch the polymorphic `/:id` route. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface MemberServiceB2bOrgResponse {
  uid: string;
  sfid?: string | null;
  name: string;
  description?: string | null;
  website?: string | null;
  primary_domain?: string | null;
  logo_url?: string | null;
  industry?: string | null;
  sector?: string | null;
  number_of_employees?: number | null;
  parent_uid?: string | null;
  is_member?: boolean;
}

/**
 * Single controller hosting BOTH new org-identity BFF routes (`/me/role-grants`
 * and the polymorphic canonical-record endpoint). Created as a skeleton in
 * Phase 2 (foundational) so US3 + US4 implementation phases each fill in one
 * method without phase-ordering conflicts.
 */
export class OrgIdentityController {
  private readonly orgRoleGrantsService: OrgRoleGrantsService;
  private readonly orgIdentityResolver: OrgIdentityResolver;
  private readonly microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.orgRoleGrantsService = new OrgRoleGrantsService();
    this.orgIdentityResolver = OrgIdentityResolver.getInstance();
    this.microserviceProxy = new MicroserviceProxyService();
  }

  /**
   * `GET /api/orgs/me/role-grants` — returns the caller's writer/auditor uid sets.
   * See `contracts/bff-org-role-grants.md`.
   */
  public async getRoleGrants(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_org_role_grants');

    try {
      const username = getEffectiveUsername(req);
      if (!username) {
        throw ServiceValidationError.forField('username', 'Authenticated username is required', {
          operation: 'get_org_role_grants',
          service: 'org_identity_controller',
          path: req.path,
        });
      }

      const result: RoleGrantsResponse = await this.orgRoleGrantsService.getRoleGrants(req, username);

      logger.success(req, 'get_org_role_grants', startTime, {
        writer_count: result.writers.length,
        auditor_count: result.auditors.length,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * `GET /api/orgs/uid/:uid` | `/sfid/:accountId` | polymorphic `/:id` — returns
   * the canonical b2b_org record from member-service. Per `contracts/bff-org-canonical-record.md`,
   * a single method handles all three route shapes by inspecting `req.params`
   * and detecting UUID format when dispatched via the polymorphic route.
   */
  public async getCanonicalRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    const startTime = logger.startOperation(req, 'get_org_canonical_record');

    try {
      const { identifier, identifierKind } = this.extractIdentifier(req);

      if (isMockOrgItemsEnabled()) {
        const mockResponse = this.getMockCanonicalRecord(identifier, identifierKind);
        if (!mockResponse) {
          res.status(404).json({ error: 'Organization not found' });
          logger.success(req, 'get_org_canonical_record', startTime, {
            identifier_kind: identifierKind,
            uid: null,
            status_code: 404,
            mock: true,
          });
          return;
        }
        logger.success(req, 'get_org_canonical_record', startTime, {
          identifier_kind: identifierKind,
          uid: mockResponse.uid,
          has_parent: !!mockResponse.parentUid,
          mock: true,
        });
        res.setHeader('Cache-Control', 'no-store');
        res.json(mockResponse);
        return;
      }

      // `identifier_cache_hit` reflects whether the sfid→uid LRU lookup served the
      // request without an upstream call. For `uid`-routed requests no resolver
      // lookup happens, so we report it as `null` rather than a tautological
      // boolean — keeps the operational cache-hit-ratio metric meaningful.
      let uid: string | null = identifier;
      let identifierCacheHit: boolean | null = null;
      if (identifierKind === 'sfid') {
        const result = await this.orgIdentityResolver.getUidBySfid(identifier, req);
        uid = result.uid;
        identifierCacheHit = result.cacheHit;
        if (!uid) {
          res.status(404).json({ error: 'Organization not found' });
          logger.success(req, 'get_org_canonical_record', startTime, {
            identifier_kind: identifierKind,
            uid: null,
            status_code: 404,
            identifier_cache_hit: identifierCacheHit,
          });
          return;
        }
      }

      const record = await this.fetchCanonicalRecord(req, uid);
      if (!record) {
        res.status(404).json({ error: 'Organization not found' });
        logger.success(req, 'get_org_canonical_record', startTime, {
          identifier_kind: identifierKind,
          uid,
          status_code: 404,
          identifier_cache_hit: identifierCacheHit,
        });
        return;
      }

      const response = this.toCanonicalRecord(record);

      logger.success(req, 'get_org_canonical_record', startTime, {
        identifier_kind: identifierKind,
        uid: response.uid,
        has_parent: !!response.parentUid,
        identifier_cache_hit: identifierCacheHit,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json(response);
    } catch (error) {
      // Map member-service 5xx → 502 Bad Gateway per the contract.
      if (error instanceof MicroserviceError && error.statusCode >= 500) {
        logger.warning(req, 'get_org_canonical_record', 'Member-service upstream failure', {
          err: error,
          upstream_status: error.statusCode,
        });
        res.status(502).json({ error: 'Upstream member-service failure' });
        return;
      }
      // Map member-service 404 → 404 (deliberate no-information-leak).
      if (error instanceof MicroserviceError && error.statusCode === 404) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }
      next(error);
    }
  }

  /**
   * Resolves `req.params` into `{ identifier, identifierKind }`. Supports:
   * - `/uid/:uid` → `{ identifier: req.params.uid, identifierKind: 'uid' }`
   * - `/sfid/:accountId` → `{ identifier: req.params.accountId, identifierKind: 'sfid' }`
   * - polymorphic `/:id` → detect UUID format and dispatch accordingly
   *
   * Mirrors the project-controller polymorphic dispatch pattern (project.controller.ts L113–122).
   */
  private extractIdentifier(req: Request): { identifier: string; identifierKind: 'uid' | 'sfid' } {
    const { uid, accountId, id } = req.params;
    if (uid) {
      this.assertNonEmpty(uid, 'uid', 'get_org_canonical_record', req.path);
      return { identifier: uid, identifierKind: 'uid' };
    }
    if (accountId) {
      this.assertNonEmpty(accountId, 'accountId', 'get_org_canonical_record', req.path);
      return { identifier: accountId, identifierKind: 'sfid' };
    }
    if (id) {
      this.assertNonEmpty(id, 'id', 'get_org_canonical_record', req.path);
      return { identifier: id, identifierKind: UUID_PATTERN.test(id) ? 'uid' : 'sfid' };
    }
    throw ServiceValidationError.forField('id', 'Identifier path parameter is required', {
      operation: 'get_org_canonical_record',
      service: 'org_identity_controller',
      path: req.path,
    });
  }

  private assertNonEmpty(value: string, field: string, operation: string, path: string): void {
    if (typeof value !== 'string' || value.trim() === '') {
      throw ServiceValidationError.forField(field, `${field} is required`, {
        operation,
        service: 'org_identity_controller',
        path,
      });
    }
  }

  private async fetchCanonicalRecord(req: Request, uid: string): Promise<MemberServiceB2bOrgResponse | null> {
    try {
      return await this.microserviceProxy.proxyRequest<MemberServiceB2bOrgResponse>(req, 'LFX_V2_SERVICE', `/b2b_orgs/${encodeURIComponent(uid)}`, 'GET');
    } catch (error) {
      // Let 404s fall through as null so the caller emits a consistent 404 envelope;
      // re-throw everything else so the catch in `getCanonicalRecord` can map to 502.
      if (error instanceof MicroserviceError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Local-dev mock branch. Looks the row up by uid OR sfid against the
   * org-selector fixture and overlays `canonicalExtras` metadata where defined.
   * Returns null when the identifier doesn't map to any fixture row so the
   * caller emits the 404 envelope consistent with the prod contract.
   */
  private getMockCanonicalRecord(identifier: string, identifierKind: 'uid' | 'sfid'): OrgCanonicalRecord | null {
    const items = orgSelectorMock.items as OrgItem[];
    const match = identifierKind === 'uid' ? items.find((item) => item.uid === identifier) : items.find((item) => item.accountId === identifier);
    if (!match) return null;
    const extrasMap = (orgSelectorMock.canonicalExtras ?? {}) as Record<string, MockCanonicalExtras>;
    const extras = extrasMap[match.uid] ?? {};
    return {
      uid: match.uid,
      accountId: match.accountId ?? null,
      name: match.name,
      description: extras.description ?? null,
      website: extras.website ?? null,
      primaryDomain: match.primaryDomain ?? null,
      logoUrl: match.logoUrl ?? null,
      industry: extras.industry ?? null,
      sector: extras.sector ?? null,
      numberOfEmployees: extras.numberOfEmployees ?? null,
      parentUid: extras.parentUid ?? null,
      isMember: match.isMember ?? false,
    };
  }

  /** Member-service returns snake_case; the BFF contract is camelCase. */
  private toCanonicalRecord(raw: MemberServiceB2bOrgResponse): OrgCanonicalRecord {
    return {
      uid: raw.uid,
      accountId: raw.sfid ?? null,
      name: raw.name,
      description: raw.description ?? null,
      website: raw.website ?? null,
      primaryDomain: raw.primary_domain ?? null,
      logoUrl: raw.logo_url ?? null,
      industry: raw.industry ?? null,
      sector: raw.sector ?? null,
      numberOfEmployees: raw.number_of_employees ?? null,
      parentUid: raw.parent_uid ?? null,
      isMember: raw.is_member ?? false,
    };
  }
}
