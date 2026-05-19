// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { ErrorHandler, inject, Injectable, PLATFORM_ID } from '@angular/core';

const RELOAD_FLAG = 'lfx-chunk-reload-attempted';

const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Importing a module script failed') || // Safari
    message.includes('Failed to fetch dynamically imported module') || // Chrome / Edge
    message.includes('error loading dynamically imported module') // Firefox
  );
};

@Injectable()
export class ChunkLoadErrorHandler implements ErrorHandler {
  private readonly platformId = inject(PLATFORM_ID);

  handleError(error: unknown): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!isChunkLoadError(error)) {
      console.error(error);
      return;
    }

    // Guard against reload loops — only attempt once per session.
    if (sessionStorage.getItem(RELOAD_FLAG)) {
      console.error('Chunk load error persists after reload — giving up.', error);
      return;
    }

    sessionStorage.setItem(RELOAD_FLAG, '1');
    window.location.reload();
  }
}
