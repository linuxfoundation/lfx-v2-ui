// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, input, model, output, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { BOARD_SCOPED_PERSONA_PRIORITY, PROJECT_SCOPED_PERSONA_PRIORITY } from '@lfx-one/shared/constants';
import { LensItem, NavLens, PersonaType, ProjectContext } from '@lfx-one/shared/interfaces';
import { LensService } from '@services/lens.service';
import { NavigationService } from '@services/navigation.service';
import { PersonaService } from '@services/persona.service';
import { UserService } from '@services/user.service';
import { OnRenderDirective } from '@shared/directives/on-render.directive';
import { AutoFocus } from 'primeng/autofocus';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';

export interface DisplayLensItem {
  item: LensItem;
  isNested: boolean;
}

type SelectorTab = 'all' | 'foundations' | 'projects';

@Component({
  selector: 'lfx-project-selector',
  imports: [NgClass, ReactiveFormsModule, PopoverModule, InputTextModule, AutoFocus, OnRenderDirective, TooltipModule],
  templateUrl: './project-selector.component.html',
  styleUrl: './project-selector.component.scss',
})
export class ProjectSelectorComponent {
  private readonly userService = inject(UserService);
  private readonly navigationService = inject(NavigationService);
  private readonly lensService = inject(LensService);
  private readonly personaService = inject(PersonaService);

  public readonly lens = input.required<NavLens>();
  public readonly selectedProject = input<ProjectContext | null>(null);
  public readonly searchPlaceholder = input<string>('Search...');
  public readonly emptyMessage = input<string>('No results found');
  public readonly hybridMode = input<boolean>(false);

  public readonly itemSelected = output<LensItem>();
  public readonly isPanelOpen = model<boolean>(false);

  protected readonly activeTab = signal<SelectorTab>('all');
  protected readonly selectorTabs: readonly SelectorTab[] = ['all', 'foundations', 'projects'];
  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });

  protected readonly panelStyleClass = computed(() =>
    this.userService.impersonating() ? 'project-selector-panel project-selector-panel--with-banner' : 'project-selector-panel'
  );

  protected readonly lensTypeLabel = computed(() => {
    if (this.hybridMode()) {
      const selectedUid = this.selectedProject()?.uid;
      if (selectedUid) {
        const detected = this.personaService.detectedProjects().find((p) => p.projectUid === selectedUid);
        if (detected) {
          return detected.isFoundation ? 'Foundation' : 'Project';
        }
      }
      return this.lensService.activeLens() === 'foundation' ? 'Foundation' : 'Project';
    }
    return this.lens() === 'foundation' ? 'Foundation' : 'Project';
  });

  protected readonly displayName: Signal<string> = computed(() => {
    const project = this.selectedProject();
    return project?.name?.trim() || `Select ${this.lensTypeLabel()}`;
  });

  protected readonly displayLogo: Signal<string> = computed(() => this.selectedProject()?.logoUrl || '');

  protected readonly selectedRolePersona: Signal<PersonaType | null> = computed(() => {
    const uid = this.selectedProject()?.uid;
    if (!uid) return null;
    const detected = this.personaService.detectedProjects().find((p) => p.projectUid === uid);
    const isFoundation = detected?.isFoundation ?? this.lensService.activeLens() === 'foundation';
    const priority = isFoundation ? BOARD_SCOPED_PERSONA_PRIORITY : PROJECT_SCOPED_PERSONA_PRIORITY;
    const personaProjects = this.personaService.personaProjects();
    for (const persona of priority) {
      if ((personaProjects[persona] ?? []).some((p) => p.projectUid === uid)) {
        return persona;
      }
    }
    return null;
  });

  protected readonly selectedRoleLabel: Signal<string> = computed(() => {
    const persona = this.selectedRolePersona();
    return persona ? this.personaTypeToLabel(persona) : '';
  });

  protected readonly selectedRoleIcon: Signal<string> = computed(() => {
    const persona = this.selectedRolePersona();
    return persona ? this.personaTypeToIcon(persona) : '';
  });

  protected readonly foundationItems: Signal<LensItem[]> = computed(() => (this.hybridMode() ? this.navigationService.items('foundation')() : []));

  // The project-lens API can include foundations the user has access to. Those belong in the
  // foundation lens (or the Foundations tab in hybrid mode), never in the projects list.
  protected readonly rawProjectItems: Signal<LensItem[]> = computed(() => {
    const lens: NavLens = this.hybridMode() ? 'project' : this.lens();
    const items = this.navigationService.items(lens)();
    return lens === 'project' ? items.filter((item) => !item.isFoundation) : items;
  });

  // Kept for template backward-compat (auto-load sentinel uses items() in non-hybrid path)
  protected readonly items: Signal<LensItem[]> = computed(() => this.rawProjectItems());

  protected readonly loading: Signal<boolean> = computed(() => {
    if (this.hybridMode()) {
      return this.navigationService.loading('foundation')() || this.navigationService.loading('project')();
    }
    return this.navigationService.loading(this.lens())();
  });

  protected readonly hasMore: Signal<boolean> = computed(() => {
    if (this.hybridMode()) {
      const tab = this.activeTab();
      if (tab === 'foundations') return this.navigationService.hasMore('foundation')();
      if (tab === 'projects') return this.navigationService.hasMore('project')();
      return this.navigationService.hasMore('foundation')() || this.navigationService.hasMore('project')();
    }
    return this.navigationService.hasMore(this.lens())();
  });

  protected readonly displayedItems: Signal<DisplayLensItem[]> = computed(() => {
    if (!this.hybridMode()) {
      return this.sortByRole(this.rawProjectItems()).map((item) => ({ item, isNested: false }));
    }
    const tab = this.activeTab();
    if (tab === 'foundations') {
      return this.sortByRole(this.foundationItems()).map((item) => ({ item, isNested: false }));
    }
    if (tab === 'projects') {
      return this.sortByRole(this.rawProjectItems()).map((item) => ({ item, isNested: false }));
    }
    return this.buildAllTabItems();
  });

  // Sentinel shifts on each page load so Angular re-creates OnRenderDirective and re-fires the fetch.
  protected readonly autoLoadTriggerIndex: Signal<number> = computed(() => Math.max(0, this.displayedItems().length - 8));

  public constructor() {
    this.searchControl.valueChanges.pipe(takeUntilDestroyed()).subscribe((term) => {
      if (this.hybridMode()) {
        this.navigationService.setSearchTerm('foundation', term);
        this.navigationService.setSearchTerm('project', term);
      } else {
        this.navigationService.setSearchTerm(this.lens(), term);
      }
    });
  }

  protected selectItem(item: LensItem, popover: Popover): void {
    this.itemSelected.emit(item);
    popover.hide();
  }

  protected togglePanel(event: Event, popover: Popover): void {
    popover.toggle(event);
  }

  protected onPopoverShow(): void {
    this.isPanelOpen.set(true);
  }

  protected onPopoverHide(): void {
    this.isPanelOpen.set(false);
    this.activeTab.set('all');
    this.searchControl.setValue('', { emitEvent: false });
    if (this.hybridMode()) {
      this.navigationService.setSearchTerm('foundation', '');
      this.navigationService.setSearchTerm('project', '');
    } else {
      this.navigationService.setSearchTerm(this.lens(), '');
    }
  }

  protected loadMore(): void {
    if (this.hybridMode()) {
      const tab = this.activeTab();
      // Scope pagination to the active tab so the visible list keeps advancing instead of
      // exhausting the inactive lens first. The All tab fetches whichever side still has pages,
      // preferring foundations so they're complete before standalone projects pile on.
      if (tab === 'foundations') {
        this.navigationService.loadNextPage('foundation');
        return;
      }
      if (tab === 'projects') {
        this.navigationService.loadNextPage('project');
        return;
      }
      if (this.navigationService.hasMore('foundation')()) {
        this.navigationService.loadNextPage('foundation');
      } else {
        this.navigationService.loadNextPage('project');
      }
    } else {
      this.navigationService.loadNextPage(this.lens());
    }
  }

  protected isItemSelected(item: LensItem): boolean {
    return this.selectedProject()?.uid === item.uid;
  }

  protected getRoleLabel(item: LensItem): string {
    const persona = this.resolveRolePersona(item);
    return persona ? this.personaTypeToLabel(persona) : '';
  }

  protected getRoleIcon(item: LensItem): string {
    const persona = this.resolveRolePersona(item);
    return persona ? this.personaTypeToIcon(persona) : '';
  }

  private resolveRolePersona(item: LensItem): PersonaType | null {
    const priority = item.isFoundation ? BOARD_SCOPED_PERSONA_PRIORITY : PROJECT_SCOPED_PERSONA_PRIORITY;
    const personaProjects = this.personaService.personaProjects();
    for (const persona of priority) {
      if ((personaProjects[persona] ?? []).some((p) => p.projectUid === item.uid)) {
        return persona;
      }
    }
    return null;
  }

  private personaTypeToLabel(persona: PersonaType): string {
    const map: Record<PersonaType, string> = {
      'executive-director': 'Executive Director',
      'board-member': 'Board Member',
      maintainer: 'Maintainer',
      contributor: 'Contributor',
    };
    return map[persona] ?? '';
  }

  private personaTypeToIcon(persona: PersonaType): string {
    const map: Record<PersonaType, string> = {
      'executive-director': 'fa-light fa-briefcase',
      'board-member': 'fa-light fa-building-columns',
      maintainer: 'fa-light fa-code',
      contributor: 'fa-light fa-code',
    };
    return map[persona] ?? '';
  }

  private roleIndex(item: LensItem): number {
    const priority = item.isFoundation ? BOARD_SCOPED_PERSONA_PRIORITY : PROJECT_SCOPED_PERSONA_PRIORITY;
    const personaProjects = this.personaService.personaProjects();
    for (let i = 0; i < priority.length; i++) {
      if ((personaProjects[priority[i]] ?? []).some((p) => p.projectUid === item.uid)) {
        return i;
      }
    }
    return priority.length;
  }

  private sortByRole(items: LensItem[]): LensItem[] {
    return [...items].sort((a, b) => {
      const diff = this.roleIndex(a) - this.roleIndex(b);
      return diff !== 0 ? diff : (a.name ?? '').localeCompare(b.name ?? '');
    });
  }

  private buildAllTabItems(): DisplayLensItem[] {
    const sortedFoundations = this.sortByRole(this.foundationItems());
    const sortedProjects = this.sortByRole(this.rawProjectItems());

    // Pre-group sortedProjects by parentProjectUid in a single pass so the nesting loop is O(F + P)
    // instead of O(F × P).
    const detectedProjects = this.personaService.detectedProjects();
    const parentByProjectUid = new Map<string, string>();
    for (const dp of detectedProjects) {
      if (dp.parentProjectUid) {
        parentByProjectUid.set(dp.projectUid, dp.parentProjectUid);
      }
    }

    const foundationUidSet = new Set(sortedFoundations.map((f) => f.uid));
    const childrenByFoundationUid = new Map<string, LensItem[]>();
    const nestedProjectUids = new Set<string>();
    for (const project of sortedProjects) {
      const parentUid = parentByProjectUid.get(project.uid);
      if (parentUid && foundationUidSet.has(parentUid)) {
        const bucket = childrenByFoundationUid.get(parentUid);
        if (bucket) {
          bucket.push(project);
        } else {
          childrenByFoundationUid.set(parentUid, [project]);
        }
        nestedProjectUids.add(project.uid);
      }
    }

    const result: DisplayLensItem[] = [];
    for (const foundation of sortedFoundations) {
      result.push({ item: foundation, isNested: false });
      const children = childrenByFoundationUid.get(foundation.uid);
      if (children) {
        for (const project of children) {
          result.push({ item: project, isNested: true });
        }
      }
    }

    for (const project of sortedProjects) {
      if (!nestedProjectUids.has(project.uid)) {
        result.push({ item: project, isNested: false });
      }
    }

    return result;
  }
}
