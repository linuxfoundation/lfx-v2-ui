// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { StatCardGridComponent } from '@components/stat-card-grid/stat-card-grid.component';
import { TableComponent } from '@components/table/table.component';
import { DEFAULT_FOUNDATION_PROJECTS_DETAIL } from '@lfx-one/shared/constants';
import { buildLensAwareInsightsUrl } from '@lfx-one/shared/utils';
import { HttpParams } from '@angular/common/http';
import { AnalyticsService } from '@services/analytics.service';
import { CommitteeService } from '@services/committee.service';
import { LensService } from '@services/lens.service';
import { MailingListService } from '@services/mailing-list.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { catchError, combineLatest, finalize, from, map, mergeMap, Observable, of, scan, startWith, switchMap } from 'rxjs';

import type { FilterPillOption, FoundationProjectsDetailResponse, ProjectTableRow, StatCardItem } from '@lfx-one/shared/interfaces';

interface ProjectCounts {
  committees: number;
  mailingLists: number;
  hasChat: boolean;
}

type PresencePill = 'all' | 'with-groups' | 'without-groups' | 'with-channels' | 'without-channels';

// Limit concurrent per-project count fetches so a large foundation doesn't burst
// N × 2 HTTP requests at once. Results are accumulated progressively so pill
// counts and channel indicators update row-by-row as each project resolves.
const COUNT_FETCH_CONCURRENCY = 8;

/** A project "has channels" when it has at least one mailing list OR a chat_channel. */
function hasAnyChannel(counts: ProjectCounts | undefined): boolean {
  if (!counts) return false;
  return counts.mailingLists > 0 || counts.hasChat;
}

@Component({
  selector: 'lfx-foundation-projects',
  imports: [DecimalPipe, ReactiveFormsModule, FilterPillsComponent, InputTextComponent, StatCardGridComponent, TableComponent],
  templateUrl: './foundation-projects.component.html',
  styleUrl: './foundation-projects.component.scss',
})
export class FoundationProjectsComponent {
  // === Services ===
  private readonly projectContextService = inject(ProjectContextService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly committeeService = inject(CommitteeService);
  private readonly mailingListService = inject(MailingListService);
  private readonly projectService = inject(ProjectService);
  private readonly lensService = inject(LensService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // === Forms ===
  protected readonly searchForm: FormGroup = this.fb.group({
    query: [''],
  });

  // === Simple WritableSignals ===
  protected readonly loading = signal(false);
  protected readonly activePill = signal<PresencePill>('all');

  // === Computed/toSignal Signals ===
  protected readonly foundationSlug: Signal<string> = computed(() => this.projectContextService.selectedFoundation()?.slug ?? '');
  protected readonly foundationName: Signal<string> = computed(() => this.projectContextService.selectedFoundation()?.name ?? 'The Linux Foundation');
  private readonly rawData: Signal<FoundationProjectsDetailResponse> = this.initRawData();
  protected readonly searchQuery: Signal<string> = this.initSearchQuery();
  protected readonly allProjects: Signal<ProjectTableRow[]> = computed(() => this.rawData().projects);
  protected readonly totalProjects: Signal<number> = computed(() => this.allProjects().length);
  protected readonly summaryCards: Signal<StatCardItem[]> = this.initSummaryCards();
  protected readonly filteredProjects: Signal<ProjectTableRow[]> = this.initFilteredProjects();
  // Canonical project-service UIDs keyed by slug, resolved once per foundation change.
  // Shared between initProjectCounts (upstream count filter) and navigateToProject
  // (lens context uid) so we never fall back to the ambiguous Snowflake PROJECT_ID
  // when the correct project-service UID is already on hand.
  private readonly subProjectUidBySlug: Signal<Map<string, string>> = this.initSubProjectUidBySlug();
  protected readonly projectCounts: Signal<Record<string, ProjectCounts>> = this.initProjectCounts();
  protected readonly pillOptions: Signal<FilterPillOption[]> = computed(() => {
    const projects = this.allProjects();
    const counts = this.projectCounts();
    const withGroups = projects.filter((p) => (counts[p.projectSlug]?.committees ?? 0) > 0).length;
    const withoutGroups = projects.length - withGroups;
    // Channels = mailing lists OR chat channel. A project with just a chat
    // channel should still count as "with channels" to match the Channels column.
    const withChannels = projects.filter((p) => hasAnyChannel(counts[p.projectSlug])).length;
    const withoutChannels = projects.length - withChannels;
    return [
      { id: 'all', label: `All (${projects.length})` },
      { id: 'with-groups', label: `With Groups (${withGroups})` },
      { id: 'without-groups', label: `Without Groups (${withoutGroups})` },
      { id: 'with-channels', label: `With Channels (${withChannels})` },
      { id: 'without-channels', label: `Without Channels (${withoutChannels})` },
    ];
  });

  // === Protected Methods ===
  protected getInsightsUrl(slug: string): string {
    return buildLensAwareInsightsUrl(slug, false);
  }

  protected openProjectLens(project: ProjectTableRow): void {
    this.navigateToProject(project, '/project/overview');
  }

  protected getCountFor(project: ProjectTableRow): ProjectCounts {
    return this.projectCounts()[project.projectSlug] ?? { committees: 0, mailingLists: 0, hasChat: false };
  }

  protected onPillChange(pillId: string): void {
    this.activePill.set(pillId as PresencePill);
  }

  // === Private Initializers ===
  private initRawData(): Signal<FoundationProjectsDetailResponse> {
    return toSignal(
      toObservable(this.foundationSlug).pipe(
        switchMap((slug) => {
          // Handle the empty-slug case inside switchMap (not via an upstream `filter`)
          // so that clearing the foundation also cancels any in-flight request for the
          // previous slug — otherwise the old fetch could complete and overwrite
          // rawData after the UI switched to the "no foundation selected" state.
          if (!slug) {
            this.loading.set(false);
            return of(DEFAULT_FOUNDATION_PROJECTS_DETAIL);
          }
          // Set loading inside switchMap so that on rapid slug changes the order is:
          // old inner's `finalize(false)` (switchMap cancels it) → new inner's `loading.set(true)`.
          // Putting `loading.set(true)` in an outer `tap` would make the ordering
          // implementation-dependent when new slugs arrive while a request is in flight.
          this.loading.set(true);
          // Error handling lives in AnalyticsService.getFoundationProjectsDetail,
          // which returns `{ projects: [], totalCount: 0 }` on failure and evicts
          // the failed slug from its cache. No component-level catchError needed.
          return this.analyticsService.getFoundationProjectsDetail(slug).pipe(finalize(() => this.loading.set(false)));
        })
      ),
      { initialValue: DEFAULT_FOUNDATION_PROJECTS_DETAIL }
    );
  }

  private initSearchQuery(): Signal<string> {
    return toSignal(this.searchForm.get('query')!.valueChanges, { initialValue: '' });
  }

  private initSummaryCards(): Signal<StatCardItem[]> {
    return computed<StatCardItem[]>(() => {
      const projects = this.allProjects();
      const activeCount = projects.filter((p) => p.commitsLast90Days > 0).length;
      const totalContributors = projects.reduce((sum, p) => sum + (p.activeContributors ?? 0), 0);
      return [
        {
          value: this.totalProjects(),
          label: 'Total Projects',
          icon: 'fa-light fa-diagram-project',
          iconContainerClass: 'bg-gray-200 text-gray-500',
        },
        {
          value: activeCount,
          label: 'Active (90d)',
          icon: 'fa-light fa-bolt',
          iconContainerClass: 'bg-emerald-100 text-emerald-600',
        },
        {
          value: totalContributors,
          label: 'Active Contributors (90d)',
          icon: 'fa-light fa-users',
          iconContainerClass: 'bg-blue-100 text-blue-600',
        },
      ];
    });
  }

  private navigateToProject(project: ProjectTableRow, destination: string): void {
    // Prefer the canonical project-service UID resolved from the foundation's
    // sub-project listing; fall back to Snowflake's PROJECT_ID only if the
    // sub-projects response hasn't landed or the slug isn't in the map. The
    // resolved UID is the same identifier that committee/mailing-list tagging
    // uses, so lens switching consistently lands on the right project.
    const resolvedUid = this.subProjectUidBySlug().get(project.projectSlug) ?? project.projectId;
    if (!resolvedUid) {
      return;
    }
    this.projectContextService.setProject({
      uid: resolvedUid,
      name: project.projectName,
      slug: project.projectSlug,
    });
    this.lensService.setLens('project');
    this.router.navigate([destination]);
  }

  private initFilteredProjects(): Signal<ProjectTableRow[]> {
    return computed(() => {
      const query = this.searchQuery().toLowerCase().trim();
      const pill = this.activePill();
      const counts = this.projectCounts();
      return this.allProjects().filter((project) => {
        if (query && !project.projectName.toLowerCase().includes(query)) return false;
        const row = counts[project.projectSlug];
        const committees = row?.committees ?? 0;
        const channels = hasAnyChannel(row);
        if (pill === 'with-groups' && committees === 0) return false;
        if (pill === 'without-groups' && committees > 0) return false;
        if (pill === 'with-channels' && !channels) return false;
        if (pill === 'without-channels' && channels) return false;
        return true;
      });
    });
  }

  // Resolve slug → project-service UID for every sub-project of the current foundation.
  // Snowflake's PROJECT_ID is foundation-specific and may be a Salesforce ID rather
  // than the canonical project-service UUID used by committee/mailing-list tagging,
  // so we fetch the sub-projects once per foundation change and build an authoritative
  // slug→uid map. Used by both initProjectCounts (filter the count queries) and
  // navigateToProject (set the correct lens context UID).
  // `startWith(new Map())` inside the inner switchMap clears the map immediately when
  // a new slug arrives so a stale mapping from the previous foundation can't leak
  // through if slugs overlap across foundations.
  private initSubProjectUidBySlug(): Signal<Map<string, string>> {
    return toSignal(
      toObservable(this.foundationSlug).pipe(
        switchMap((slug) => {
          if (!slug) {
            return of(new Map<string, string>());
          }
          const foundationUid = this.projectContextService.selectedFoundation()?.uid;
          if (!foundationUid) {
            return of(new Map<string, string>());
          }
          const params = new HttpParams().set('parent', `project:${foundationUid}`);
          return this.projectService.getProjects(params).pipe(
            map((subProjects) => {
              const slugToUid = new Map<string, string>();
              for (const sub of subProjects) {
                if (sub.slug && sub.uid) slugToUid.set(sub.slug, sub.uid);
              }
              return slugToUid;
            }),
            startWith(new Map<string, string>()),
            catchError(() => of(new Map<string, string>()))
          );
        })
      ),
      { initialValue: new Map<string, string>() }
    );
  }

  // Fire per-project committee + mailing-list count fetches with bounded concurrency.
  // Counts accumulate progressively (row-by-row) via `scan` so the table updates as
  // each project resolves, instead of waiting for every request to finish before any
  // indicator lights up. Reuses `subProjectUidBySlug` rather than refetching.
  //
  // Known fan-out cost: for N projects this issues 2N upstream calls, and the
  // committees endpoint is itself enriched per-committee (mailing-list association,
  // access checks) in the BFF. Accepted here because:
  //   1. Loads only when a user visits /foundation/projects (page-scoped, not site-wide).
  //   2. Chat-channel presence requires the committee list (no lightweight endpoint
  //      exposes `chat_channel` membership today).
  //   3. Concurrency is capped via COUNT_FETCH_CONCURRENCY to avoid flooding the BFF.
  // Long-term fix: add a Snowflake-aggregated column or a lightweight
  // /api/committees/chat-exists?tags=project_uid:X endpoint.
  private initProjectCounts(): Signal<Record<string, ProjectCounts>> {
    return toSignal(
      combineLatest([toObservable(this.allProjects), toObservable(this.subProjectUidBySlug)]).pipe(
        switchMap(([projects, slugToUid]) => {
          if (projects.length === 0 || slugToUid.size === 0) {
            return of({} as Record<string, ProjectCounts>);
          }
          const initialCounts: Record<string, ProjectCounts> = {};
          for (const project of projects) {
            initialCounts[project.projectSlug] = { committees: 0, mailingLists: 0, hasChat: false };
          }
          const requests: Observable<{ slug: string; committees?: number; hasChat?: boolean; mailingLists?: number }>[] = [];
          for (const project of projects) {
            const uid = slugToUid.get(project.projectSlug);
            if (!uid) continue;
            requests.push(
              // Fetch committees (not just count) so we can detect chat_channel presence in one call.
              this.committeeService.getCommitteesByProject(uid).pipe(
                map((list) => ({
                  slug: project.projectSlug,
                  committees: list.length,
                  hasChat: list.some((c) => !!c.chat_channel),
                })),
                catchError(() => of({ slug: project.projectSlug, committees: 0, hasChat: false }))
              ),
              this.mailingListService.getMailingListsCount({ tags: `project_uid:${uid}` }).pipe(
                map((count) => ({ slug: project.projectSlug, mailingLists: count })),
                catchError(() => of({ slug: project.projectSlug, mailingLists: 0 }))
              )
            );
          }
          if (requests.length === 0) {
            return of(initialCounts);
          }
          return from(requests).pipe(
            mergeMap((req$) => req$, COUNT_FETCH_CONCURRENCY),
            scan((acc, result) => {
              const next = { ...acc, [result.slug]: { ...acc[result.slug] } };
              if (result.committees !== undefined) next[result.slug].committees = result.committees;
              if (result.hasChat !== undefined) next[result.slug].hasChat = result.hasChat;
              if (result.mailingLists !== undefined) next[result.slug].mailingLists = result.mailingLists;
              return next;
            }, initialCounts),
            startWith(initialCounts)
          );
        })
      ),
      { initialValue: {} as Record<string, ProjectCounts> }
    );
  }
}
