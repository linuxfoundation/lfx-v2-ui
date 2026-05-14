// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

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

export interface DisplayLensItem {
  item: LensItem;
  isNested: boolean;
}

type SelectorTab = 'all' | 'foundations' | 'projects';

@Component({
  selector: 'lfx-project-selector',
  imports: [ReactiveFormsModule, PopoverModule, InputTextModule, AutoFocus, OnRenderDirective],
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
      return this.lensService.activeLens() === 'foundation' ? 'Foundation' : 'Project';
    }
    return this.lens() === 'foundation' ? 'Foundation' : 'Project';
  });

  protected readonly displayName: Signal<string> = computed(() => {
    const project = this.selectedProject();
    return project?.name?.trim() || `Select ${this.lensTypeLabel()}`;
  });

  protected readonly displayLogo: Signal<string> = computed(() => this.selectedProject()?.logoUrl || '');

  protected readonly foundationItems: Signal<LensItem[]> = computed(() => (this.hybridMode() ? this.navigationService.items('foundation')() : []));

  protected readonly rawProjectItems: Signal<LensItem[]> = computed(() =>
    this.hybridMode() ? this.navigationService.items('project')() : this.navigationService.items(this.lens())()
  );

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
      if (this.navigationService.hasMore('foundation')()) {
        this.navigationService.loadNextPage('foundation');
      } else {
        this.navigationService.loadNextPage('project');
      }
    } else {
      this.navigationService.loadNextPage(this.lens());
    }
  }

  protected getRoleLabel(item: LensItem): string {
    const priority = item.isFoundation ? BOARD_SCOPED_PERSONA_PRIORITY : PROJECT_SCOPED_PERSONA_PRIORITY;
    const personaProjects = this.personaService.personaProjects();
    for (const persona of priority) {
      if ((personaProjects[persona] ?? []).some((p) => p.projectUid === item.uid)) {
        return this.personaTypeToLabel(persona);
      }
    }
    return '';
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

    // Build parentProjectUid → project uid map for nesting lookup
    const detectedProjects = this.personaService.detectedProjects();
    const parentMap = new Map<string, string>();
    for (const dp of detectedProjects) {
      if (dp.parentProjectUid) {
        parentMap.set(dp.projectUid, dp.parentProjectUid);
      }
    }

    const foundationUidSet = new Set(sortedFoundations.map((f) => f.uid));
    const result: DisplayLensItem[] = [];
    const nestedProjectUids = new Set<string>();

    for (const foundation of sortedFoundations) {
      result.push({ item: foundation, isNested: false });
      for (const project of sortedProjects) {
        const parentUid = parentMap.get(project.uid);
        if (parentUid && parentUid === foundation.uid && foundationUidSet.has(foundation.uid)) {
          result.push({ item: project, isNested: true });
          nestedProjectUids.add(project.uid);
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
