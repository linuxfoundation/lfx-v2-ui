// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, ElementRef, inject, input, OnDestroy, output, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Project } from '@lfx-one/shared/interfaces';
import { AppService } from '@services/app.service';
import { PersonaService } from '@services/persona.service';
import { AutoFocus } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'lfx-project-selector',
  imports: [InputTextModule, FormsModule, AutoFocus],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent implements OnDestroy {
  @ViewChild('selectorTrigger') private readonly selectorTrigger?: ElementRef<HTMLDivElement>;

  public readonly projects = input.required<Project[]>();
  public readonly selectedProject = input<Project | null>(null);
  public readonly projectsOnly = input<boolean>(false);
  public readonly selectable = input<boolean>(true);
  public readonly sublabel = input<string>('');
  public readonly searchPlaceholder = input<string>('Search foundations and projects...');

  public readonly projectChange = output<Project>();

  private readonly appService = inject(AppService);
  private readonly personaService = inject(PersonaService);
  private readonly elementRef = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  private outsideClickListener: ((e: MouseEvent) => void) | null = null;

  protected readonly isOpen = this.appService.projectSelectorOpen;
  protected readonly panelTop = signal(0);
  protected readonly searchQuery = signal<string>('');

  protected readonly displayName = this.initializeDisplayName();
  protected readonly displayLogo = this.initializeDisplayLogo();
  protected readonly displayType = this.initializeDisplayType();
  protected readonly foundations = this.initializeFoundations();
  protected readonly childProjectsMap = this.initializeChildProjectsMap();
  protected readonly hasResults = this.initializeHasResults();
  protected readonly projectsOnlyList = this.initializeProjectsOnlyList();
  protected readonly isSelectable = computed(() => {
    const persona = this.personaService.currentPersona();
    const lens = this.appService.activeLens();
    // board-1 and ed-1 have exactly one foundation — no switcher
    if (lens === 'foundation' && (persona === 'board-1' || persona === 'ed-1')) return false;
    return this.projectsOnly() ? this.projectsOnlyList().length > 1 : this.foundations().length > 1;
  });

  public ngOnDestroy(): void {
    this.detachOutsideClickListener();
  }

  protected selectProject(project: Project): void {
    this.projectChange.emit(project);
    this.closePanel();
  }

  protected togglePanel(): void {
    if (this.appService.projectSelectorOpen()) {
      this.closePanel();
      return;
    }
    if (this.selectorTrigger) {
      const rect = this.selectorTrigger.nativeElement.getBoundingClientRect();
      this.panelTop.set(rect.top);
    }
    this.appService.setProjectSelectorOpen(true);
    // Attach listener on next tick so the current opening click is not caught
    setTimeout(() => this.attachOutsideClickListener(), 0);
  }

  private closePanel(): void {
    this.searchQuery.set('');
    this.appService.setProjectSelectorOpen(false);
    this.detachOutsideClickListener();
  }

  private attachOutsideClickListener(): void {
    this.outsideClickListener = (event: MouseEvent) => {
      if (!this.elementRef.nativeElement.contains(event.target as Node)) {
        this.closePanel();
      }
    };
    document.addEventListener('click', this.outsideClickListener);
    this.destroyRef.onDestroy(() => this.detachOutsideClickListener());
  }

  private detachOutsideClickListener(): void {
    if (this.outsideClickListener) {
      document.removeEventListener('click', this.outsideClickListener);
      this.outsideClickListener = null;
    }
  }

  private initializeDisplayName() {
    return computed(() => {
      const project = this.selectedProject();
      return project?.name?.trim() ?? 'Select Project';
    });
  }

  private initializeDisplayType() {
    return computed(() => {
      const sub = this.sublabel();
      if (sub) return sub;
      const project = this.selectedProject();
      if (!project) return 'Foundation';
      const validProjectIds = new Set(this.projects().map((p) => p.uid));
      const isFoundation = !project.parent_uid || project.parent_uid === '' || !validProjectIds.has(project.parent_uid);
      return isFoundation ? 'Foundation' : 'Project';
    });
  }

  private initializeProjectsOnlyList() {
    return computed(() => {
      const allProjects = this.projects();
      const query = this.searchQuery().toLowerCase().trim();
      const validProjectIds = new Set(allProjects.map((p) => p.uid));
      const childProjects = allProjects.filter((p) => p.parent_uid && p.parent_uid !== '' && validProjectIds.has(p.parent_uid));
      if (!query) return childProjects;
      return childProjects.filter((p) => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
    });
  }

  private initializeDisplayLogo() {
    return computed(() => {
      const project = this.selectedProject();
      return project?.logo_url || '';
    });
  }

  private initializeFoundations() {
    return computed(() => {
      const allProjects = this.projects();
      const query = this.searchQuery().toLowerCase().trim();

      // Create a set of all valid project UIDs for quick lookup
      const validProjectIds = new Set(allProjects.map((p) => p.uid));

      // A project is a foundation if:
      // 1. It has no parent_uid OR
      // 2. Its parent_uid doesn't exist in the projects list
      const foundationList = allProjects.filter((p) => !p.parent_uid || p.parent_uid === '' || !validProjectIds.has(p.parent_uid));

      // Apply search filter if query exists
      if (!query) {
        return foundationList;
      }

      // Filter foundations that match the query
      const matchingFoundations = foundationList.filter((f) => f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query));

      // Find foundations whose children match the query
      const foundationsWithMatchingChildren = foundationList.filter((foundation) => {
        const children = allProjects.filter(
          (p) =>
            p.parent_uid === foundation.uid &&
            validProjectIds.has(p.parent_uid) &&
            (p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
        );
        return children.length > 0;
      });

      // Combine and deduplicate using Set
      const uniqueFoundations = new Map<string, Project>();
      [...matchingFoundations, ...foundationsWithMatchingChildren].forEach((f) => {
        uniqueFoundations.set(f.uid, f);
      });

      return Array.from(uniqueFoundations.values());
    });
  }

  private initializeChildProjectsMap() {
    return computed(() => {
      const allProjects = this.projects();
      const query = this.searchQuery().toLowerCase().trim();

      // Create a set of all valid project UIDs for quick lookup
      const validProjectIds = new Set(allProjects.map((p) => p.uid));

      const map = new Map<string, Project[]>();

      // Group projects by parent_uid
      // Only include projects whose parent_uid exists in the projects list
      allProjects.forEach((project) => {
        if (project.parent_uid && project.parent_uid !== '' && validProjectIds.has(project.parent_uid)) {
          const children = map.get(project.parent_uid) || [];
          children.push(project);
          map.set(project.parent_uid, children);
        }
      });

      // If no search query, return the full map
      if (!query) {
        return map;
      }

      // Filter children by search query
      const filteredMap = new Map<string, Project[]>();
      map.forEach((children, parentId) => {
        const filtered = children.filter((c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));
        if (filtered.length > 0) {
          filteredMap.set(parentId, filtered);
        }
      });

      return filteredMap;
    });
  }

  private initializeHasResults() {
    return computed(() => {
      return this.foundations().length > 0;
    });
  }
}
