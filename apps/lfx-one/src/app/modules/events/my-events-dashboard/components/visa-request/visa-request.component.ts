// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, signal } from '@angular/core';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { TagSeverity, VisaRequestsResponse } from '@lfx-one/shared/interfaces';
import { ButtonComponent } from '@app/shared/components/button/button.component';

@Component({
  selector: 'lfx-visa-request',
  imports: [TableComponent, TagComponent, ButtonComponent],
  templateUrl: './visa-request.component.html',
})
export class VisaRequestComponent {
  // public readonly pageChange = output<PageChangeEvent>();
  // public readonly sortChange = output<SortChangeEvent>();

  protected readonly visaRequestsResponse = signal<VisaRequestsResponse>({ data: [], total: 0, pageSize: 10, offset: 0 });
  protected readonly loading = signal(false);
  protected readonly sortField = signal<string>('APPLICATION_DATE');
  protected readonly sortOrder = signal<'ASC' | 'DESC'>('DESC');

  protected readonly statusSeverityMap: Partial<Record<string, TagSeverity>> = {
    Pending: 'warn',
    Submitted: 'info',
    Approved: 'success',
    Denied: 'danger',
  };

  protected readonly sortIcons = computed(() => {
    const field = this.sortField();
    const order = this.sortOrder();
    const getIcon = (f: string): string => {
      if (field !== f) return 'fa-light fa-sort text-gray-300';
      return order === 'ASC' ? 'fa-solid fa-caret-up text-blue-500' : 'fa-solid fa-caret-down text-blue-500';
    };
    return {
      EVENT_NAME: getIcon('EVENT_NAME'),
      EVENT_CITY: getIcon('EVENT_CITY'),
      APPLICATION_DATE: getIcon('APPLICATION_DATE'),
    };
  });

  protected onPageChange(event: { first: number; rows: number }): void {
    // this.pageChange.emit({ offset: event.first, pageSize: event.rows });
  }

  protected onHeaderClick(field: string): void {
    // this.sortChange.emit({ field });
  }
}
