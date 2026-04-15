// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NATS_CONFIG } from '@lfx-one/shared/constants';
import { NatsSubjects } from '@lfx-one/shared/enums';
import { ImpersonationStatusResponse, ImpersonationUser, Impersonator, M2MTokenResponse } from '@lfx-one/shared/interfaces';
import crypto from 'crypto';
import { Request } from 'express';

import { MicroserviceError } from '../errors';
import { logger } from './logger.service';
import { NatsService } from './nats.service';

export class ImpersonationService {
  private readonly clientId: string;
  private readonly clientKeyBase64: string;
  private readonly issuerBaseUrl: string;
  private readonly natsService: NatsService;

  public constructor() {
    this.clientId = process.env['CTE_CLIENT_ID'] || '';
    this.clientKeyBase64 = process.env['CTE_CLIENT_KEY'] || '';
    this.issuerBaseUrl = (process.env['PCC_AUTH0_ISSUER_BASE_URL'] || '').replace(/\/+$/, '');
    this.natsService = new NatsService();
  }

  public isConfigured(): boolean {
    return !!this.clientId && !!this.clientKeyBase64;
  }

  public async exchangeToken(req: Request, targetUser: string): Promise<M2MTokenResponse> {
    logger.debug(req, 'cte_token_exchange', 'Starting CTE token exchange via NATS', { target_user: targetUser });

    const codec = this.natsService.getCodec();
    const payload = JSON.stringify({
      subject_token: req.bearerToken || '',
      target_user: targetUser,
    });

    try {
      const response = await this.natsService.request(NatsSubjects.IMPERSONATION_TOKEN_EXCHANGE, codec.encode(payload), {
        timeout: NATS_CONFIG.REQUEST_TIMEOUT,
      });

      const responseText = codec.decode(response.data);
      const result = JSON.parse(responseText);

      if (!result.success) {
        const errorMessage = result.error || 'Impersonation token exchange failed';
        throw new MicroserviceError(errorMessage, 400, 'CTE_EXCHANGE_FAILED', {
          operation: 'cte_token_exchange',
          service: 'auth-service',
          errorBody: { target_user: targetUser },
        });
      }

      const accessToken = result.data?.access_token;
      if (!accessToken) {
        throw new MicroserviceError('No access token in impersonation response', 500, 'CTE_NO_TOKEN', {
          operation: 'cte_token_exchange',
          service: 'auth-service',
        });
      }

      // Derive expires_in from the JWT exp claim
      let expiresIn = 86400;
      try {
        const payload = this.decodeJwtPayload(accessToken);
        if (payload?.['exp']) {
          expiresIn = Math.max(payload['exp'] - Math.floor(Date.now() / 1000), 0);
        }
      } catch {
        // Fall back to 24h default
      }

      logger.debug(req, 'cte_token_exchange', 'CTE token exchange successful', { target_user: targetUser, expires_in: expiresIn });

      return {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
      };
    } catch (error) {
      if (error instanceof MicroserviceError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new MicroserviceError(`Impersonation token exchange failed: ${errorMessage}`, 502, 'CTE_NATS_ERROR', {
        operation: 'cte_token_exchange',
        service: 'auth-service',
        errorBody: { target_user: targetUser },
      });
    }
  }

  public async fetchTargetUserProfile(req: Request, userId: string): Promise<{ name?: string; picture?: string }> {
    try {
      const mgmtAudience = `${this.issuerBaseUrl}/api/v2/`;
      const tokenEndpoint = `${this.issuerBaseUrl}/oauth/token`;
      const clientAssertion = this.buildClientAssertion(tokenEndpoint);

      const tokenResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_assertion: clientAssertion,
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          audience: mgmtAudience,
        }).toString(),
      });

      if (!tokenResponse.ok) {
        logger.warning(req, 'fetch_target_user_profile', 'Failed to get management API token', {
          status: tokenResponse.status,
        });
        return {};
      }

      const { access_token: mgmtToken } = await tokenResponse.json();

      const response = await fetch(`${this.issuerBaseUrl}/api/v2/users/${encodeURIComponent(userId)}?fields=name,picture,given_name,family_name`, {
        headers: { Authorization: `Bearer ${mgmtToken}` },
      });

      if (!response.ok) {
        logger.warning(req, 'fetch_target_user_profile', 'Failed to fetch target user profile', {
          status: response.status,
          user_id: userId,
        });
        return {};
      }

      const profile = await response.json();
      return {
        name: profile.name || profile.given_name || undefined,
        picture: profile.picture || undefined,
      };
    } catch (error) {
      logger.warning(req, 'fetch_target_user_profile', 'Error fetching target user profile', {
        user_id: userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return {};
    }
  }

  public startImpersonation(
    req: Request,
    tokenResponse: M2MTokenResponse,
    targetClaims: Record<string, any>,
    profile?: { name?: string; picture?: string }
  ): void {
    if (!req.appSession) {
      req.appSession = {};
    }

    const targetUser: ImpersonationUser = {
      sub: targetClaims['sub'] || '',
      email: targetClaims['http://lfx.dev/claims/email'] || '',
      username: targetClaims['http://lfx.dev/claims/username'] || '',
      name: profile?.name,
      picture: profile?.picture,
    };

    const oidcUser = req.oidc?.user;
    const impersonator: Impersonator = {
      sub: oidcUser?.['sub'] || '',
      email: oidcUser?.['email'] || '',
      name: oidcUser?.['name'] || '',
    };

    req.appSession['impersonationToken'] = tokenResponse.access_token;
    req.appSession['impersonationExpiresAt'] = Date.now() + (tokenResponse.expires_in - 300) * 1000;
    req.appSession['impersonationUser'] = targetUser;
    req.appSession['impersonator'] = impersonator;

    logger.info(req, 'impersonation_granted', 'Impersonation session started', {
      impersonator_sub: impersonator.sub,
      impersonator_email: impersonator.email,
      target_sub: targetUser.sub,
      target_email: targetUser.email,
    });
  }

  public stopImpersonation(req: Request): void {
    if (!req.appSession) {
      return;
    }

    const impersonator = req.appSession['impersonator'];
    const targetUser = req.appSession['impersonationUser'];

    delete req.appSession['impersonationToken'];
    delete req.appSession['impersonationExpiresAt'];
    delete req.appSession['impersonationUser'];
    delete req.appSession['impersonator'];

    logger.info(req, 'impersonation_stopped', 'Impersonation session ended', {
      impersonator_sub: impersonator?.sub,
      impersonator_email: impersonator?.email,
      target_sub: targetUser?.sub,
      target_email: targetUser?.email,
    });
  }

  public getImpersonationToken(req: Request): string | null {
    const token = req.appSession?.['impersonationToken'];
    if (!token || typeof token !== 'string') {
      return null;
    }

    const expiresAt = req.appSession?.['impersonationExpiresAt'];
    if (!expiresAt || Date.now() >= expiresAt) {
      logger.debug(req, 'impersonation_token_expired', 'Impersonation token expired, clearing session');
      this.clearImpersonationSession(req);
      return null;
    }

    return token;
  }

  public getImpersonationStatus(req: Request): ImpersonationStatusResponse {
    const token = this.getImpersonationToken(req);
    if (!token) {
      return { impersonating: false };
    }

    return {
      impersonating: true,
      targetUser: req.appSession?.['impersonationUser'],
      impersonator: req.appSession?.['impersonator'],
    };
  }

  public decodeJwtPayload(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    } catch {
      return null;
    }
  }

  private buildClientAssertion(tokenEndpoint: string): string {
    const keyPem = Buffer.from(this.clientKeyBase64, 'base64').toString('utf-8');

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: this.clientId,
      sub: this.clientId,
      aud: tokenEndpoint,
      iat: now,
      exp: now + 120,
      jti: crypto.randomUUID(),
    };

    const encode = (obj: object): string => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const signingInput = `${encode(header)}.${encode(payload)}`;
    const signature = crypto.sign('RSA-SHA256', Buffer.from(signingInput), keyPem);

    return `${signingInput}.${signature.toString('base64url')}`;
  }

  private clearImpersonationSession(req: Request): void {
    if (!req.appSession) {
      return;
    }

    delete req.appSession['impersonationToken'];
    delete req.appSession['impersonationExpiresAt'];
    delete req.appSession['impersonationUser'];
    delete req.appSession['impersonator'];
  }
}
