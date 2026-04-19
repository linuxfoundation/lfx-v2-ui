// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output, signal, Signal } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { switchMap, startWith, take } from 'rxjs';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { CardTabsBarComponent } from '@components/card-tabs-bar/card-tabs-bar.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee, COMMITTEE_LABEL } from '@lfx-one/shared';
import { FilterPillOption } from '@lfx-one/shared/interfaces';
import { CommitteeCategorySeverityPipe } from '@pipes/committee-category-severity.pipe';
import { PlatformIconPipe } from '@app/shared/pipes/platform-icon.pipe';
import { PlatformLabelPipe } from '@app/shared/pipes/platform-label.pipe';
import { CommitteeService } from '@services/committee.service';
import { PersonaService } from '@services/persona.service';
import { MessageService } from 'primeng/api';

import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'lfx-committee-table',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    CardComponent,
    CardTabsBarComponent,
    ButtonComponent,
    TableComponent,
    TagComponent,
    InputTextComponent,
    SelectComponent,
    TooltipModule,
    CommitteeCategorySeverityPipe,
    PlatformIconPipe,
    PlatformLabelPipe,
    EmptyStateComponent,
  ],
  templateUrl: './committee-table.component.html',
  styleUrl: './committee-table.component.scss',
})
export class CommitteeTableComponent {
  // Injected services
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);
  private readonly personaService = inject(PersonaService);

  // Inputs
  public committees = input.required<Committee[]>();
  public hasItems = input<boolean>(true);
  public canManageCommittee = input<boolean>(false);
  public myCommitteeUids = input<Set<string>>(new Set());
  public readonly committeeLabel = COMMITTEE_LABEL;
  public searchForm = input.required<FormGroup>();
  public categoryOptions = input.required<{ label: string; value: string | null }[]>();
  public votingStatusOptions = input.required<{ label: string; value: string | null }[]>();
  public showFoundationFilter = input<boolean>(false);
  public showProjectFilter = input<boolean>(false);
  public foundationOptions = input<{ label: string; value: string | null }[]>([]);
  public projectOptions = input<{ label: string; value: string | null }[]>([]);

  // Outputs
  public readonly refresh = output<void>();
  public readonly rowClick = output<Committee>();
  public readonly foundationFilterChange = output<string | null>();
  public readonly projectFilterChange = output<string | null>();

  // Writable signals
  protected readonly categoryTab = signal<string>('all');

  // State
  public isBoardMember: Signal<boolean> = computed(() => this.personaService.currentPersona() === 'board-member');

  private readonly formValue = toSignal(
    toObservable(this.searchForm).pipe(switchMap((form) => form.valueChanges.pipe(startWith(form.value)))),
    { initialValue: {} as Record<string, unknown> }
  );

  protected readonly isFiltered = computed(() => {
    const v = this.formValue();
    return !!v['search'] || !!v['category'] || !!v['votingStatus'] || !!v['foundationFilter'] || !!v['projectFilter'];
  });

  protected readonly rppOptions = computed<number[] | undefined>(() => (this.committees().length > 10 ? [10, 25, 50] : undefined));

  protected readonly categoryTabOptions = computed<FilterPillOption[]>(() =>
    this.categoryOptions().map((opt) => ({
      id: opt.value ?? 'all',
      label: opt.value ?? 'All',
    }))
  );

  public joinGroup(committee: Committee): void {
    const joinMode = committee.join_mode || 'closed';

    switch (joinMode) {
      case 'open':
        this.committeeService.joinCommittee(committee.uid).pipe(take(1)).subscribe({
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

  protected onRowSelect(event: { data: Committee }): void {
    this.rowClick.emit(event.data);
  }

  protected onCategoryTabChange(tab: string): void {
    this.categoryTab.set(tab);
    this.searchForm().patchValue({ category: tab === 'all' ? null : tab });
  }

  protected resetFilters(): void {
    this.categoryTab.set('all');
    this.searchForm().patchValue({ search: '', category: null, votingStatus: null, foundationFilter: null, projectFilter: null });
    this.foundationFilterChange.emit(null);
    this.projectFilterChange.emit(null);
  }
}
