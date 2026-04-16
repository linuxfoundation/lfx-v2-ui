// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  BoardMemberDetectionExtra,
  CommitteeMemberDetectionExtra,
  DashboardSummaryPills,
  EnrichedPersonaProject,
  MultiFoundationSummaryResponse,
  PendingActionItem,
  PerFoundationAnalytics,
  PersonaProjectRow,
  ProjectContext,
} from '@lfx-one/shared/interfaces';
import { SurveyStatus } from '@lfx-one/shared/enums';
import { AnalyticsService } from '@services/analytics.service';
import { HiddenActionsService } from '@services/hidden-actions.service';
import { LensService } from '@services/lens.service';
import { PersonaService } from '@services/persona.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { SurveyService } from '@services/survey.service';
import { UserService } from '@services/user.service';
import { SkeletonModule } from 'primeng/skeleton';
import { BehaviorSubject, catchError, combineLatest, filter, map, of, switchMap, take } from 'rxjs';

import { MyMeetingsComponent } from '../components/my-meetings/my-meetings.component';
import { PendingActionsComponent } from '../components/pending-actions/pending-actions.component';

@Component({
  selector: 'lfx-multi-persona-dashboard',
  imports: [SkeletonModule, MyMeetingsComponent, PendingActionsComponent],
  templateUrl: './multi-persona-dashboard.component.html',
  styleUrl: './multi-persona-dashboard.component.scss',
})
export class MultiPersonaDashboardComponent {
  private readonly personaService = inject(PersonaService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly surveyService = inject(SurveyService);
  private readonly userService = inject(UserService);
  private readonly projectService = inject(ProjectService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly lensService = inject(LensService);
  private readonly hiddenActionsService = inject(HiddenActionsService);

  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly rolePriority: string[] = [
    'Executive Director',
    'Chair',
    'Vice Chair',
    'Treasurer',
    'Secretary',
    'Counsel',
    'Director',
    'Lead',
    'TAC/TOC Representative',
    'LF Staff',
    'Developer Seat',
    'Maintainer',
    'Contributor',
    'Member',
    'None',
  ];

  private readonly votingPriority: string[] = ['Voting Rep', 'Alternate Voting Rep', 'Observer', 'Emeritus', 'None'];

  // All detected projects (foundations + projects)
  protected readonly allProjects: Signal<EnrichedPersonaProject[]> = computed(() => this.personaService.detectedProjects());

  // Only foundations (for analytics fetch)
  protected readonly userFoundations: Signal<EnrichedPersonaProject[]> = computed(() => this.allProjects().filter((p) => p.isFoundation));

  // Visibility flags
  protected readonly hasFoundations: Signal<boolean> = computed(() => this.allProjects().some((p) => p.isFoundation));
  protected readonly hasProjects: Signal<boolean> = computed(() => this.allProjects().some((p) => !p.isFoundation));
  protected readonly showTypeColumn: Signal<boolean> = computed(() => this.hasFoundations() && this.hasProjects());

  // Section title
  protected readonly sectionTitle: Signal<string> = computed(() => {
    if (this.hasFoundations() && this.hasProjects()) return 'My Foundations and Projects';
    if (this.hasFoundations()) return 'My Foundations';
    return 'My Projects';
  });

  protected readonly subtitleText: Signal<string> = this.initSubtitleText();
  protected readonly roleGroups: Signal<{ label: string; names: string[] }[]> = this.initRoleGroups();
  protected readonly analyticsSummary: Signal<MultiFoundationSummaryResponse | null> = this.initAnalyticsSummary();
  protected readonly projectRows: Signal<PersonaProjectRow[]> = this.initProjectRows();
  protected readonly summaryPills: Signal<DashboardSummaryPills> = this.initSummaryPills();
  protected readonly pendingActions: Signal<PendingActionItem[]> = this.initPendingActions();

  public openRow(row: PersonaProjectRow): void {
    const context: ProjectContext = {
      uid: row.projectUid,
      name: row.projectName,
      slug: row.projectSlug,
    };
    if (row.type === 'foundation') {
      this.projectContextService.setFoundation(context);
      this.lensService.setLens('foundation');
    } else {
      this.projectContextService.setProject(context);
      this.lensService.setLens('project');
    }
  }

  public handleActionClick(): void {
    this.refresh$.next();
  }

  private initSubtitleText(): Signal<string> {
    return computed(() => {
      const personas = this.personaService.allPersonas();
      const roleLabels = personas.map((p) => {
        switch (p) {
          case 'executive-director':
            return 'executive director';
          case 'board-member':
            return 'board';
          case 'maintainer':
            return 'maintainer';
          case 'contributor':
            return 'contributor';
          default:
            return p;
        }
      });
      const label = roleLabels.join(' and ');

      if (this.hasFoundations() && this.hasProjects()) {
        return `Your ${label} activity across all projects and foundations.`;
      }
      if (this.hasFoundations()) {
        return `Your ${label} activity across ${this.userFoundations().length} foundations.`;
      }
      return `Your ${label} activity across ${this.allProjects().length} projects.`;
    });
  }

  private initRoleGroups(): Signal<{ label: string; names: string[] }[]> {
    return computed(() => {
      const projects = this.allProjects();
      const groups: { label: string; names: string[] }[] = [];

      const edProjects = projects.filter((p) => p.personas.includes('executive-director'));
      const boardProjects = projects.filter((p) => p.personas.includes('board-member'));
      const maintainerProjects = projects.filter((p) => p.personas.includes('maintainer'));
      const contributorProjects = projects.filter((p) => p.personas.includes('contributor') && !p.personas.includes('maintainer'));

      if (edProjects.length > 0) {
        groups.push({ label: 'Executive Director', names: edProjects.map((p) => p.projectName || p.projectSlug) });
      }
      if (boardProjects.length > 0) {
        groups.push({ label: 'Board Member', names: boardProjects.map((p) => p.projectName || p.projectSlug) });
      }
      if (maintainerProjects.length > 0) {
        groups.push({ label: 'Maintainer', names: maintainerProjects.map((p) => p.projectName || p.projectSlug) });
      }
      if (contributorProjects.length > 0) {
        groups.push({ label: 'Contributor', names: contributorProjects.map((p) => p.projectName || p.projectSlug) });
      }

      return groups;
    });
  }

  private initAnalyticsSummary(): Signal<MultiFoundationSummaryResponse | null> {
    return toSignal(
      toObservable(this.userFoundations).pipe(
        filter((foundations) => foundations.length > 0),
        switchMap((foundations) => {
          const slugs = foundations.map((f) => f.projectSlug);
          return this.analyticsService.getMultiFoundationSummary(slugs).pipe(catchError(() => of(null)));
        })
      ),
      { initialValue: null }
    );
  }

  private initProjectRows(): Signal<PersonaProjectRow[]> {
    return computed(() => {
      const projects = this.allProjects();
      const analytics = this.analyticsSummary();

      const rows = projects.map((project) => {
        const isFoundation = project.isFoundation;
        const perFoundation = isFoundation ? analytics?.perFoundation[project.projectSlug] : null;

        return {
          projectUid: project.projectUid,
          projectSlug: project.projectSlug,
          projectName: project.projectName || project.projectSlug,
          logoUrl: project.logoUrl,
          type: isFoundation ? ('foundation' as const) : ('project' as const),
          subtitle: this.getRowSubtitle(project, perFoundation),
          role: this.getRowRole(project),
          healthStatus: isFoundation ? this.getHealthStatus(perFoundation?.healthScores) : null,
          healthDetail: isFoundation ? this.getHealthDetail(perFoundation?.healthScores) : null,
          votingStatus: this.getHighestVotingStatus(project),
        };
      });

      // Sort: foundations first, then by role priority, then alphabetically by name
      return rows.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'foundation' ? -1 : 1;
        }
        const aRoleIdx = this.rolePriority.indexOf(a.role);
        const bRoleIdx = this.rolePriority.indexOf(b.role);
        const roleCompare = (aRoleIdx === -1 ? 999 : aRoleIdx) - (bRoleIdx === -1 ? 999 : bRoleIdx);
        if (roleCompare !== 0) return roleCompare;
        return a.projectName.localeCompare(b.projectName);
      });
    });
  }

  private initSummaryPills(): Signal<DashboardSummaryPills> {
    return toSignal(
      combineLatest([
        toObservable(this.allProjects),
        this.surveyService.getMySurveys().pipe(catchError(() => of([]))),
        this.userService.getUserMeetings().pipe(catchError(() => of([]))),
      ]).pipe(
        map(([projects, surveys, meetings]) => {
          const foundationCount = projects.filter((p) => p.isFoundation).length;
          const projectCount = projects.filter((p) => !p.isFoundation).length;
          const openSurveys = surveys.filter((s) => s.survey_status === SurveyStatus.OPEN || s.survey_status === SurveyStatus.SENT).length;
          const now = new Date();
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 7);
          const meetingsThisWeek = meetings.filter((m) => {
            const meetingDate = new Date(m.start_time || m.created_at);
            return meetingDate >= startOfWeek && meetingDate < endOfWeek;
          }).length;

          return {
            foundationCount,
            projectCount,
            openSurveys,
            meetingsThisWeek,
            itemsNeedReview: 0,
          };
        })
      ),
      { initialValue: { foundationCount: 0, projectCount: 0, openSurveys: 0, meetingsThisWeek: 0, itemsNeedReview: 0 } }
    );
  }

  private initPendingActions(): Signal<PendingActionItem[]> {
    return toSignal(
      this.refresh$.pipe(
        switchMap(() => toObservable(this.userFoundations).pipe(take(1))),
        switchMap((foundations) => {
          if (foundations.length === 0) return of([]);
          const first = foundations[0];
          return this.projectService
            .getPendingActions(first.projectSlug, first.projectUid, this.personaService.currentPersona())
            .pipe(catchError(() => of([])));
        }),
        map((actions) => actions.filter((item) => !this.hiddenActionsService.isActionHidden(item)).slice(0, 2))
      ),
      { initialValue: [] }
    );
  }

  private getRowSubtitle(project: EnrichedPersonaProject, analytics: PerFoundationAnalytics | null | undefined): string {
    if (project.isFoundation) {
      const projects = analytics?.totalProjects ?? 0;
      const members = analytics?.totalMembers ?? 0;
      return `${projects} projects · ${members.toLocaleString()} members`;
    }
    // For sub-projects, show parent foundation name
    const parentFoundation = this.userFoundations().find((f) => f.projectUid === project.parentProjectUid);
    const parentName = parentFoundation?.projectName || '';
    return parentName ? `${parentName}` : '';
  }

  private getRowRole(project: EnrichedPersonaProject): string {
    // For foundations, check board_member/committee_member detection extras
    if (project.isFoundation) {
      return this.getHighestRole(project);
    }
    // For projects, derive from persona type
    if (project.personas.includes('maintainer')) return 'Maintainer';
    if (project.personas.includes('contributor')) return 'Contributor';
    return this.getHighestRole(project);
  }

  private getHighestRole(project: EnrichedPersonaProject): string {
    const roles: string[] = [];
    for (const detection of project.detections) {
      if (detection.source === 'board_member') {
        const extra = detection.extra as BoardMemberDetectionExtra | undefined;
        if (extra?.role) {
          roles.push(extra.role);
        }
      } else if (detection.source === 'committee_member') {
        const extra = detection.extra as CommitteeMemberDetectionExtra | undefined;
        if (extra?.role) {
          roles.push(extra.role);
        }
      }
    }
    if (project.personas.includes('executive-director')) {
      roles.push('Executive Director');
    }
    if (roles.length === 0) return 'Member';
    return this.pickByPriority(roles, this.rolePriority) ?? roles[0];
  }

  private getHighestVotingStatus(project: EnrichedPersonaProject): string | null {
    const statuses: string[] = [];
    for (const detection of project.detections) {
      if (detection.source === 'board_member') {
        const extra = detection.extra as BoardMemberDetectionExtra | undefined;
        if (extra?.voting_status) {
          statuses.push(extra.voting_status);
        }
      }
    }
    if (statuses.length === 0) return null;
    return this.pickByPriority(statuses, this.votingPriority) ?? statuses[0];
  }

  private pickByPriority(values: string[], priority: string[]): string | null {
    for (const p of priority) {
      if (values.some((v) => v.toLowerCase() === p.toLowerCase())) {
        return p;
      }
    }
    return null;
  }

  private getHealthStatus(scores?: {
    excellent: number;
    healthy: number;
    stable: number;
    unsteady: number;
    critical: number;
  }): 'on-track' | 'watch' | 'needs-attention' {
    if (!scores) return 'on-track';
    if (scores.critical + scores.unsteady > 0) return 'needs-attention';
    if (scores.stable > 0) return 'watch';
    return 'on-track';
  }

  private getHealthDetail(scores?: { excellent: number; healthy: number; stable: number; unsteady: number; critical: number }): string {
    if (!scores) return 'On Track';
    const needsAttention = scores.critical + scores.unsteady;
    if (needsAttention > 0) return `${needsAttention} need attention`;
    if (scores.stable > 0) return `${scores.stable} watch`;
    return 'On Track';
  }
}
