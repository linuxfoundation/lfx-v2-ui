// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { Component, computed, inject, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { StatCardGridComponent } from '@components/stat-card-grid/stat-card-grid.component';
import { TableComponent } from '@components/table/table.component';
import { DEFAULT_FOUNDATION_PROJECTS_DETAIL, FOUNDATION_PROJECT_COUNT_FETCH_CONCURRENCY, PRESENCE_PILL_IDS, UUID_REGEX } from '@lfx-one/shared/constants';
import { buildLensAwareInsightsUrl, hasAnyChannel } from '@lfx-one/shared/utils';
import { AnalyticsService } from '@services/analytics.service';
import { CommitteeService } from '@services/committee.service';
import { LensService } from '@services/lens.service';
import { MailingListService } from '@services/mailing-list.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { catchError, combineLatest, finalize, from, map, mergeMap, Observable, of, scan, startWith, switchMap } from 'rxjs';

import type {
  FilterPillOption,
  FoundationProjectsDetailResponse,
  PresencePill,
  ProjectCounts,
  ProjectTableRow,
  StatCardItem,
} from '@lfx-one/shared/interfaces';

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
  // True while any of the per-project committee / mailing-list count fetches
  // are still in flight. Flips to false once the mergeMap stream completes.
  // Used by `initPillOptions` to hide the count suffix during progressive
  // loading so "With Groups" doesn't flicker 0 → 1 → 2 → 3 per resolution.
  protected readonly countsLoading = signal(false);

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
  protected readonly projectCounts: Signal<Map<string, ProjectCounts>> = this.initProjectCounts();
  protected readonly pillOptions: Signal<FilterPillOption[]> = this.initPillOptions();

  // === Protected Methods ===
  protected getInsightsUrl(slug: string): string {
    return buildLensAwareInsightsUrl(slug, false);
  }

  protected openProjectLens(project: ProjectTableRow): void {
    this.navigateToProject(project, '/project/overview');
  }

  // True when lens navigation has a trustworthy canonical project-service UID
  // to hand to ProjectContextService. Prefers the slug→uid map; falls back to
  // Snowflake's PROJECT_ID only when it looks like a UUID (not a Salesforce ID).
  protected canOpenProjectLens(project: ProjectTableRow): boolean {
    if (this.subProjectUidBySlug().has(project.projectSlug)) return true;
    return !!project.projectId && UUID_REGEX.test(project.projectId);
  }

  protected getCountFor(project: ProjectTableRow): ProjectCounts {
    return this.projectCounts().get(project.projectSlug) ?? { committees: 0, mailingLists: 0, hasChat: false };
  }

  protected onPillChange(pillId: string): void {
    // Runtime-validate against PRESENCE_PILL_IDS (the same tuple PresencePill
    // is derived from). An unknown id is a contract bug — silently no-op
    // rather than cast-through, which would short-circuit all filter branches
    // and look like "All" while not being semantically "all".
    if (!(PRESENCE_PILL_IDS as readonly string[]).includes(pillId)) return;
    this.activePill.set(pillId as PresencePill);
  }

  // === Private Initializers ===
  private initRawData(): Signal<FoundationProjectsDetailResponse> {
    return toSignal(
      toObservable(this.foundationSlug).pipe(
        switchMap((slug) => {
          // Reset the presence filter back to "All" on every foundation change
          // so a selection from the previous foundation (e.g. "With Groups")
          // doesn't silently narrow the new foundation's table while the pill
          // still appears active.
          this.activePill.set('all');
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
          // `startWith(DEFAULT)` clears rawData immediately on slug change,
          // symmetric with `subProjectUidBySlug`'s own startWith. Without it,
          // `initProjectCounts`'s combineLatest could briefly pair the NEW
          // slug→uid map with the OLD projects list and fire count fetches
          // against the wrong data.
          return this.analyticsService.getFoundationProjectsDetail(slug).pipe(
            startWith(DEFAULT_FOUNDATION_PROJECTS_DETAIL),
            finalize(() => this.loading.set(false))
          );
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

  private initFilteredProjects(): Signal<ProjectTableRow[]> {
    return computed(() => {
      const query = this.searchQuery().toLowerCase().trim();
      const pill = this.activePill();
      const counts = this.projectCounts();
      return this.allProjects().filter((project) => {
        if (query && !project.projectName.toLowerCase().includes(query)) return false;
        const row = counts.get(project.projectSlug);
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
  //   3. Concurrency is capped via FOUNDATION_PROJECT_COUNT_FETCH_CONCURRENCY to
  //      avoid flooding the BFF.
  // Long-term fix: add a Snowflake-aggregated column or a lightweight
  // /api/committees/chat-exists?tags=project_uid:X endpoint.
  private initProjectCounts(): Signal<Map<string, ProjectCounts>> {
    return toSignal(
      combineLatest([toObservable(this.allProjects), toObservable(this.subProjectUidBySlug)]).pipe(
        switchMap(([projects, slugToUid]) => {
          if (projects.length === 0 || slugToUid.size === 0) {
            this.countsLoading.set(false);
            return of(new Map<string, ProjectCounts>());
          }
          this.countsLoading.set(true);
          const initialCounts = new Map<string, ProjectCounts>();
          for (const project of projects) {
            initialCounts.set(project.projectSlug, { committees: 0, mailingLists: 0, hasChat: false });
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
            this.countsLoading.set(false);
            return of(initialCounts);
          }
          return from(requests).pipe(
            mergeMap((req$) => req$, FOUNDATION_PROJECT_COUNT_FETCH_CONCURRENCY),
            scan((acc, result) => {
              const existing = acc.get(result.slug) ?? { committees: 0, mailingLists: 0, hasChat: false };
              const next = new Map(acc);
              next.set(result.slug, {
                committees: result.committees ?? existing.committees,
                mailingLists: result.mailingLists ?? existing.mailingLists,
                hasChat: result.hasChat ?? existing.hasChat,
              });
              return next;
            }, initialCounts),
            startWith(initialCounts),
            finalize(() => this.countsLoading.set(false))
          );
        })
      ),
      { initialValue: new Map<string, ProjectCounts>() }
    );
  }

  private initPillOptions(): Signal<FilterPillOption[]> {
    return computed(() => {
      const projects = this.allProjects();
      const counts = this.projectCounts();
      // Hide the presence-pill count suffixes while per-project committee /
      // mailing-list fetches are still streaming in — otherwise labels flicker
      // "With Groups (0)" → "(1)" → "(2)" per resolved row. The "All (N)" count
      // is sourced from rawData and is stable from first paint, so it stays.
      const countsStreaming = this.countsLoading();
      const withGroups = projects.filter((p) => (counts.get(p.projectSlug)?.committees ?? 0) > 0).length;
      const withoutGroups = projects.length - withGroups;
      // Channels = mailing lists OR chat channel. A project with just a chat
      // channel should still count as "with channels" to match the Channels column.
      const withChannels = projects.filter((p) => hasAnyChannel(counts.get(p.projectSlug))).length;
      const withoutChannels = projects.length - withChannels;
      const suffix = (n: number): string => (countsStreaming ? '' : ` (${n})`);
      return [
        { id: 'all', label: `All (${projects.length})` },
        { id: 'with-groups', label: `With Groups${suffix(withGroups)}` },
        { id: 'without-groups', label: `Without Groups${suffix(withoutGroups)}` },
        { id: 'with-channels', label: `With Channels${suffix(withChannels)}` },
        { id: 'without-channels', label: `Without Channels${suffix(withoutChannels)}` },
      ];
    });
  }

  // === Private Helper Methods ===
  private navigateToProject(project: ProjectTableRow, destination: string): void {
    // Resolve the canonical project-service UID from the foundation's sub-project
    // listing — this is the same identifier that committee/mailing-list tagging
    // uses. Only fall back to Snowflake's PROJECT_ID when it's already a UUID;
    // some foundations' PROJECT_ID is a Salesforce ID, which would lens-switch
    // to the wrong (or invalid) project. If neither is available, no-op — the
    // template's [disabled] binding should have blocked this click anyway.
    const mappedUid = this.subProjectUidBySlug().get(project.projectSlug);
    let resolvedUid: string | undefined;
    if (mappedUid) {
      resolvedUid = mappedUid;
    } else if (project.projectId && UUID_REGEX.test(project.projectId)) {
      resolvedUid = project.projectId;
    }
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
}
