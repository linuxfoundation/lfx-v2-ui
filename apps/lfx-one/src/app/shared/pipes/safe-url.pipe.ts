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
    if (url.startsWith('https://') || url.startsWith('http://')) {
      return url;
    }
    if (url.includes('.') && !url.includes(' ')) {
      return 'https://' + url;
    }
    return null;
  }
}
