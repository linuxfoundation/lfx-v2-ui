// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Request } from 'express';

/**
 * Gets the username from the current authentication context
 * Supports both Authelia token authentication and OIDC claims authentication
 */
export async function getUsernameFromAuth(req: Request): Promise<string | null> {
  // Check if we have a bearer token
  const token = req.bearerToken;
  if (token) {
    // If token starts with "authelia", try to get username from various fields
    if (token.startsWith('authelia')) {
      return (
        req.oidc?.user?.['preferred_username'] ||
        req.oidc?.user?.['username'] ||
        req.oidc?.user?.['name'] ||
        req.oidc?.user?.['email'] ||
        req.oidc?.user?.['sub'] ||
        null
      );
    }
  }

  // For non-authelia tokens, try LFX SSO claim first
  return req.oidc?.user?.['https://sso.linuxfoundation.org/claims/username'] || req.oidc?.user?.['username'] || req.oidc?.user?.['preferred_username'] || null;
}
