// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Use client-side rendering to avoid PrimeNG + Angular 20 SSR hydration crash
    // (firstCreatePass error in providersResolver). Switch back to RenderMode.Server
    // once PrimeNG ships SSR-compatible builds.
    path: '**',
    renderMode: RenderMode.Client,
  },
];
