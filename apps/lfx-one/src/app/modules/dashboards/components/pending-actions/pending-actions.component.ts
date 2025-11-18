// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed, ElementRef, inject, output, signal, ViewChild } from '@angular/core';
import { PersonaService } from '@app/shared/services/persona.service';
import { ButtonComponent } from '@components/button/button.component';
import { BOARD_MEMBER_ACTION_ITEMS, CORE_DEVELOPER_ACTION_ITEMS, MAINTAINER_ACTION_ITEMS } from '@lfx-one/shared/constants';

import type { PendingActionItem } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-pending-actions',
  standalone: true,
  imports: [CommonModule, ButtonComponent],
  templateUrl: './pending-actions.component.html',
  styleUrl: './pending-actions.component.scss',
})
export class PendingActionsComponent implements AfterViewInit {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  private readonly personaService = inject(PersonaService);

  public readonly actionClick = output<PendingActionItem>();
  public readonly viewAll = output<void>();

  public readonly canScrollUp = signal<boolean>(false);
  public readonly canScrollDown = signal<boolean>(false);

  /**
   * Computed signal that returns action items based on the current persona
   */
  protected readonly pendingActions = computed<PendingActionItem[]>(() => {
    const persona = this.personaService.currentPersona();

    switch (persona) {
      case 'maintainer':
        return MAINTAINER_ACTION_ITEMS;
      case 'board-member':
        return BOARD_MEMBER_ACTION_ITEMS;
      case 'core-developer':
      default:
        return CORE_DEVELOPER_ACTION_ITEMS;
    }
  });

  public ngAfterViewInit(): void {
    // Initialize scroll state after view is ready
    setTimeout(() => this.onScroll(), 0);
  }

  public onScroll(): void {
    if (!this.scrollContainer?.nativeElement) return;
    const container = this.scrollContainer.nativeElement;
    
    // Check if can scroll up (not at the top)
    this.canScrollUp.set(container.scrollTop > 0);
    
    // Check if can scroll down (not at the bottom)
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    this.canScrollDown.set(container.scrollTop < maxScrollTop - 1);
  }

  public handleViewAll(): void {
    this.viewAll.emit();
  }

  protected handleActionClick(item: PendingActionItem): void {
    this.actionClick.emit(item);
  }
}
