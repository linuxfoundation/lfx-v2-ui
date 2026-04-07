// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, ElementRef, HostListener, inject, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { Project, ProjectContext } from '@lfx-one/shared/interfaces';
import { AppService, Lens } from '@services/app.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { filter, map, startWith } from 'rxjs';

interface LensConfig {
  id: Lens | 'home';
  label: string;
  icon: string;
}

interface BreadcrumbState {
  lens: LensConfig;
  page: string | null;
}

// Ordered longest-first so prefix matching picks the most specific path
const ROUTE_LABELS: Array<{ path: string; label: string }> = [
  { path: '/me/overview', label: 'Overview' },
  { path: '/me/actions', label: 'My Actions' },
  { path: '/me/events', label: 'My Events' },
  { path: '/me/training', label: 'Trainings & Certifications' },
  { path: '/me/badges', label: 'Badges' },
  { path: '/me/easycla', label: 'EasyCLA' },
  { path: '/me/transactions', label: 'Transactions' },
  { path: '/foundation/overview', label: 'Overview' },
  { path: '/foundation/projects', label: 'Projects' },
  { path: '/foundation/events', label: 'Events' },
  { path: '/org/projects', label: 'Key Projects' },
  { path: '/org/code', label: 'Code Contributions' },
  { path: '/org/membership', label: 'Membership' },
  { path: '/org/benefits', label: 'Benefits' },
  { path: '/org/groups', label: 'Groups' },
  { path: '/org/cla', label: 'CLA Management' },
  { path: '/org/permissions', label: 'Access & Permissions' },
  { path: '/org/profile', label: 'Org Profile' },
  { path: '/org', label: 'Overview' },
  { path: '/mailing-lists', label: 'Mailing Lists' },
  { path: '/meetings', label: 'Meetings' },
  { path: '/groups', label: 'Groups' },
  { path: '/votes', label: 'Votes' },
  { path: '/surveys', label: 'Surveys' },
  { path: '/settings', label: 'Settings' },
  { path: '/profile', label: 'My Profile' },
];

const LENS_CONFIGS: Record<Lens, LensConfig> = {
  me: { id: 'me', label: 'Me', icon: 'fa-light fa-circle-user' },
  foundation: { id: 'foundation', label: 'Foundation', icon: 'fa-light fa-laptop-code' },
  project: { id: 'project', label: 'Project', icon: 'fa-light fa-laptop-code' },
  org: { id: 'org', label: 'Organization', icon: 'fa-light fa-building' },
};

const HOME_CONFIG: LensConfig = { id: 'home', label: 'Home', icon: 'fa-light fa-objects-column' };

@Component({
  selector: 'lfx-top-bar',
  imports: [NgClass],
  templateUrl: './top-bar.component.html',
  host: { class: 'block' },
})
export class TopBarComponent {
  // ─── Private injections ────────────────────────────────────────────────────
  private readonly appService = inject(AppService);
  private readonly router = inject(Router);
  private readonly projectService = inject(ProjectService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly elementRef = inject(ElementRef);

  // ─── Simple WritableSignals ────────────────────────────────────────────────
  protected readonly foundationDropdownOpen = signal(false);
  protected readonly projectDropdownOpen = signal(false);

  // ─── App state signals ─────────────────────────────────────────────────────
  protected readonly showDevToolbar = this.appService.showDevToolbar;
  protected readonly activeLens = this.appService.activeLens;

  // ─── Context service state (exposed for template) ──────────────────────────
  protected readonly selectedFoundation = this.projectContextService.selectedFoundation;
  protected readonly selectedProject = this.projectContextService.selectedProject;
  protected readonly topBarSubProject = this.projectContextService.topBarSubProject;

  // ─── Complex computed/toSignal signals ─────────────────────────────────────
  protected readonly isHome: Signal<boolean> = this.initIsHome();
  private readonly currentUrl: Signal<string> = this.initCurrentUrl();
  private readonly allProjects: Signal<Project[]> = this.initAllProjects();

  protected readonly breadcrumb: Signal<BreadcrumbState> = computed(() => {
    const url = this.currentUrl().split('?')[0];
    const isHome = url === '/home' || url === '/';
    if (isHome) return { lens: HOME_CONFIG, page: null };
    const lens = LENS_CONFIGS[this.appService.activeLens()];
    const page = this.resolvePageLabel(url);
    return { lens, page };
  });

  protected readonly foundations: Signal<Project[]> = computed(() => {
    const projects = this.allProjects();
    const validIds = new Set(projects.map((p) => p.uid));
    return projects.filter((p) => !p.parent_uid || p.parent_uid === '' || !validIds.has(p.parent_uid));
  });

  /** Child projects of the foundation selected in the top-bar (Home / Me lens) */
  private readonly homeChildProjects: Signal<Project[]> = computed(() => {
    const foundation = this.selectedFoundation();
    if (!foundation) return [];
    return this.allProjects().filter((p) => p.parent_uid === foundation.uid);
  });

  /** Child projects of the foundation selected in the Foundation-lens sidebar */
  private readonly foundationLensChildProjects: Signal<Project[]> = computed(() => {
    const selected = this.selectedFoundation();
    if (!selected) return [];
    return this.allProjects().filter((p) => p.parent_uid === selected.uid);
  });

  /** Projects shown in the project dropdown, based on the active lens */
  protected readonly activeChildProjects: Signal<Project[]> = computed(() => {
    return this.activeLens() === 'foundation' ? this.foundationLensChildProjects() : this.homeChildProjects();
  });

  /** Currently selected project entry for the active context */
  protected readonly activeSelectedProject: Signal<ProjectContext | null> = computed(() => {
    return this.activeLens() === 'foundation' ? this.topBarSubProject() : this.selectedProject();
  });

  protected readonly activeSelectedProjectLabel: Signal<string> = computed(() => {
    return this.activeSelectedProject()?.name ?? 'All projects';
  });

  /** Show foundation dropdown on Home and Me lens */
  protected readonly showFoundationDropdown: Signal<boolean> = computed(() => this.isHome() || this.activeLens() === 'me');

  /** Show project dropdown contextually per lens */
  protected readonly showProjectDropdown: Signal<boolean> = computed(() => {
    const lens = this.activeLens();
    if (lens === 'org') return false;
    // Foundation lens: show project dropdown when a foundation is selected in the sidebar
    if (lens === 'foundation') return !!this.selectedFoundation();
    // Home or Me: only when a foundation is chosen in the top-bar
    return !!this.selectedFoundation();
  });

  // ─── Document click — close dropdowns when clicking outside ────────────────
  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.foundationDropdownOpen.set(false);
      this.projectDropdownOpen.set(false);
    }
  }

  // ─── Protected methods ─────────────────────────────────────────────────────
  protected toggleFoundationDropdown(): void {
    const next = !this.foundationDropdownOpen();
    this.foundationDropdownOpen.set(next);
    if (next) this.projectDropdownOpen.set(false);
  }

  protected toggleProjectDropdown(): void {
    const next = !this.projectDropdownOpen();
    this.projectDropdownOpen.set(next);
    if (next) this.foundationDropdownOpen.set(false);
  }

  protected onSelectFoundation(foundation: Project | null): void {
    this.foundationDropdownOpen.set(false);
    if (!foundation) {
      this.projectContextService.clearFoundation();
      this.projectContextService.selectedProject.set(null);
    } else {
      this.projectContextService.setFoundation(foundation as ProjectContext);
      // setFoundation() already clears selectedProject
    }
  }

  protected onSelectProject(project: Project | null): void {
    this.projectDropdownOpen.set(false);
    if (this.activeLens() === 'foundation') {
      // In Foundation lens the sidebar owns selectedProject (the foundation);
      // top-bar sub-project selection is stored separately.
      this.projectContextService.topBarSubProject.set(project ? (project as ProjectContext) : null);
    } else {
      // Home / Me lens: update selectedProject directly (keep foundation signal intact)
      this.projectContextService.selectedProject.set(project ? (project as ProjectContext) : null);
    }
  }

  // ─── Private initializer functions ─────────────────────────────────────────
  private initIsHome(): Signal<boolean> {
    return toSignal(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects === '/home' || e.urlAfterRedirects === '/'),
        startWith(this.router.url === '/home' || this.router.url === '/')
      ),
      { initialValue: this.router.url === '/home' || this.router.url === '/' }
    );
  }

  private initCurrentUrl(): Signal<string> {
    return toSignal(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map((e) => e.urlAfterRedirects),
        startWith(this.router.url)
      ),
      { initialValue: this.router.url }
    );
  }

  private initAllProjects(): Signal<Project[]> {
    return toSignal(this.projectService.getProjects(), { initialValue: [] as Project[] });
  }

  private resolvePageLabel(url: string): string | null {
    const exact = ROUTE_LABELS.find((r) => r.path === url);
    if (exact) return exact.label;
    const prefix = ROUTE_LABELS.filter((r) => url.startsWith(r.path)).sort((a, b) => b.path.length - a.path.length)[0];
    return prefix?.label ?? null;
  }
}
