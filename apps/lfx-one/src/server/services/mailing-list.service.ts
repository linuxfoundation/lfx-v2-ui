// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import {
  CreateGroupsIOServiceRequest,
  CreateMailingListMemberRequest,
  CreateMailingListRequest,
  GroupsIOMailingList,
  GroupsIOService,
  MailingListMember,
  QueryServiceCountResponse,
  QueryServiceResponse,
  UpdateGroupsIOServiceRequest,
  UpdateMailingListMemberRequest,
} from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { ResourceNotFoundError } from '../errors';
import { pollEndpoint } from '../helpers/poll-endpoint.helper';
import { AccessCheckService } from './access-check.service';
import { logger } from './logger.service';
import { MicroserviceProxyService } from './microservice-proxy.service';

/**
 * Service for handling mailing list business logic
 * Supports Groups.io provider with extensible design for future providers
 */
export class MailingListService {
  private accessCheckService: AccessCheckService;
  private microserviceProxy: MicroserviceProxyService;

  public constructor() {
    this.accessCheckService = new AccessCheckService();
    this.microserviceProxy = new MicroserviceProxyService();
  }

  // ============================================
  // Groups.io Service Methods
  // ============================================

  /**
   * Fetches all Groups.io services based on query parameters
   */
  public async getServices(req: Request, query: Record<string, unknown> = {}): Promise<GroupsIOService[]> {
    const params = {
      ...query,
      type: 'groupsio_service',
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOService>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      params
    );

    const services = resources.map((resource) => resource.data);

    // Add writer access field to all services
    return await this.accessCheckService.addAccessToResources(req, services, 'groupsio_service');
  }

  /**
   * Fetches the count of Groups.io services based on query parameters
   */
  public async getServicesCount(req: Request, query: Record<string, unknown> = {}): Promise<number> {
    const params = {
      ...query,
      type: 'groupsio_service',
    };

    const { count } = await this.microserviceProxy.proxyRequest<QueryServiceCountResponse>(req, 'LFX_V2_SERVICE', '/query/resources/count', 'GET', params);

    return count;
  }

  /**
   * Fetches a single Groups.io service by ID
   */
  public async getServiceById(req: Request, serviceId: string): Promise<GroupsIOService> {
    const params = {
      type: 'groupsio_service',
      tags: `service_uid:${serviceId}`,
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOService>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      params
    );

    if (!resources || resources.length === 0) {
      throw new ResourceNotFoundError('Groups.io Service', serviceId, {
        operation: 'get_service_by_id',
        service: 'mailing_list_service',
        path: `/groupsio/services/${serviceId}`,
      });
    }

    const service = resources[0].data;

    // Add writer access field to the service
    return await this.accessCheckService.addAccessToResource(req, service, 'groupsio_service');
  }

  /**
   * Creates a new Groups.io service
   */
  public async createService(req: Request, data: CreateGroupsIOServiceRequest): Promise<GroupsIOService> {
    const newService = await this.microserviceProxy.proxyRequest<GroupsIOService>(req, 'LFX_V2_SERVICE', '/groupsio/services', 'POST', { v: '1' }, data);

    logger.debug(req, 'create_groupsio_service', 'Groups.io service created successfully', {
      service_uid: newService.uid,
      project_uid: newService.project_uid,
    });

    // Poll the query service until the service is indexed
    const serviceUid = newService.uid;
    let fetchedService: GroupsIOService | undefined;

    const resolved = await pollEndpoint({
      req,
      operation: 'create_groupsio_service',
      pollFn: async () => {
        const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOService>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            type: 'groupsio_service',
            tags: `service_uid:${serviceUid}`,
          }
        );
        if (resources.length > 0) {
          fetchedService = resources[0].data;
          return true;
        }
        return false;
      },
      metadata: { service_uid: serviceUid },
    });

    if (resolved && fetchedService) {
      return fetchedService;
    }

    logger.warning(req, 'create_groupsio_service', 'Service not yet indexed in query service, returning POST response', { service_uid: serviceUid });
    return newService;
  }

  /**
   * Updates an existing Groups.io service
   */
  public async updateService(req: Request, serviceId: string, data: UpdateGroupsIOServiceRequest): Promise<GroupsIOService> {
    const updatedService = await this.microserviceProxy.proxyRequest<GroupsIOService>(
      req,
      'LFX_V2_SERVICE',
      `/groupsio/services/${serviceId}`,
      'PUT',
      { v: '1' },
      data
    );

    logger.debug(req, 'update_groupsio_service', 'Groups.io service updated successfully', {
      service_uid: serviceId,
    });

    return updatedService;
  }

  /**
   * Deletes a Groups.io service
   */
  public async deleteService(req: Request, serviceId: string): Promise<void> {
    await this.microserviceProxy.proxyRequest<void>(req, 'LFX_V2_SERVICE', `/groupsio/services/${serviceId}`, 'DELETE', { v: '1' });

    logger.debug(req, 'delete_groupsio_service', 'Groups.io service deleted successfully', {
      service_uid: serviceId,
    });

    // Poll the query service until the service is removed from the index
    await pollEndpoint({
      req,
      operation: 'delete_groupsio_service',
      pollFn: async () => {
        const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOService>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            type: 'groupsio_service',
            tags: `service_uid:${serviceId}`,
          }
        );
        return resources.length === 0;
      },
      metadata: { service_uid: serviceId },
    });
  }

  // ============================================
  // Mailing List Methods
  // ============================================

  /**
   * Fetches all mailing lists based on query parameters
   */
  public async getMailingLists(req: Request, query: Record<string, unknown> = {}): Promise<GroupsIOMailingList[]> {
    const params = {
      ...query,
      type: 'groupsio_mailing_list',
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOMailingList>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      params
    );

    let mailingLists = resources.map((resource) => resource.data);

    // Enrich with service data
    mailingLists = await this.enrichWithServices(req, mailingLists);

    // Add writer access field to all mailing lists
    return await this.accessCheckService.addAccessToResources(req, mailingLists, 'groupsio_mailing_list');
  }

  /**
   * Fetches the count of mailing lists based on query parameters
   */
  public async getMailingListsCount(req: Request, query: Record<string, unknown> = {}): Promise<number> {
    const params = {
      ...query,
      type: 'groupsio_mailing_list',
    };

    const { count } = await this.microserviceProxy.proxyRequest<QueryServiceCountResponse>(req, 'LFX_V2_SERVICE', '/query/resources/count', 'GET', params);

    return count;
  }

  /**
   * Fetches a single mailing list by ID
   */
  public async getMailingListById(req: Request, mailingListId: string): Promise<GroupsIOMailingList> {
    const params = {
      type: 'groupsio_mailing_list',
      tags: `groupsio_mailing_list_uid:${mailingListId}`,
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOMailingList>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      params
    );

    if (!resources || resources.length === 0) {
      throw new ResourceNotFoundError('Mailing List', mailingListId, {
        operation: 'get_mailing_list_by_id',
        service: 'mailing_list_service',
        path: `/groupsio/mailing-lists/${mailingListId}`,
      });
    }

    // Enrich with service data (single item as array for reuse)
    const enriched = await this.enrichWithServices(req, [resources[0].data]);
    const mailingList = enriched[0];

    // Add writer access field to the mailing list
    return await this.accessCheckService.addAccessToResource(req, mailingList, 'groupsio_mailing_list');
  }

  /**
   * Creates a new mailing list
   */
  public async createMailingList(req: Request, data: CreateMailingListRequest): Promise<GroupsIOMailingList> {
    const newMailingList = await this.microserviceProxy.proxyRequest<GroupsIOMailingList>(
      req,
      'LFX_V2_SERVICE',
      '/groupsio/mailing-lists',
      'POST',
      { v: '1' },
      data
    );

    logger.debug(req, 'create_mailing_list', 'Mailing list created successfully', {
      mailing_list_uid: newMailingList.uid,
      service_uid: newMailingList.service_uid,
    });

    // Poll the query service until the mailing list is indexed
    const mailingListUid = newMailingList.uid;
    let fetchedMailingList: GroupsIOMailingList | undefined;

    const resolved = await pollEndpoint({
      req,
      operation: 'create_mailing_list',
      pollFn: async () => {
        const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOMailingList>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            type: 'groupsio_mailing_list',
            tags: `groupsio_mailing_list_uid:${mailingListUid}`,
          }
        );
        if (resources.length > 0) {
          fetchedMailingList = resources[0].data;
          return true;
        }
        return false;
      },
      metadata: { mailing_list_uid: mailingListUid },
    });

    if (resolved && fetchedMailingList) {
      return fetchedMailingList;
    }

    logger.warning(req, 'create_mailing_list', 'Mailing list not yet indexed in query service, returning POST response', { mailing_list_uid: mailingListUid });
    return newMailingList;
  }

  /**
   * Updates an existing mailing list
   */
  public async updateMailingList(req: Request, mailingListId: string, data: Partial<CreateMailingListRequest>): Promise<GroupsIOMailingList> {
    const updatedMailingList = await this.microserviceProxy.proxyRequest<GroupsIOMailingList>(
      req,
      'LFX_V2_SERVICE',
      `/groupsio/mailing-lists/${mailingListId}`,
      'PUT',
      { v: '1' },
      data
    );

    logger.debug(req, 'update_mailing_list', 'Mailing list updated successfully', {
      mailing_list_uid: mailingListId,
    });

    return updatedMailingList;
  }

  /**
   * Deletes a mailing list
   */
  public async deleteMailingList(req: Request, mailingListId: string): Promise<void> {
    await this.microserviceProxy.proxyRequest<void>(req, 'LFX_V2_SERVICE', `/groupsio/mailing-lists/${mailingListId}`, 'DELETE', { v: '1' });

    logger.debug(req, 'delete_mailing_list', 'Mailing list deleted successfully', {
      mailing_list_uid: mailingListId,
    });

    // Poll the query service until the mailing list is removed from the index
    await pollEndpoint({
      req,
      operation: 'delete_mailing_list',
      pollFn: async () => {
        const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOMailingList>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            type: 'groupsio_mailing_list',
            tags: `groupsio_mailing_list_uid:${mailingListId}`,
          }
        );
        return resources.length === 0;
      },
      metadata: { mailing_list_uid: mailingListId },
    });
  }

  // ============================================
  // Mailing List Member Methods
  // ============================================

  /**
   * Fetches all members for a mailing list using query service
   */
  public async getMembers(req: Request, mailingListId: string, query: Record<string, unknown> = {}): Promise<MailingListMember[]> {
    const params = {
      ...query,
      type: 'groupsio_member',
      tags: `mailing_list_uid:${mailingListId}`,
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<MailingListMember>>(
      req,
      'LFX_V2_SERVICE',
      '/query/resources',
      'GET',
      params
    );

    const members = resources.map((resource) => resource.data);

    // Add writer access field to all members
    return await this.accessCheckService.addAccessToResources(req, members, 'groupsio_member');
  }

  /**
   * Fetches the count of members for a mailing list
   */
  public async getMembersCount(req: Request, mailingListId: string, query: Record<string, unknown> = {}): Promise<number> {
    const params = {
      ...query,
      type: 'groupsio_member',
      tags: `mailing_list_uid:${mailingListId}`,
    };

    const { count } = await this.microserviceProxy.proxyRequest<QueryServiceCountResponse>(req, 'LFX_V2_SERVICE', '/query/resources/count', 'GET', params);

    return count;
  }

  /**
   * Fetches a single member by ID
   */
  public async getMemberById(req: Request, mailingListId: string, memberId: string): Promise<MailingListMember> {
    const member = await this.microserviceProxy.proxyRequest<MailingListMember>(
      req,
      'LFX_V2_SERVICE',
      `/groupsio/mailing-lists/${mailingListId}/members/${memberId}`,
      'GET',
      { v: '1' }
    );

    if (!member) {
      throw new ResourceNotFoundError('Mailing List Member', memberId, {
        operation: 'get_member_by_id',
        service: 'mailing_list_service',
        path: `/groupsio/mailing-lists/${mailingListId}/members/${memberId}`,
      });
    }

    // Add writer access field to the member
    return await this.accessCheckService.addAccessToResource(req, member, 'groupsio_member');
  }

  /**
   * Creates a new member in a mailing list
   */
  public async createMember(req: Request, mailingListId: string, data: CreateMailingListMemberRequest): Promise<MailingListMember> {
    const newMember = await this.microserviceProxy.proxyRequest<MailingListMember>(
      req,
      'LFX_V2_SERVICE',
      `/groupsio/mailing-lists/${mailingListId}/members`,
      'POST',
      { v: '1' },
      data
    );

    logger.debug(req, 'create_mailing_list_member', 'Mailing list member created successfully', {
      mailing_list_uid: mailingListId,
      member_uid: newMember.uid,
    });

    // Poll the query service until the member is indexed
    const memberUid = newMember.uid;
    let fetchedMember: MailingListMember | undefined;

    const resolved = await pollEndpoint({
      req,
      operation: 'create_mailing_list_member',
      pollFn: async () => {
        const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<MailingListMember>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            type: 'groupsio_member',
            tags: `member_uid:${memberUid}`,
          }
        );
        if (resources.length > 0) {
          fetchedMember = resources[0].data;
          return true;
        }
        return false;
      },
      metadata: { mailing_list_uid: mailingListId, member_uid: memberUid },
    });

    if (resolved && fetchedMember) {
      return fetchedMember;
    }

    logger.warning(req, 'create_mailing_list_member', 'Member not yet indexed in query service, returning POST response', { member_uid: memberUid });
    return newMember;
  }

  /**
   * Updates an existing member
   */
  public async updateMember(req: Request, mailingListId: string, memberId: string, data: UpdateMailingListMemberRequest): Promise<MailingListMember> {
    const updatedMember = await this.microserviceProxy.proxyRequest<MailingListMember>(
      req,
      'LFX_V2_SERVICE',
      `/groupsio/mailing-lists/${mailingListId}/members/${memberId}`,
      'PUT',
      { v: '1' },
      data
    );

    logger.debug(req, 'update_mailing_list_member', 'Mailing list member updated successfully', {
      mailing_list_uid: mailingListId,
      member_uid: memberId,
    });

    return updatedMember;
  }

  /**
   * Deletes a member
   */
  public async deleteMember(req: Request, mailingListId: string, memberId: string): Promise<void> {
    await this.microserviceProxy.proxyRequest<void>(req, 'LFX_V2_SERVICE', `/groupsio/mailing-lists/${mailingListId}/members/${memberId}`, 'DELETE', {
      v: '1',
    });

    logger.debug(req, 'delete_mailing_list_member', 'Mailing list member deleted successfully', {
      mailing_list_uid: mailingListId,
      member_uid: memberId,
    });

    // Poll the query service until the member is removed from the index
    await pollEndpoint({
      req,
      operation: 'delete_mailing_list_member',
      pollFn: async () => {
        const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<MailingListMember>>(
          req,
          'LFX_V2_SERVICE',
          '/query/resources',
          'GET',
          {
            type: 'groupsio_member',
            tags: `member_uid:${memberId}`,
          }
        );
        return resources.length === 0;
      },
      metadata: { mailing_list_uid: mailingListId, member_uid: memberId },
    });
  }

  // ============================================
  // Private Enrichment Methods
  // ============================================

  /**
   * Enriches mailing lists with service details
   * @description Fetches service data for mailing lists based on service_uid
   */
  private async enrichWithServices(req: Request, mailingLists: GroupsIOMailingList[]): Promise<GroupsIOMailingList[]> {
    // Get unique service UIDs from all mailing lists
    const uniqueServiceUids = [...new Set(mailingLists.filter((ml) => ml.service_uid).map((ml) => ml.service_uid))];

    if (uniqueServiceUids.length === 0) {
      return mailingLists;
    }

    logger.debug(req, 'enrich_mailing_list_services', 'Enriching mailing lists with service data', {
      unique_service_count: uniqueServiceUids.length,
      mailing_list_count: mailingLists.length,
    });

    // Fetch services in parallel
    const serviceMap = new Map<string, GroupsIOService | undefined>();
    await Promise.all(
      uniqueServiceUids.map(async (uid) => {
        try {
          const params = {
            type: 'groupsio_service',
            tags: `service_uid:${uid}`,
          };

          const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<GroupsIOService>>(
            req,
            'LFX_V2_SERVICE',
            '/query/resources',
            'GET',
            params
          );

          if (resources && resources.length > 0) {
            serviceMap.set(uid, resources[0].data);
          } else {
            serviceMap.set(uid, undefined);
          }
        } catch {
          logger.warning(req, 'enrich_mailing_list_services', 'Service fetch failed; continuing without service data', {
            service_uid: uid,
          });
          serviceMap.set(uid, undefined);
        }
      })
    );

    // Add service to each mailing list
    return mailingLists.map((ml) => {
      if (!ml.service_uid) {
        return ml;
      }

      const service = serviceMap.get(ml.service_uid);
      if (!service) {
        return ml;
      }

      return {
        ...ml,
        service,
      };
    });
  }
}
