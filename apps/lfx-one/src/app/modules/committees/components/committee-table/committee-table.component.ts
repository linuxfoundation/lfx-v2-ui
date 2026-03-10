// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, Signal } from '@angular/core';
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
import { PersonaService } from '@services/persona.service';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TooltipModule } from 'primeng/tooltip';
import { take } from 'rxjs';

import { MemberFormComponent } from '../member-form/member-form.component';

@Component({
  selector: 'lfx-committee-table',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    CardComponent,
    ButtonComponent,
    TableComponent,
    TagComponent,
    InputTextComponent,
    SelectComponent,
    TooltipModule,
    DynamicDialogModule,
    CommitteeCategorySeverityPipe,
  ],
  providers: [DialogService],
  templateUrl: './committee-table.component.html',
  styleUrl: './committee-table.component.scss',
})
export class CommitteeTableComponent {
  // Injected services
  private readonly dialogService = inject(DialogService);
  private readonly personaService = inject(PersonaService);

  // Inputs
  public committees = input.required<Committee[]>();
  public canManageCommittee = input<boolean>(false);
  public committeeLabel = input<string>(COMMITTEE_LABEL.singular);
  public searchForm = input.required<FormGroup>();
  public categoryOptions = input.required<{ label: string; value: string | null }[]>();
  public votingStatusOptions = input.required<{ label: string; value: string | null }[]>();

  // State
  public isBoardMember: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'board-member');

  // Outputs
  public readonly refresh = output<void>();
  public readonly rowClick = output<Committee>();

  // Event handlers
  public onAddMember(committee: Committee): void {
    const dialogRef = this.dialogService.open(MemberFormComponent, {
      header: 'Add Member',
      width: '700px',
      modal: true,
      closable: true,
      data: {
        isEditing: false,
        committee: committee,
        onCancel: () => {
          // Dialog will close itself
        },
      },
    }) as DynamicDialogRef;

    dialogRef.onClose.pipe(take(1)).subscribe((result: boolean | undefined) => {
      if (result) {
        this.refresh.emit();
      }
    });
  }

  protected onRowSelect(event: { data: Committee }): void {
    this.rowClick.emit(event.data);
  }
}
