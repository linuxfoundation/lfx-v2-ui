// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { inject, Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'linkify',
  standalone: true,
})
export class LinkifyPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  // URL regex pattern to match various URL formats
  private readonly urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

  public transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    // Convert URLs to clickable links
    const linkedText = value.replace(this.urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary-600 hover:underline">${url}</a>`;
    });

    // Sanitize and return the HTML content
    return this.sanitizer.sanitize(SecurityContext.HTML, linkedText) || '';
  }
}
