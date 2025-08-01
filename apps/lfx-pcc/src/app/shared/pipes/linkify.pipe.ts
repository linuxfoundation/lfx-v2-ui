// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { inject, Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { URL_REGEX } from '@lfx-pcc/shared';

@Pipe({
  name: 'linkify',
  standalone: true,
})
export class LinkifyPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  public transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    // Convert URLs to clickable links
    const linkedText = value.replace(URL_REGEX, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary-600 hover:underline">${url}</a>`;
    });

    // Sanitize and return the HTML content
    return this.sanitizer.sanitize(SecurityContext.HTML, linkedText) || '';
  }
}
