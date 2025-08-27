// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class CustomPreloadingStrategy implements PreloadingStrategy {
  public preload(route: Route, load: () => Observable<any>): Observable<any> {
    if (route.data && route.data['preload']) {
      // Check connection type for intelligent preloading
      const connection = (navigator as any).connection;
      const isSlowConnection = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';

      if (isSlowConnection) {
        // On slow connections, don't preload or delay significantly
        return of(null);
      }

      // For fast connections, preload after a short delay
      const delay = route.data['preloadDelay'] || 2000; // Default 2 second delay
      return timer(delay).pipe(mergeMap(() => load()));
    }

    return of(null);
  }
}
