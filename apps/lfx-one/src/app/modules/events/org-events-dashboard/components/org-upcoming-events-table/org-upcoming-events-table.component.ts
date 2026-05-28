// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import type { OrgEventsResponse, PageChangeEvent, SortChangeEvent } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-org-upcoming-events-table',
  imports: [TableComponent, TagComponent, ButtonComponent, DatePipe],
  templateUrl: './org-upcoming-events-table.component.html',
})
export class OrgUpcomingEventsTableComponent {
  public readonly eventsResponse = input.required<OrgEventsResponse>();
  public readonly loading = input<boolean>(false);
  public readonly sortField = input<string>('EVENT_START_DATE');
  public readonly sortOrder = input<'ASC' | 'DESC'>('ASC');

  public readonly pageChange = output<PageChangeEvent>();
  public readonly sortChange = output<SortChangeEvent>();

  protected readonly rppOptions = computed<number[] | undefined>(() => (this.eventsResponse().total > 10 ? [10, 25, 50] : undefined));

  protected readonly sortIcons = computed(() => {
    const field = this.sortField();
    const order = this.sortOrder();
    const getIcon = (f: string): string => {
      if (field !== f) return 'fa-light fa-sort text-gray-300';
      return order === 'ASC' ? 'fa-solid fa-caret-up text-blue-500' : 'fa-solid fa-caret-down text-blue-500';
    };
    return {
      EVENT_NAME: getIcon('EVENT_NAME'),
      EVENT_START_DATE: getIcon('EVENT_START_DATE'),
      EVENT_CITY: getIcon('EVENT_CITY'),
    };
  });

  protected onPageChange(event: { first: number; rows: number }): void {
    this.pageChange.emit({ offset: event.first, pageSize: event.rows });
  }

  protected onHeaderClick(field: string): void {
    this.sortChange.emit({ field });
  }

  protected getSortAriaValue(field: string): string {
    if (this.sortField() !== field) return 'none';
    return this.sortOrder() === 'ASC' ? 'ascending' : 'descending';
  }
}
