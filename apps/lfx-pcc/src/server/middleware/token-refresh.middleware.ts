// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NextFunction, Request, Response } from 'express';

import { validateAndSanitizeUrl, validateCookieDomain } from '../helpers/url-validation';

export async function tokenRefreshMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.oidc?.isAuthenticated() && req.oidc.accessToken?.isExpired()) {
      req.log.debug('Token expired, refreshing token', {
        is_authenticated: req.oidc?.isAuthenticated(),
        is_expired: req.oidc.accessToken?.isExpired(),
      });
      await req.oidc.accessToken.refresh();
    }

    // Check if sso cookie is present for the current environment
    if (!req.oidc?.isAuthenticated() && req.headers.cookie) {
      req.log.debug('No authentication but cookie present, refreshing token', {
        is_authenticated: req.oidc?.isAuthenticated(),
        has_cookie: !!req.headers.cookie,
      });
      const cookies = req.headers.cookie.split('; ');
      const environment = process.env['ENV'] as 'development' | 'staging' | 'production';

      // Find a valid SSO cookie for the current environment
      const ssoCookie = cookies.find((cookie) => validateCookieDomain(cookie, environment));
      const skipSilentLogin = cookies.find((cookie) => cookie.includes('skipSilentLogin'));

      if (ssoCookie && !skipSilentLogin) {
        try {
          req.log.debug('Silent login', {
            is_authenticated: req.oidc?.isAuthenticated(),
            has_cookie: !!req.headers.cookie,
          });
          // Silent login
          await res.oidc.login({
            silent: true,
          });
          return;
        } catch (error) {
          req.log.error({ error }, 'Error during silent login');
          await res.oidc.login({
            returnTo: req.originalUrl,
          });

          return;
        }
      }
    }
  } catch (error) {
    req.log.error({ error }, 'Error refreshing token');

    // Validate the returnTo URL to prevent open redirect attacks
    const validatedReturnTo = validateAndSanitizeUrl(req.originalUrl, [process.env['PCC_BASE_URL'] as string]);

    res.oidc.login({
      returnTo: validatedReturnTo || '/',
    });
    return;
  }

  next();
}
