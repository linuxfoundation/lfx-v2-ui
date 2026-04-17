// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { UserService } from '@services/user.service';

/**
 * Attaches the current user's sub as `X-User-Sub` to outgoing API requests.
 *
 * Purpose: cache-key separation. When endpoints respond with `Vary: X-User-Sub`,
 * the browser's HTTP cache keys each response by the sub value. During
 * impersonation the `user.sub` signal switches to the target user's sub, so the
 * header value changes and the browser does not serve one user's cached response
 * to another's session — without disabling or shortening the cache TTL.
 *
 * The server does NOT trust this header for authorization; it is purely a cache
 * discriminator. Authorization still comes from the session cookie + bearer token.
 */
export const userIdentityInterceptor: HttpInterceptorFn = (req, next) => {
  const userService = inject(UserService);
  const sub = userService.user()?.sub;

  if (!sub) {
    return next(req);
  }

  if (!req.url.startsWith('/api/') && !req.url.startsWith('/public/api/')) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-User-Sub': sub } }));
};
