// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { DocumentDisplayItem } from '@lfx-one/shared/interfaces';

@Pipe({
  name: 'documentIcon',
  standalone: true,
})
export class DocumentIconPipe implements PipeTransform {
  public transform(item: DocumentDisplayItem): string {
    if (item.type === 'folder') return 'fa-light fa-folder text-amber-500';
    if (item.type === 'link') return 'fa-light fa-link text-blue-500';
    return 'fa-light fa-file text-red-400';
  }
}
