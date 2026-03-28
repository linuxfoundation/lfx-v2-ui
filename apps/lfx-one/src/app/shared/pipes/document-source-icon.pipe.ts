// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { CommitteeDocumentSource } from '@lfx-one/shared/interfaces';
import { DOCUMENT_SOURCE_ICONS } from '@lfx-one/shared/constants';

@Pipe({
  name: 'documentSourceIcon',
  pure: true,
})
export class DocumentSourceIconPipe implements PipeTransform {
  public transform(source: CommitteeDocumentSource): string {
    return DOCUMENT_SOURCE_ICONS[source] || '';
  }
}
