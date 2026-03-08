// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, computed, signal, effect, Signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of } from 'rxjs';

import { TagComponent } from '@components/tag/tag.component';

import { Committee, getCommitteeCategorySeverity, TagSeverity } from '@lfx-one/shared';
import { COMMITTEE_LABEL } from '@lfx-one/shared/constants';
import { MailingListAudienceAccess } from '@lfx-one/shared/enums';

import { MailingListSubscribeFormComponent } from '../components/mailing-list-subscribe-form/mailing-list-subscribe-form.component';

@Component({
  selector: 'lfx-public-directory',
  imports: [DecimalPipe, RouterLink, FormsModule, TagComponent, MailingListSubscribeFormComponent],
  templateUrl: './public-directory.component.html',
  styleUrl: './public-directory.component.scss',
})
export class PublicDirectoryComponent {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public readonly committeeLabel = COMMITTEE_LABEL.singular;
  public readonly committeeLabelPlural = COMMITTEE_LABEL.plural;

  // Loading state signal — follows meetings module pattern
  public loading = signal(true);

  // Data signals — initialValue prevents hydration mismatch
  public committees: Signal<Committee[]> = this.initializeCommittees();
  public searchTerm = signal('');
  public selectedCategory = signal('');
  public selectedFoundation = signal('');
  public selectedProject = signal('');

  private queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  // Computed: unique foundation names
  public foundations = computed(() => {
    const names = new Set<string>();
    this.committees().forEach((c) => {
      if (c.foundation_name) names.add(c.foundation_name);
    });
    return Array.from(names).sort();
  });

  // Computed: unique project names (filtered by selected foundation if set)
  public projects = computed(() => {
    const foundation = this.selectedFoundation();
    const names = new Set<string>();
    this.committees().forEach((c) => {
      if (c.project_name && (!foundation || c.foundation_name === foundation)) {
        names.add(c.project_name);
      }
    });
    return Array.from(names).sort();
  });

  // Computed signals
  public categories = computed(() => {
    const cats = new Set<string>();
    this.committees().forEach((c) => {
      if (c.category) cats.add(c.category);
    });
    return Array.from(cats).sort();
  });

  public filteredCommittees = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const category = this.selectedCategory();
    const foundation = this.selectedFoundation();
    const project = this.selectedProject();
    return this.committees().filter((c) => {
      const matchesSearch = !search || c.name.toLowerCase().includes(search) || (c.description && c.description.toLowerCase().includes(search));
      const matchesCategory = !category || c.category === category;
      const matchesFoundation = !foundation || c.foundation_name === foundation;
      const matchesProject = !project || c.project_name === project;
      return matchesSearch && matchesCategory && matchesFoundation && matchesProject;
    });
  });

  public totalMembers = computed(() => this.committees().reduce((sum, c) => sum + (c.total_members || 0), 0));
  public publicCount = computed(() => this.committees().filter((c) => c.public).length);
  public totalGroups = computed(() => this.committees().length);

  public hasActiveFilters = computed(() => {
    return !!this.searchTerm() || !!this.selectedCategory() || !!this.selectedFoundation() || !!this.selectedProject();
  });

  public expandedSubscribeId = signal<string | null>(null);
  public readonly MailingListAudienceAccess = MailingListAudienceAccess;

  public constructor() {
    // Initialize filter signals from URL query params on first load and browser back/forward
    effect(() => {
      const params = this.queryParams();
      this.searchTerm.set(params.get('q') || '');
      this.selectedFoundation.set(params.get('foundation') || '');
      this.selectedProject.set(params.get('project') || '');
      this.selectedCategory.set(params.get('category') || '');
    });
  }

  // Utility
  public getCategorySeverity(category: string): TagSeverity {
    return getCommitteeCategorySeverity(category);
  }

  public onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.syncQueryParams();
  }

  public onCategoryChange(event: Event): void {
    this.selectedCategory.set((event.target as HTMLSelectElement).value);
    this.syncQueryParams();
  }

  public onFoundationChange(event: Event): void {
    this.selectedFoundation.set((event.target as HTMLSelectElement).value);
    // Reset project when foundation changes since projects are scoped to foundation
    this.selectedProject.set('');
    this.syncQueryParams();
  }

  public onProjectChange(event: Event): void {
    this.selectedProject.set((event.target as HTMLSelectElement).value);
    this.syncQueryParams();
  }

  public toggleSubscribe(event: Event, mailingListUid: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.expandedSubscribeId.set(this.expandedSubscribeId() === mailingListUid ? null : mailingListUid);
  }

  public clearFilters(): void {
    this.searchTerm.set('');
    this.selectedCategory.set('');
    this.selectedFoundation.set('');
    this.selectedProject.set('');
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  private syncQueryParams(): void {
    const queryParams: Record<string, string | null> = {
      q: this.searchTerm() || null,
      foundation: this.selectedFoundation() || null,
      project: this.selectedProject() || null,
      category: this.selectedCategory() || null,
    };
    this.router.navigate([], { relativeTo: this.route, queryParams, queryParamsHandling: 'replace' });
  }

  // Private initializer — follows meetings module pattern
  private initializeCommittees(): Signal<Committee[]> {
    return toSignal(
      this.http.get<Committee[]>('/public/api/committees').pipe(
        catchError(() => of([] as Committee[])),
        finalize(() => this.loading.set(false))
      ),
      { initialValue: [] as Committee[] }
    );
  }
}
