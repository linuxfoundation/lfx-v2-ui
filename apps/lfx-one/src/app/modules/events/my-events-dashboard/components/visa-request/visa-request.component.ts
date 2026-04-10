// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EventsService } from '@app/shared/services/events.service';
import { ButtonComponent } from '@components/button/button.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { DEFAULT_EVENTS_PAGE_SIZE, EMPTY_VISA_REQUESTS_RESPONSE } from '@lfx-one/shared/constants';
import { PageChangeEvent, TagSeverity, VisaRequestsResponse } from '@lfx-one/shared/interfaces';
import { DialogService, DynamicDialogModule } from 'primeng/dynamicdialog';
import { catchError, combineLatest, finalize, of, skip, switchMap, tap } from 'rxjs';
import { VisaRequestApplicationDialogComponent } from '../visa-request-application-dialog/visa-request-application-dialog.component';

@Component({
  selector: 'lfx-visa-request',
  imports: [TableComponent, TagComponent, ButtonComponent, DynamicDialogModule],
  providers: [DialogService],
  templateUrl: './visa-request.component.html',
})
export class VisaRequestComponent {
  private readonly eventsService = inject(EventsService);
  private readonly dialogService = inject(DialogService);

  public readonly searchQuery = input<string>('');
  public readonly status = input<string | null>(null);

  protected readonly loading = signal(false);
  protected readonly sortField = signal<string>('APPLICATION_DATE');
  protected readonly sortOrder = signal<'ASC' | 'DESC'>('DESC');
  protected readonly page = signal<PageChangeEvent>({ offset: 0, pageSize: DEFAULT_EVENTS_PAGE_SIZE });

  protected readonly visaRequestsResponse: Signal<VisaRequestsResponse> = this.initVisaRequests();

  protected readonly statusSeverityMap: Partial<Record<string, TagSeverity>> = {
    Submitted: 'info',
    Approved: 'success',
    Denied: 'danger',
    Expired: 'secondary',
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

  public constructor() {
    combineLatest([toObservable(this.searchQuery), toObservable(this.status)])
      .pipe(skip(1), takeUntilDestroyed())
      .subscribe(() => {
        this.page.set({ offset: 0, pageSize: this.page().pageSize });
      });
  }

  public openApplicationDialog(): void {
    this.dialogService.open(VisaRequestApplicationDialogComponent, {
      header: 'Visa Letter Application',
      width: '800px',
      modal: true,
      closable: true,
      closeOnEscape: true,
    });
  }

  protected onPageChange(event: { first: number; rows: number }): void {
    this.loading.set(true);
    this.page.set({ offset: event.first, pageSize: event.rows });
  }

  protected onHeaderClick(field: string): void {
    if (this.sortField() === field) {
      this.sortOrder.set(this.sortOrder() === 'ASC' ? 'DESC' : 'ASC');
    } else {
      this.sortField.set(field);
      this.sortOrder.set('ASC');
    }
    this.page.set({ offset: 0, pageSize: this.page().pageSize });
  }

  private initVisaRequests(): Signal<VisaRequestsResponse> {
    return toSignal(
      toObservable(
        computed(() => ({
          ...this.page(),
          searchQuery: this.searchQuery() || undefined,
          status: this.status() ?? undefined,
          sortField: this.sortField(),
          sortOrder: this.sortOrder(),
        }))
      ).pipe(
        tap(() => this.loading.set(true)),
        switchMap(({ offset, pageSize, searchQuery, status, sortField, sortOrder }) =>
          this.eventsService.getVisaRequests({ offset, pageSize, searchQuery, status, sortField, sortOrder }).pipe(
            catchError(() => of(EMPTY_VISA_REQUESTS_RESPONSE)),
            finalize(() => this.loading.set(false))
          )
        )
      ),
      { initialValue: EMPTY_VISA_REQUESTS_RESPONSE }
    );
  }
}
