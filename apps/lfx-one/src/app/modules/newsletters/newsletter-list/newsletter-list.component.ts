// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, signal, Signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { CardTabsBarComponent } from '@components/card-tabs-bar/card-tabs-bar.component';
import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { FilterPillOption, NewsletterContextType, NewsletterListItem, NewsletterStatus, ProjectContext } from '@lfx-one/shared/interfaces';
import { NewsletterService } from '@services/newsletter.service';
import { ProjectContextService } from '@services/project-context.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { finalize, take } from 'rxjs';

type StatusTabId = 'draft' | 'sent';

@Component({
  selector: 'lfx-newsletter-list',
  imports: [
    DatePipe,
    ButtonComponent,
    CardComponent,
    CardTabsBarComponent,
    EmptyStateComponent,
    TableComponent,
    TagComponent,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './newsletter-list.component.html',
  styleUrl: './newsletter-list.component.scss',
})
export class NewsletterListComponent {
  // === Services ===
  private readonly projectContextService = inject(ProjectContextService);
  private readonly newsletterService = inject(NewsletterService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // === Tab options ===
  protected readonly statusTabOptions: FilterPillOption[] = [
    { id: 'draft', label: 'Drafts' },
    { id: 'sent', label: 'Sent' },
  ];

  // === Writable Signals ===
  protected readonly statusTab = signal<StatusTabId>('draft');
  protected readonly newsletters = signal<NewsletterListItem[]>([]);
  protected readonly loading = signal<boolean>(false);
  protected readonly loadingMore = signal<boolean>(false);
  protected readonly nextPageToken = signal<string | undefined>(undefined);
  protected readonly deletingId = signal<string | null>(null);

  // === Reactive context ===
  public readonly activeContext: Signal<ProjectContext | null> = this.projectContextService.activeContext;
  public readonly isFoundationContext: Signal<boolean> = this.projectContextService.isFoundationContext;
  public readonly contextUid: Signal<string> = this.projectContextService.activeContextUid;
  public readonly contextType: Signal<NewsletterContextType> = computed(() => (this.isFoundationContext() ? 'foundation' : 'project'));
  public readonly hasContext: Signal<boolean> = computed(() => this.contextUid().length > 0);
  protected readonly canLoadMore: Signal<boolean> = computed(() => !!this.nextPageToken() && !this.loading() && !this.loadingMore());
  protected readonly hasNewsletters: Signal<boolean> = computed(() => this.newsletters().length > 0);

  public constructor() {
    // Reload whenever the context or active status tab changes.
    effect(() => {
      const uid = this.contextUid();
      const status = this.statusTab();
      if (uid) {
        this.loadInitial(status as NewsletterStatus);
      } else {
        this.newsletters.set([]);
        this.nextPageToken.set(undefined);
      }
    });
  }

  protected onStatusTabChange(tab: string): void {
    if (tab === 'draft' || tab === 'sent') {
      this.statusTab.set(tab);
    }
  }

  protected goToCreate(): void {
    this.router.navigate(['..', 'create'], { relativeTo: this.route });
  }

  protected goToRow(item: NewsletterListItem): void {
    const target = this.statusTab() === 'sent' ? 'analytics' : 'edit';
    this.router.navigate(['..', item.id, target], { relativeTo: this.route });
  }

  protected loadMore(): void {
    const token = this.nextPageToken();
    if (!token || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.newsletterService
      .listNewsletters({
        contextType: this.contextType(),
        contextUid: this.contextUid(),
        status: this.statusTab() as NewsletterStatus,
        pageToken: token,
      })
      .pipe(
        take(1),
        finalize(() => this.loadingMore.set(false))
      )
      .subscribe({
        next: (response) => {
          this.newsletters.update((current) => [...current, ...response.newsletters]);
          this.nextPageToken.set(response.nextPageToken);
        },
        error: (err: HttpErrorResponse) => this.showLoadError(err),
      });
  }

  protected getOpenRateTooltip(item: NewsletterListItem): string {
    const total = item.totalRecipients ?? 0;
    const opens = item.uniqueOpens ?? 0;
    return `${opens} of ${total} recipients opened`;
  }

  protected formatOpenRate(item: NewsletterListItem): string {
    if (item.openRate === undefined || item.openRate === null) return '—';
    return `${Math.round(item.openRate * 100)}%`;
  }

  protected onDeleteDraft(item: NewsletterListItem, event: Event): void {
    event.stopPropagation();
    this.confirmationService.confirm({
      header: 'Delete draft?',
      message: `Are you sure you want to delete "${item.subject || 'Untitled draft'}"? This action cannot be undone.`,
      icon: 'pi pi-trash',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-sm p-button-outlined',
      accept: () => this.runDelete(item.id),
    });
  }

  private runDelete(id: string): void {
    this.deletingId.set(id);
    this.newsletterService
      .deleteDraft(id)
      .pipe(
        take(1),
        finalize(() => this.deletingId.set(null))
      )
      .subscribe({
        next: () => {
          this.newsletters.update((current) => current.filter((n) => n.id !== id));
          this.messageService.add({ severity: 'success', summary: 'Draft deleted', detail: 'The draft has been removed.' });
        },
        error: (err: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Delete failed',
            detail: err?.error?.message || err?.message || 'Could not delete the draft. Please try again.',
          });
        },
      });
  }

  private loadInitial(status: NewsletterStatus): void {
    this.loading.set(true);
    this.nextPageToken.set(undefined);
    this.newsletters.set([]);
    this.newsletterService
      .listNewsletters({
        contextType: this.contextType(),
        contextUid: this.contextUid(),
        status,
      })
      .pipe(
        take(1),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (response) => {
          this.newsletters.set(response.newsletters);
          this.nextPageToken.set(response.nextPageToken);
        },
        error: (err: HttpErrorResponse) => this.showLoadError(err),
      });
  }

  private showLoadError(err: HttpErrorResponse): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Could not load newsletters',
      detail: err?.error?.message || err?.message || 'Please try again later.',
    });
  }
}
