// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { DocumentDisplayItem } from '@lfx-one/shared/interfaces';

@Pipe({
  name: 'documentTypeIcon',
  standalone: true,
})
export class DocumentTypeIconPipe implements PipeTransform {
  public transform(item: DocumentDisplayItem): string {
    if (item.type === 'folder') return 'fa-light fa-folder';
    if (item.type === 'link') return 'fa-light fa-link';
    return 'fa-light fa-file';
  }
}
