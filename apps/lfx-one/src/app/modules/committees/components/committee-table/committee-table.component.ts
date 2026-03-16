// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal, Signal, WritableSignal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee, COMMITTEE_LABEL } from '@lfx-one/shared';
import { CommitteeCategorySeverityPipe } from '@pipes/committee-category-severity.pipe';
import { CommitteeService } from '@services/committee.service';
import { PersonaService } from '@services/persona.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'lfx-committee-table',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    CardComponent,
    ButtonComponent,
    TableComponent,
    TagComponent,
    InputTextComponent,
    SelectComponent,
    TooltipModule,
    ConfirmDialogModule,
    CommitteeCategorySeverityPipe,
  ],
  providers: [ConfirmationService],
  templateUrl: './committee-table.component.html',
  styleUrl: './committee-table.component.scss',
})
export class CommitteeTableComponent {
  // Injected services
  private readonly committeeService = inject(CommitteeService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);

  // Inputs
  public committees = input.required<Committee[]>();
  public canManageCommittee = input<boolean>(false);
  public myCommitteeUids = input<Set<string>>(new Set());
  public readonly committeeLabel = COMMITTEE_LABEL;
  public searchForm = input.required<FormGroup>();
  public categoryOptions = input.required<{ label: string; value: string | null }[]>();
  public votingStatusOptions = input.required<{ label: string; value: string | null }[]>();

  // State
  public isDeleting: WritableSignal<boolean> = signal<boolean>(false);
  public isBoardMember: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'board-member');

  // Outputs
  public readonly refresh = output<void>();
  public readonly rowClick = output<Committee>();

  public joinGroup(committee: Committee): void {
    const joinMode = committee.join_mode || 'closed';

    switch (joinMode) {
      case 'open':
        this.committeeService.joinCommittee(committee.uid).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Joined',
              detail: `You have joined "${committee.name}"`,
            });
            this.refresh.emit();
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `Failed to join "${committee.name}"`,
            });
          },
        });
        break;

      case 'application':
        this.messageService.add({
          severity: 'info',
          summary: 'Apply to Join',
          detail: `"${committee.name}" requires an application. This feature is coming soon.`,
        });
        break;

      case 'invite_only':
        this.messageService.add({
          severity: 'info',
          summary: 'Invite Only',
          detail: `"${committee.name}" is invite-only. Ask an existing member to invite you.`,
        });
        break;

      case 'closed':
      default:
        this.messageService.add({
          severity: 'warn',
          summary: 'Closed',
          detail: `"${committee.name}" is not currently accepting new members.`,
        });
        break;
    }
  }

  public onDeleteCommittee(committee: Committee): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the ${this.committeeLabel.singular.toLowerCase()} "${committee.name}"? This action cannot be undone.`,
      header: `Delete ${this.committeeLabel.singular}`,
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => this.performDelete(committee),
    });
  }

  protected onRowSelect(event: { data: Committee }): void {
    this.rowClick.emit(event.data);
  }

  private performDelete(committee: Committee): void {
    this.isDeleting.set(true);

    this.committeeService.deleteCommittee(committee.uid).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${this.committeeLabel.singular} deleted successfully`,
        });
        this.refresh.emit();
      },
      error: () => {
        this.isDeleting.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to delete ${this.committeeLabel.singular.toLowerCase()}`,
        });
      },
    });
  }
}
