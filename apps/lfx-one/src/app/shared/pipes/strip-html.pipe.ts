// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'stripHtml',
})
export class StripHtmlPipe implements PipeTransform {
  public transform(value: string | null | undefined): string {
    if (!value) return '';

    // Create a temporary div element to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = value;

    // Extract text content (automatically strips HTML tags)
    return temp.textContent || temp.innerText || '';
  }
}
