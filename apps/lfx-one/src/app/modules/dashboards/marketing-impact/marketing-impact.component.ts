// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { SelectComponent } from '@components/select/select.component';
import { buildMarketingImpactMonthOptions, getDefaultMarketingImpactMonth } from '@lfx-one/shared/constants';
import { ProjectContextService } from '@services/project-context.service';
import { startWith } from 'rxjs';

import type { MarketingImpactMonthOption } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-marketing-impact',
  imports: [ReactiveFormsModule, SelectComponent, ButtonComponent],
  templateUrl: './marketing-impact.component.html',
  styleUrl: './marketing-impact.component.scss',
})
export class MarketingImpactComponent {
  private readonly projectContextService = inject(ProjectContextService);
  private readonly fb = inject(FormBuilder);

  // Form
  protected readonly headerForm = this.fb.group({
    month: [getDefaultMarketingImpactMonth()],
  });

  // Static data
  protected readonly monthOptions: MarketingImpactMonthOption[] = buildMarketingImpactMonthOptions();

  // Signals
  protected readonly hasFoundation = computed(() => !!this.projectContextService.selectedFoundation());
  protected readonly foundationName = computed(() => this.projectContextService.selectedFoundation()?.name ?? '');

  // Complex computed signals
  protected readonly selectedMonth: Signal<string | null> = this.initSelectedMonth();
  protected readonly contextLabel: Signal<string> = this.initContextLabel();

  private initSelectedMonth(): Signal<string | null> {
    return toSignal(this.headerForm.get('month')!.valueChanges.pipe(startWith(getDefaultMarketingImpactMonth())), {
      initialValue: getDefaultMarketingImpactMonth(),
    });
  }

  private initContextLabel(): Signal<string> {
    return computed(() => {
      const name = this.foundationName();
      const monthValue = this.selectedMonth();
      const option = this.monthOptions.find((o) => o.value === monthValue);
      const monthLabel = option?.label ?? '';
      if (!name || !monthLabel) return '';
      return `Cross-channel performance for ${name} \u00B7 ${monthLabel}`;
    });
  }
}
