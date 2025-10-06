// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NATS_CONFIG } from '@lfx-one/shared/constants';
import { NatsSubjects } from '@lfx-one/shared/enums';
import { Project, ProjectSettings, ProjectSlugToIdResponse, QueryServiceResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { ResourceNotFoundError } from '../errors';
import { serverLogger } from '../server';
import { AccessCheckService } from './access-check.service';
import { ETagService } from './etag.service';
import { MicroserviceProxyService } from './microservice-proxy.service';
import { NatsService } from './nats.service';

/**
 * Service for handling project business logic
 */
export class ProjectService {
  private accessCheckService: AccessCheckService;
  private microserviceProxy: MicroserviceProxyService;
  private natsService: NatsService;
  private etagService: ETagService;

  public constructor() {
    this.accessCheckService = new AccessCheckService();
    this.microserviceProxy = new MicroserviceProxyService();
    this.natsService = new NatsService();
    this.etagService = new ETagService();
  }

  /**
   * Fetches all projects based on query parameters
   */
  public async getProjects(req: Request, query: Record<string, any> = {}): Promise<Project[]> {
    const params = {
      ...query,
      type: 'project',
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Project>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', params);

    const projects = resources.map((resource) => resource.data);

    // Add writer access field to all projects
    return await this.accessCheckService.addAccessToResources(req, projects, 'project');
  }

  /**
   * Fetches a single project by ID
   */
  public async getProjectById(req: Request, projectId: string, access: boolean = true): Promise<Project> {
    const params = {
      type: 'project',
      tags: projectId,
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Project>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', params);

    if (!resources || resources.length === 0) {
      throw new ResourceNotFoundError('Project', projectId, {
        operation: 'get_project_by_id',
        service: 'project_service',
        path: '/query/resources',
      });
    }

    if (resources.length > 1) {
      req.log.warn(
        {
          project_id: projectId,
          result_count: resources.length,
        },
        'Multiple projects found for single ID lookup'
      );
    }

    const project = resources[0].data;

    // Add writer access field to the project
    if (access) {
      return await this.accessCheckService.addAccessToResource(req, project, 'project');
    }

    return project;
  }

  /**
   * Search projects by name
   */
  public async searchProjects(req: Request, searchQuery: string): Promise<Project[]> {
    const params = {
      type: 'project',
      name: searchQuery,
    };

    const { resources } = await this.microserviceProxy.proxyRequest<QueryServiceResponse<Project>>(req, 'LFX_V2_SERVICE', '/query/resources', 'GET', params);

    return resources.map((resource) => resource.data);
  }

  /**
   * Fetches a single project by slug using NATS for slug resolution
   * First resolves slug to ID via NATS, then fetches project data
   */
  public async getProjectBySlug(req: Request, projectSlug: string): Promise<Project> {
    req.log.info(
      {
        slug: projectSlug,
        operation: 'get_project_by_slug_via_nats',
        step: 'nats_lookup',
      },
      'Resolving project slug to ID via NATS'
    );

    const natsResult = await this.getProjectIdBySlug(projectSlug);

    if (!natsResult.exists || !natsResult.projectId) {
      throw new ResourceNotFoundError('Project', projectSlug, {
        operation: 'get_project_by_slug_via_nats',
        service: 'project_service',
        path: '/nats/project-slug-lookup',
      });
    }

    req.log.info(
      {
        slug: projectSlug,
        project_id: natsResult.projectId,
        operation: 'get_project_by_slug_via_nats',
        step: 'nats_success',
      },
      'Successfully resolved slug to ID via NATS'
    );

    // Now fetch the project using the resolved ID
    return this.getProjectById(req, natsResult.projectId);
  }

  public async getProjectSettings(req: Request, projectId: string): Promise<ProjectSettings> {
    return await this.microserviceProxy.proxyRequest<ProjectSettings>(req, 'LFX_V2_SERVICE', `/projects/${projectId}/settings`, 'GET');
  }

  /**
   * Unified method to update project permissions using ETag for safe updates
   */
  public async updateProjectPermissions(
    req: Request,
    projectId: string,
    operation: 'add' | 'update' | 'remove',
    usernameOrEmail: string,
    role?: 'view' | 'manage',
    manualUserInfo?: { name: string; email: string; username: string; avatar?: string }
  ): Promise<ProjectSettings> {
    // Step 1: Determine the appropriate identifier for backend operations
    // For emails, use the sub; for usernames, use the username directly
    let backendIdentifier = usernameOrEmail.trim();
    if (usernameOrEmail.includes('@')) {
      // For emails, get the sub for backend operations
      backendIdentifier = await this.resolveEmailToSub(req, usernameOrEmail);
    }

    // Step 2: Fetch current settings with ETag
    const { data: settings, etag } = await this.etagService.fetchWithETag<ProjectSettings>(
      req,
      'LFX_V2_SERVICE',
      `/projects/${projectId}/settings`,
      `${operation}_user_project_permissions`
    );

    // Step 3: Update the settings based on operation
    const updatedSettings = { ...settings };

    // Initialize arrays if they don't exist
    if (!updatedSettings.writers) updatedSettings.writers = [];
    if (!updatedSettings.auditors) updatedSettings.auditors = [];

    // Remove user from both arrays first (for all operations)
    // Compare by username property since writers/auditors are now UserInfo objects
    // Use backendIdentifier (sub) for comparison to ensure proper removal
    updatedSettings.writers = updatedSettings.writers.filter((u) => u.username !== backendIdentifier);
    updatedSettings.auditors = updatedSettings.auditors.filter((u) => u.username !== backendIdentifier);

    // For 'add' or 'update', we need to add the user back with full UserInfo
    if (operation === 'add' || operation === 'update') {
      if (!role) {
        throw new Error('Role is required for add/update operations');
      }

      // Use manual user info if provided, otherwise fetch from NATS
      let userInfo: { name: string; email: string; username: string; avatar?: string };
      if (manualUserInfo) {
        req.log.info(
          {
            username: backendIdentifier,
            operation: `${operation}_user_project_permissions`,
          },
          'Using manually provided user info'
        );
        userInfo = {
          name: manualUserInfo.name,
          email: manualUserInfo.email,
          username: backendIdentifier, // Use the sub for backend consistency
        };
        // Only include avatar if it's provided and not empty
        if (manualUserInfo.avatar) {
          userInfo.avatar = manualUserInfo.avatar;
        }
      } else {
        // Fetch user info from user service via NATS using the original input
        const fetchedUserInfo = await this.getUserInfo(req, usernameOrEmail);
        // Use the backend identifier (sub) for the username in the stored UserInfo for backend consistency
        userInfo = {
          ...fetchedUserInfo,
          username: backendIdentifier, // Use the sub for backend consistency
        };
      }

      if (role === 'manage') {
        updatedSettings.writers = [...updatedSettings.writers, userInfo];
      } else {
        updatedSettings.auditors = [...updatedSettings.auditors, userInfo];
      }
    }
    // For 'remove' operation, user is already removed from both arrays above

    // Step 3: Clean up empty avatar fields before sending to API
    // The API validation doesn't accept empty strings for avatar URLs
    updatedSettings.writers = updatedSettings.writers.map((user) => {
      const cleanUser: any = {
        name: user.name,
        email: user.email,
        username: user.username,
      };
      if (user.avatar && user.avatar.trim() !== '') {
        cleanUser.avatar = user.avatar;
      }
      return cleanUser;
    });

    updatedSettings.auditors = updatedSettings.auditors.map((user) => {
      const cleanUser: any = {
        name: user.name,
        email: user.email,
        username: user.username,
      };
      if (user.avatar && user.avatar.trim() !== '') {
        cleanUser.avatar = user.avatar;
      }
      return cleanUser;
    });

    // Step 4: Update settings with ETag
    const result = await this.etagService.updateWithETag<ProjectSettings>(
      req,
      'LFX_V2_SERVICE',
      `/projects/${projectId}/settings`,
      etag,
      updatedSettings,
      `${operation}_user_project_permissions`
    );

    req.log.info(
      {
        operation: `${operation}_user_project_permissions`,
        project_id: projectId,
        username: backendIdentifier,
        role: role || 'N/A',
      },
      `User ${operation} operation completed successfully`
    );

    return result;
  }

  /**
   * Resolve email address to sub using NATS request-reply pattern
   * @param req - Express request object for logging
   * @param email - Email address to lookup
   * @returns Sub associated with the email (used for backend auditors/writers)
   * @throws ResourceNotFoundError if user not found
   */
  public async resolveEmailToSub(req: Request, email: string): Promise<string> {
    const codec = this.natsService.getCodec();

    // Normalize email input
    const normalizedEmail = email.trim().toLowerCase();

    try {
      req.log.info({ email: normalizedEmail }, 'Resolving email to sub via NATS');

      const response = await this.natsService.request(NatsSubjects.EMAIL_TO_SUB, codec.encode(normalizedEmail), { timeout: NATS_CONFIG.REQUEST_TIMEOUT });

      const responseText = codec.decode(response.data);

      // Parse once and branch on the result shape
      let username: string;
      try {
        const parsed = JSON.parse(responseText);

        // Check if it's an error response
        if (typeof parsed === 'object' && parsed !== null && parsed.success === false) {
          req.log.info({ email: normalizedEmail, error: parsed.error }, 'User email not found via NATS');

          throw new ResourceNotFoundError('User', normalizedEmail, {
            operation: 'resolve_email_to_sub',
            service: 'project_service',
            path: '/nats/email-to-sub',
          });
        }

        // Extract sub (username) from JSON success response or JSON string
        username = typeof parsed === 'string' ? parsed : parsed.sub || parsed.username;
      } catch (parseError) {
        // Re-throw ResourceNotFoundError as-is
        if (parseError instanceof ResourceNotFoundError) {
          throw parseError;
        }

        // JSON parsing failed - use raw text as username
        username = responseText;
      }

      // Trim and validate sub (username)
      username = username.trim();

      if (!username || username === '') {
        req.log.info({ email: normalizedEmail }, 'Empty sub returned from NATS');

        throw new ResourceNotFoundError('User', normalizedEmail, {
          operation: 'resolve_email_to_sub',
          service: 'project_service',
          path: '/nats/email-to-sub',
        });
      }

      req.log.info({ email: normalizedEmail, sub: username }, 'Successfully resolved email to sub');

      return username;
    } catch (error) {
      // Re-throw ResourceNotFoundError as-is
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }

      req.log.error({ error: error instanceof Error ? error.message : error, email: normalizedEmail }, 'Failed to resolve email to sub via NATS');

      // If it's a timeout or no responder error, treat as not found
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('503'))) {
        throw new ResourceNotFoundError('User', normalizedEmail, {
          operation: 'resolve_email_to_sub',
          service: 'project_service',
          path: '/nats/email-to-sub',
        });
      }

      throw error;
    }
  }

  /**
   * Resolve email address to username using NATS request-reply pattern
   * @param req - Express request object for logging
   * @param email - Email address to lookup
   * @returns Username associated with the email (used for display purposes)
   * @throws ResourceNotFoundError if user not found
   */
  public async resolveEmailToUsername(req: Request, email: string): Promise<string> {
    const codec = this.natsService.getCodec();

    // Normalize email input
    const normalizedEmail = email.trim().toLowerCase();

    try {
      req.log.info({ email: normalizedEmail }, 'Resolving email to username via NATS');

      const response = await this.natsService.request(NatsSubjects.EMAIL_TO_USERNAME, codec.encode(normalizedEmail), { timeout: NATS_CONFIG.REQUEST_TIMEOUT });

      const responseText = codec.decode(response.data);

      // Parse once and branch on the result shape
      let username: string;
      try {
        const parsed = JSON.parse(responseText);

        // Check if it's an error response
        if (typeof parsed === 'object' && parsed !== null && parsed.success === false) {
          req.log.info({ email: normalizedEmail, error: parsed.error }, 'User email not found via NATS');

          throw new ResourceNotFoundError('User', normalizedEmail, {
            operation: 'resolve_email_to_username',
            service: 'project_service',
            path: '/nats/email-to-username',
          });
        }

        // Extract username from JSON success response or JSON string
        username = typeof parsed === 'string' ? parsed : parsed.username;
      } catch (parseError) {
        // Re-throw ResourceNotFoundError as-is
        if (parseError instanceof ResourceNotFoundError) {
          throw parseError;
        }

        // JSON parsing failed - use raw text as username
        username = responseText;
      }

      // Trim and validate username
      username = username.trim();

      if (!username || username === '') {
        req.log.info({ email: normalizedEmail }, 'Empty username returned from NATS');

        throw new ResourceNotFoundError('User', normalizedEmail, {
          operation: 'resolve_email_to_username',
          service: 'project_service',
          path: '/nats/email-to-username',
        });
      }

      req.log.info({ email: normalizedEmail, username }, 'Successfully resolved email to username');

      return username;
    } catch (error) {
      // Re-throw ResourceNotFoundError as-is
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }

      req.log.error({ error: error instanceof Error ? error.message : error, email: normalizedEmail }, 'Failed to resolve email to username via NATS');

      // If it's a timeout or no responder error, treat as not found
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('503'))) {
        throw new ResourceNotFoundError('User', normalizedEmail, {
          operation: 'resolve_email_to_username',
          service: 'project_service',
          path: '/nats/email-to-username',
        });
      }

      throw error;
    }
  }

  /**
   * Fetch user information by username or email using NATS request-reply pattern
   * For emails, it resolves to username first, then uses the username for user metadata lookup
   * @param req - Express request object for logging
   * @param usernameOrEmail - Username or email to lookup
   * @returns UserInfo object with name, email, username, and optional avatar
   * @throws ResourceNotFoundError if user not found
   */
  public async getUserInfo(req: Request, usernameOrEmail: string): Promise<{ name: string; email: string; username: string; avatar?: string }> {
    const codec = this.natsService.getCodec();

    // For emails, resolve to username for the NATS lookup
    // For usernames, use them directly
    let usernameForLookup = usernameOrEmail.trim();
    let originalEmail = '';
    
    if (usernameOrEmail.includes('@')) {
      originalEmail = usernameOrEmail;
      // First confirm the user exists with email_to_sub
      await this.resolveEmailToSub(req, usernameOrEmail);
      // Then get the username for user metadata lookup
      usernameForLookup = await this.resolveEmailToUsername(req, usernameOrEmail);
      req.log.info({ email: originalEmail, resolvedUsername: usernameForLookup }, 'Resolved email to username for user metadata lookup');
    }

    try {
      req.log.info({ username: usernameForLookup }, 'Fetching user metadata via NATS');

      const response = await this.natsService.request(NatsSubjects.USER_METADATA_READ, codec.encode(usernameForLookup), { timeout: NATS_CONFIG.REQUEST_TIMEOUT });

      const responseText = codec.decode(response.data);
      const userMetadata = JSON.parse(responseText);

      // Validate response structure
      if (!userMetadata || typeof userMetadata !== 'object') {
        throw new ResourceNotFoundError('User', usernameForLookup, {
          operation: 'get_user_info',
          service: 'project_service',
          path: '/nats/user-metadata-read',
        });
      }

      // Check if it's an error response
      if (userMetadata.success === false) {
        req.log.info({ username: usernameForLookup, error: userMetadata.error }, 'User metadata not found via NATS');

        throw new ResourceNotFoundError('User', usernameForLookup, {
          operation: 'get_user_info',
          service: 'project_service',
          path: '/nats/user-metadata-read',
        });
      }

      req.log.info({ username: usernameForLookup }, 'Successfully fetched user metadata');

      const userData = userMetadata.data || {};
      
      const result: { name: string; email: string; username: string; avatar?: string } = {
        // Use the name from metadata, fallback to constructed name from given_name/family_name
        name: userData.name || `${userData.given_name || ''} ${userData.family_name || ''}`.trim() || usernameForLookup,
        // Use the original email if we had one, otherwise leave empty
        email: originalEmail || '',
        username: usernameForLookup,
      };

      // Use picture field as avatar if available
      if (userData.picture && userData.picture.trim() !== '') {
        result.avatar = userData.picture;
      }

      return result;
    } catch (error) {
      // Re-throw ResourceNotFoundError as-is
      if (error instanceof ResourceNotFoundError) {
        throw error;
      }

      req.log.error({ error: error instanceof Error ? error.message : error, username: usernameForLookup }, 'Failed to fetch user metadata via NATS');

      // If it's a timeout or no responder error, treat as not found
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('503'))) {
        throw new ResourceNotFoundError('User', usernameForLookup, {
          operation: 'get_user_info',
          service: 'project_service',
          path: '/nats/user-metadata-read',
        });
      }

      throw error;
    }
  }

  /**
   * Get project ID by slug using NATS request-reply pattern
   * @private
   */
  private async getProjectIdBySlug(slug: string): Promise<ProjectSlugToIdResponse> {
    const codec = this.natsService.getCodec();

    try {
      const response = await this.natsService.request(NatsSubjects.PROJECT_SLUG_TO_UID, codec.encode(slug), { timeout: NATS_CONFIG.REQUEST_TIMEOUT });

      const projectId = codec.decode(response.data);

      // Check if we got a valid project ID
      if (!projectId || projectId.trim() === '') {
        serverLogger.info({ slug }, 'Project slug not found via NATS');
        return {
          projectId: '',
          slug,
          exists: false,
        };
      }

      serverLogger.info({ slug, project_id: projectId }, 'Successfully resolved project slug to ID');

      return {
        projectId: projectId.trim(),
        slug,
        exists: true,
      };
    } catch (error) {
      serverLogger.error({ error: error instanceof Error ? error.message : error, slug }, 'Failed to resolve project slug via NATS');

      // If it's a timeout or no responder error, treat as not found
      if (error instanceof Error && (error.message.includes('timeout') || error.message.includes('503'))) {
        return {
          projectId: '',
          slug,
          exists: false,
        };
      }

      throw error;
    }
  }
}
