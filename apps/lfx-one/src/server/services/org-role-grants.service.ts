// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ORG_ROLE_GRANTS_HARD_CAP } from '@lfx-one/shared/constants';
import { QueryServiceResponse, RoleGrantsResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { isMockOrgItemsEnabled } from '../utils/mock-org-items.util';
import orgSelectorMock from './fixtures/org-selector.mock.json';
import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/**
 * Shape of the `b2b_org_settings.data` payload returned by the query-service for
 * the "what can I see" pattern. Each settings doc lists the writer/auditor
 * usernames the caller may potentially appear in.
 */
interface B2bOrgSettingsDoc {
  writers?: { username?: string | null }[];
  auditors?: { username?: string | null }[];
}

/**
 * Loads the caller's role grants across all `b2b_org_settings` docs they have
 * FGA visibility into. Implements the "what can I see" pattern from the UI
 * Onboarding Toolkit §2; see `contracts/bff-org-role-grants.md`.
 *
 * Per spec FR-005 / contract: upstream failures are downgraded to an empty
 * grants response (200 OK with empty arrays) and a warning log — clients
 * cannot distinguish failure from genuine zero-grants users, which is
 * intentional so the selector falls back to the persona-seeds branch.
 */
export class OrgRoleGrantsService {
  private readonly microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.microserviceProxy = new MicroserviceProxyService();
  }

  public async getRoleGrants(req: Request, username: string): Promise<RoleGrantsResponse> {
    const loadedAt = new Date().toISOString();

    if (isMockOrgItemsEnabled()) {
      logger.debug(req, 'get_org_role_grants_mock', 'Returning fixture role grants', { mock: true });
      const grants = orgSelectorMock.roleGrants as { writers: string[]; auditors: string[] };
      return {
        writers: grants.writers,
        auditors: grants.auditors,
        username,
        loaded_at: loadedAt,
      };
    }

    try {
      const response = await this.microserviceProxy.proxyRequest<QueryServiceResponse<B2bOrgSettingsDoc>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', {
        type: 'b2b_org_settings',
        filters_or: [`writers.username:${username}`, `auditors.username:${username}`],
        per_page: ORG_ROLE_GRANTS_HARD_CAP,
      });

      return this.reduceToFlatArrays(response, username, loadedAt);
    } catch (error) {
      logger.warning(req, 'get_org_role_grants', 'Upstream failure — returning empty grants', { err: error });
      return { writers: [], auditors: [], username, loaded_at: loadedAt };
    }
  }

  /**
   * Reduces the nested settings-doc shape to two flat `string[]` of uids,
   * enforcing the writer-wins invariant per the contract: when the caller is
   * BOTH writer and auditor on the same org, only the writer set carries it.
   */
  private reduceToFlatArrays(response: QueryServiceResponse<B2bOrgSettingsDoc> | null, username: string, loadedAt: string): RoleGrantsResponse {
    const writers: string[] = [];
    const auditors: string[] = [];

    const resources = response?.resources ?? [];
    for (const resource of resources) {
      const orgUid = resource.id;
      if (!orgUid) continue;

      const isWriter = (resource.data?.writers ?? []).some((entry) => entry?.username === username);
      if (isWriter) {
        writers.push(orgUid);
        continue;
      }

      const isAuditor = (resource.data?.auditors ?? []).some((entry) => entry?.username === username);
      if (isAuditor) {
        auditors.push(orgUid);
      }
    }

    return { writers, auditors, username, loaded_at: loadedAt };
  }
}
