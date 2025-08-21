// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NatsSubjects, ProjectSlugToIdResponse } from '@lfx-pcc/shared/interfaces';
import { connect, NatsConnection, StringCodec } from 'nats';

import { serverLogger } from '../server';

export class NatsService {
  private connection: NatsConnection | null = null;
  private codec = StringCodec();

  /**
   * Get project ID by slug using NATS request-reply pattern
   */
  public async getProjectIdBySlug(slug: string): Promise<ProjectSlugToIdResponse> {
    await this.ensureConnection();

    try {
      const response = await this.connection!.request(NatsSubjects.PROJECT_SLUG_TO_UID, this.codec.encode(slug), { timeout: 5000 });

      const projectId = this.codec.decode(response.data);

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

  /**
   * Check if NATS connection is active
   */
  public isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }

  /**
   * Gracefully shutdown NATS connection
   */
  public async shutdown(): Promise<void> {
    if (this.connection && !this.connection.isClosed()) {
      serverLogger.info('Shutting down NATS connection');

      try {
        await this.connection.drain();
        serverLogger.info('NATS connection closed successfully');
      } catch (error) {
        serverLogger.error({ error: error instanceof Error ? error.message : error }, 'Error during NATS shutdown');
      }
    }
    this.connection = null;
  }

  /**
   * Ensure NATS connection (lazy initialization)
   */
  private async ensureConnection(): Promise<void> {
    if (this.connection && !this.connection.isClosed()) {
      return; // Already connected
    }

    const natsUrl = process.env['NATS_URL'] || 'nats://lfx-platform-nats.lfx.svc.cluster.local:4222';

    try {
      serverLogger.info({ url: natsUrl }, 'Connecting to NATS server on demand');

      this.connection = await connect({
        servers: [natsUrl],
        timeout: 5000,
      });

      serverLogger.info('Successfully connected to NATS server');
    } catch (error) {
      serverLogger.error(
        {
          error: error instanceof Error ? error.message : error,
          url: natsUrl,
          suggestion: 'If running locally, you may need to port-forward NATS: kubectl port-forward -n lfx svc/lfx-platform-nats 4222:4222',
        },
        'Failed to connect to NATS server'
      );
      throw error;
    }
  }
}
