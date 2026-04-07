// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { LowerCasePipe, NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, input, PLATFORM_ID, Signal, signal, ViewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { BadgeComponent } from '@components/badge/badge.component';
import { ProjectSelectorComponent } from '@components/project-selector/project-selector.component';
import { environment } from '@environments/environment';
import { hasFoundationLens, MULTI_FOUNDATION_PERSONAS, PersonaType, Project, ProjectContext, SidebarMenuItem, User } from '@lfx-one/shared/interfaces';
import { AccountContextService } from '@services/account-context.service';
import { AppService } from '@services/app.service';
import { PersonaService } from '@services/persona.service';
import { UserService } from '@services/user.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { tap } from 'rxjs';

@Component({
  selector: 'lfx-sidebar',
  imports: [LowerCasePipe, NgClass, NgTemplateOutlet, RouterModule, BadgeComponent, ProjectSelectorComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  @ViewChild('scrollContainer') private readonly scrollContainer?: ElementRef<HTMLDivElement>;

  private readonly projectService = inject(ProjectService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly personaService = inject(PersonaService);
  private readonly appService = inject(AppService);
  private readonly userService = inject(UserService);
  private readonly accountContextService = inject(AccountContextService);
  private readonly platformId = inject(PLATFORM_ID);

  // Input properties
  public readonly items = input.required<SidebarMenuItem[]>();
  public readonly footerItems = input<SidebarMenuItem[]>([]);
  public readonly collapsed = input<boolean>(false);
  public readonly styleClass = input<string>('');
  public readonly showProjectSelector = input<boolean>(false);
  public readonly showOrgSelector = input<boolean>(false);
  public readonly showMeSelector = input<boolean>(false);
  public readonly grayed = input<boolean>(false);
  public readonly mobile = input<boolean>(false);

  // Org lens — selected account
  protected readonly selectedAccount = this.accountContextService.selectedAccount.asReadonly();
  protected readonly orgInitials = computed(() => {
    const name = this.selectedAccount().accountName;
    if (!name) return '?';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });
  protected readonly orgAvatarColor = computed(() => {
    const name = this.selectedAccount().accountName;
    const colors = ['bg-violet-500', 'bg-blue-500', 'bg-teal-500', 'bg-orange-500', 'bg-rose-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500'];
    if (!name) return colors[0];
    const index = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  });

  // Me lens — current user and persona
  protected readonly user = this.userService.user.asReadonly() as ReturnType<typeof this.userService.user.asReadonly>;
  protected readonly personaLabels = computed(() => this.getPersonaLabels(this.personaService.currentPersona()));
  protected readonly userInitials = computed(() => {
    const u: User | null = this.user();
    if (!u?.name) return '?';
    return u.name
      .split(' ')
      .map((n: string) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  // Load all available projects
  // so TransferState never captures it and client makes a duplicate call anyway.
  // shareReplay(1) in ProjectService deduplicates within the client runtime.
  protected readonly projects: Signal<Project[]> = this.initProjects();

  // Governance persona check — used in template for conditional rendering
  public readonly isGovernancePersona = computed(() => hasFoundationLens(this.personaService.currentPersona()));
  protected readonly foundationProjects = computed(() => this.projects());
  protected readonly activeLens = this.appService.activeLens;
  // Single-foundation roles (board-1, ed-1) must not open the foundation dropdown
  protected readonly isSelectorSelectable = computed(() => {
    const persona = this.personaService.currentPersona();
    if (this.activeLens() !== 'foundation') return true;
    return MULTI_FOUNDATION_PERSONAS.has(persona) || persona === 'maintainer-board';
  });
  protected readonly projectSublabel = computed(() => {
    const labels = this.personaLabels();
    return this.activeLens() === 'foundation' ? (labels[1] ?? labels[0] ?? '') : (labels[0] ?? '');
  });

  protected readonly selectedProject = computed(() => {
    // First check if a specific project is selected (child project)
    const project = this.projectContextService.selectedProject();
    if (project) {
      return this.projects().find((p: Project) => p.slug === project.slug) || null;
    }

    // Otherwise check for foundation selection
    const foundation = this.projectContextService.selectedFoundation();
    if (!foundation) {
      return null;
    }

    return this.projects().find((p: Project) => p.slug === foundation.slug) || null;
  });

  // ─── Foundation lens — Insights card ────────────────────────────────────
  protected readonly isFoundationSelected = computed(() => {
    const project = this.selectedProject();
    if (!project) return true;
    const validProjectIds = new Set(this.projects().map((p: Project) => p.uid));
    return !project.parent_uid || project.parent_uid === '' || !validProjectIds.has(project.parent_uid);
  });

  protected readonly insightsCardType = computed(() => (this.appService.activeLens() === 'foundation' ? 'Foundation' : 'Project'));

  // Map app slugs to LFX Insights collection slugs where they differ
  private readonly insightsSlugMap: Record<string, string> = {
    tlf: 'the-linux-foundation',
  };

  protected readonly insightsCardUrl = computed(() => {
    const project = this.selectedProject();
    if (!project) return 'https://insights.linuxfoundation.org/';
    const appSlug = project.slug;
    const insightsSlug = this.insightsSlugMap[appSlug] ?? appSlug;
    return `https://insights.linuxfoundation.org/collection/details/${insightsSlug}`;
  });

  // Section expanded state tracking - uses section labels as keys
  protected readonly sectionExpandedState = signal<Record<string, boolean>>({});

  // Computed items with test IDs, section state, isExpanded property, and external flag
  protected readonly itemsWithTestIds = computed(() =>
    this.items().map((item) => {
      const expandedState = this.sectionExpandedState();
      const defaultExpanded = item.expanded !== false;
      const isExpanded = expandedState[item.label] ?? defaultExpanded;

      return {
        ...item,
        testId: item.testId || `sidebar-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`,
        isExpanded,
        external: item.url ? this.isExternalUrl(item.url) : undefined,
        items: item.items?.map((childItem) => ({
          ...childItem,
          testId: childItem.testId || `sidebar-item-${childItem.label.toLowerCase().replace(/\s+/g, '-')}`,
          external: childItem.url ? this.isExternalUrl(childItem.url) : undefined,
        })),
      };
    })
  );

  protected readonly footerItemsWithTestIds = computed(() =>
    this.footerItems().map((item) => ({
      ...item,
      testId: item.testId || `sidebar-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`,
      external: item.url ? this.isExternalUrl(item.url) : undefined,
    }))
  );

  public constructor() {
    // Scroll sidebar to top whenever nav items change (e.g. on lens switch)
    effect(() => {
      this.items();
      this.scrollContainer?.nativeElement?.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  /**
   * Toggle section expanded state
   */
  protected onSectionToggle(sectionLabel: string, currentExpanded: boolean): void {
    this.sectionExpandedState.update((state) => ({
      ...state,
      [sectionLabel]: !currentExpanded,
    }));
  }

  /**
   * Handle project selection change - distinguish between foundation and non-foundation projects
   */
  protected onProjectChange(project: Project): void {
    const allProjects = this.projects();
    const validProjectIds = new Set(allProjects.map((p) => p.uid));

    // Determine if this is a foundation project (no parent or parent doesn't exist)
    const isFoundation = !project.parent_uid || project.parent_uid === '' || !validProjectIds.has(project.parent_uid);

    const projectContext: ProjectContext = {
      uid: project.uid,
      name: project.name,
      slug: project.slug,
    };

    if (isFoundation) {
      // Foundation project selected - set as foundation and clear selected project
      this.projectContextService.setFoundation(projectContext);
      this.projectContextService.clearProject();
    } else {
      // Child project selected - set as selected project and clear foundation
      this.projectContextService.setProject(projectContext);
      this.projectContextService.clearFoundation();
    }
  }

  /**
   * Handle logo click - navigate to home/overview
   */
  protected onLogoClick(): void {
    // Navigate to home page
    window.location.href = '/';
  }

  private initProjects(): Signal<Project[]> {
    return toSignal(
      this.projectService.getProjects().pipe(
        tap((loadedProjects: Project[]) => {
          this.projectContextService.availableProjects = loadedProjects;
          const currentFoundation = this.projectContextService.selectedFoundation();
          const currentProject = this.projectContextService.selectedProject();
          const foundationExists = loadedProjects.some((p: Project) => p.uid === currentFoundation?.uid);

          if (loadedProjects.length > 0 && (!foundationExists || !currentFoundation) && !currentProject) {
            const defaultProject = loadedProjects.find((p: Project) => p.slug === 'tlf') || loadedProjects[0];

            const projectContext: ProjectContext = {
              uid: defaultProject.uid,
              name: defaultProject.name,
              slug: defaultProject.slug,
            };
            this.projectContextService.setFoundation(projectContext);
          }
        })
      ),
      {
        initialValue: [],
      }
    );
  }

  /**
   * Determine if a URL is external (not starting with environment home URL and is absolute)
   * A URL is considered external if it starts with http:// or https:// and does NOT start with the home URL
   * Relative URLs (starting with /) are always internal
   */
  private getPersonaLabels(persona: PersonaType): string[] {
    const labels: Record<PersonaType, string[]> = {
      // V2 personas
      contributor: ['Contributor'],
      maintainer: ['Maintainer'],
      'maintainer-admin': ['Maintainer Admin'],
      'board-1': ['Board Member'],
      'board-multi': ['Board Member'],
      'ed-1': ['Executive Director'],
      'ed-multi': ['Executive Director'],
      'maintainer-board': ['Maintainer', 'Board Member'],
      'new-contributor': ['Contributor'],
      // Legacy personas
      'core-developer': ['Core Developer'],
      projects: ['Projects'],
      'board-member': ['Board Member'],
      'executive-director': ['Executive Director'],
    };
    return labels[persona] ?? [persona];
  }

  private isExternalUrl(url: string): boolean {
    if (!url) {
      return false;
    }

    // Relative URLs are internal
    if (url.startsWith('/')) {
      return false;
    }

    // Check if it's an absolute URL
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // External if it doesn't start with the home URL
      return !url.startsWith(environment.urls.home);
    }

    return false;
  }
}


