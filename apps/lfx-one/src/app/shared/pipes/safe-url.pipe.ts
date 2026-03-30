// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'safeUrl',
  standalone: true,
  pure: true,
})
export class SafeUrlPipe implements PipeTransform {
  public transform(url: string | null | undefined): string | null {
    if (!url?.trim()) return null;

    // If the URL already has a valid protocol, return it as-is
    try {
      new URL(url);
      return url;
    } catch {
      // No valid protocol — prepend https:// only if it looks like a hostname
      if (/^[\w-]+(\.[\w-]+)+/.test(url)) {
        return `https://${url}`;
      }
      return null;
    }
  }
}
