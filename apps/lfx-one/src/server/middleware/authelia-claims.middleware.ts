// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

/**
 * Middleware to transform Authelia OIDC claims to Auth0-compatible format
 *
 * Only transforms claims when the user is authenticated via Authelia (not Auth0).
 * Auth0 users already have the correct claim structure and should not be modified.
 *
 * Authelia provides standard OIDC claims (sub, email, name, preferred_username, etc.)
 * but the application expects Auth0's extended claim structure.
 *
 * This middleware ensures compatibility by:
 * 1. Detecting Authelia users by checking the issuer URL
 * 2. Mapping standard OIDC claims to Auth0's expected format
 * 3. Adding LFX-specific namespaced claims
 * 4. Splitting full name into given_name/family_name
 * 5. Providing backwards compatibility fields (first_name, last_name, username)
 *
 * @param req - Express request with OIDC user data
 * @param res - Express response
 * @param next - Express next function
 */
export function autheliaToAuth0Claims(req: Request, _res: Response, next: NextFunction): void {
  if (req.oidc?.user) {
    const autheliaUser = req.oidc.user;
    const issuer = autheliaUser['iss'] || '';

    // Only transform claims if user is from Authelia (not Auth0)
    // Auth0 issuers contain 'auth0.com' in the URL
    const isAuth0User = issuer.includes('auth0.com');

    if (!isAuth0User) {
      const nameParts = (autheliaUser['name'] || '').split(' ');

      // Add Auth0-compatible fields to the existing user object
      // Note: req.oidc.user is a getter-only property, so we modify it in place
      const user = req.oidc.user as any;

      // LFX-specific namespaced claim for username
      user['https://sso.linuxfoundation.org/claims/username'] = autheliaUser['preferred_username'] || autheliaUser['sub'];

      // Auth0 standard name fields
      user.given_name = nameParts[0] || '';
      user.family_name = nameParts.slice(1).join(' ') || '';
      user.nickname = autheliaUser['preferred_username'] || autheliaUser['sub'];

      // Alternative name fields for backwards compatibility
      user.first_name = nameParts[0] || '';
      user.last_name = nameParts.slice(1).join(' ') || '';
      user.username = autheliaUser['preferred_username'] || autheliaUser['sub'];

      // Optional fields with defaults
      user.picture = autheliaUser['picture'] || '';
      user.updated_at = autheliaUser['updated_at'] || new Date().toISOString();
      user.created_at = autheliaUser['created_at'] || new Date().toISOString();
      user.sid = (req as any).sessionID || '';
      user.id = autheliaUser['sub'];
    }
  }

  next();
}
