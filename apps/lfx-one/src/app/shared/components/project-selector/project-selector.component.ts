// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, ElementRef, input, model, output, signal, viewChild } from '@angular/core';
import { EnrichedPersonaProject } from '@lfx-one/shared/interfaces';
import { isFoundationProject } from '@lfx-one/shared/utils';
import { AutoFocus } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'lfx-project-selector',
  imports: [InputTextModule, AutoFocus],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class ProjectSelectorComponent {
  public readonly projects = input.required<EnrichedPersonaProject[]>();
  public readonly selectedProject = input<EnrichedPersonaProject | null>(null);
  public readonly searchPlaceholder = input<string>('Search...');
  public readonly emptyMessage = input<string>('No results found');

  public readonly projectChange = output<EnrichedPersonaProject>();
  public readonly isPanelOpen = model<boolean>(false);

  protected readonly searchQuery = signal<string>('');
  protected readonly panelTopPx = signal<number>(0);
  protected readonly panelLeftPx = signal<number>(0);

  private readonly triggerRef = viewChild<ElementRef<HTMLElement>>('trigger');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly displayName = this.initializeDisplayName();
  protected readonly displayLogo = this.initializeDisplayLogo();
  protected readonly foundations = this.initializeFoundations();
  protected readonly childProjectsMap = this.initializeChildProjectsMap();
  protected readonly hasResults = this.initializeHasResults();

  protected onEscape(): void {
    if (this.isPanelOpen()) {
      this.closePanel();
    }
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isPanelOpen()) {
      return;
    }
    const target = event.target as HTMLElement;
    const trigger = this.triggerRef()?.nativeElement;
    const panel = this.panelRef()?.nativeElement;
    if (trigger?.contains(target) || panel?.contains(target)) {
      return;
    }
    this.closePanel();
  }

  protected togglePanel(event: Event): void {
    event.stopPropagation();
    if (this.isPanelOpen()) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  protected selectProject(project: EnrichedPersonaProject): void {
    this.projectChange.emit(project);
    this.closePanel();
  }

  private openPanel(): void {
    const triggerEl = this.triggerRef()?.nativeElement;
    if (triggerEl) {
      const rect = triggerEl.getBoundingClientRect();
      this.panelTopPx.set(rect.top);
      this.panelLeftPx.set(rect.right + 8);
    }
    this.searchQuery.set('');
    this.isPanelOpen.set(true);
  }

  private closePanel(): void {
    this.isPanelOpen.set(false);
    this.searchQuery.set('');
  }

  private initializeDisplayName() {
    return computed(() => {
      const project = this.selectedProject();
      return project?.projectName?.trim() || 'Select Project';
    });
  }

  private initializeDisplayLogo() {
    return computed(() => {
      const project = this.selectedProject();
      return project?.logoUrl || '';
    });
  }

  private initializeFoundations() {
    return computed(() => {
      const allProjects = this.projects();
      const query = this.searchQuery().toLowerCase().trim();

      const foundationList = allProjects.filter((p) => isFoundationProject(p));

      if (!query) {
        return foundationList;
      }

      const matchingFoundations = foundationList.filter((f) => f.projectName?.toLowerCase().includes(query) || f.description?.toLowerCase().includes(query));

      const foundationsWithMatchingChildren = foundationList.filter((foundation) => {
        const children = allProjects.filter(
          (p) => p.parentProjectUid === foundation.projectUid && (p.projectName?.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query))
        );
        return children.length > 0;
      });

      const uniqueFoundations = new Map<string, EnrichedPersonaProject>();
      [...matchingFoundations, ...foundationsWithMatchingChildren].forEach((f) => {
        uniqueFoundations.set(f.projectUid, f);
      });

      return Array.from(uniqueFoundations.values());
    });
  }

  private initializeChildProjectsMap() {
    return computed(() => {
      const allProjects = this.projects();
      const query = this.searchQuery().toLowerCase().trim();

      const map = new Map<string, EnrichedPersonaProject[]>();

      allProjects.forEach((project) => {
        if (!isFoundationProject(project) && project.parentProjectUid) {
          const children = map.get(project.parentProjectUid) || [];
          children.push(project);
          map.set(project.parentProjectUid, children);
        }
      });

      if (!query) {
        return map;
      }

      const filteredMap = new Map<string, EnrichedPersonaProject[]>();
      map.forEach((children, parentId) => {
        const filtered = children.filter((c) => c.projectName?.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query));
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
