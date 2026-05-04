// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformServer } from '@angular/common';
import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';

export const ssrBaseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformServer(platformId)) {
    return next(req);
  }

  if (!req.url.startsWith('/api/') && !req.url.startsWith('/public/api/')) {
    return next(req);
  }

  const port = process.env['PORT'] || '4000';
  const internalBase = `http://127.0.0.1:${port}`;
  return next(req.clone({ url: `${internalBase}${req.url}` }));
};
