// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { MyEvent } from '@lfx-one/shared/interfaces';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { EventSelectionComponent } from '../event-selection/event-selection.component';
import { TravelFundTermsComponent } from '../travel-fund-terms/travel-fund-terms.component';
import { AboutMeFormComponent } from '../about-me-form/about-me-form.component';
import { TravelExpensesFormComponent } from '../travel-expenses-form/travel-expenses-form.component';

export type TravelFundStep = 'select-event' | 'terms' | 'about-me' | 'expenses';

const STEP_ORDER: TravelFundStep[] = ['select-event', 'terms', 'about-me', 'expenses'];

@Component({
  selector: 'lfx-travel-fund-application-dialog',
  imports: [ButtonComponent, EventSelectionComponent, TravelFundTermsComponent, AboutMeFormComponent, TravelExpensesFormComponent],
  templateUrl: './travel-fund-application-dialog.component.html',
  styleUrl: './travel-fund-application-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TravelFundApplicationDialogComponent {
  private readonly ref = inject(DynamicDialogRef);

  public step = signal<TravelFundStep>('select-event');
  public selectedEvent = signal<MyEvent | null>(null);
  public aboutMeFormValid = signal(false);

  public readonly isNextDisabled = computed(() => {
    if (this.step() === 'select-event') return !this.selectedEvent();
    if (this.step() === 'about-me') return !this.aboutMeFormValid();
    return false;
  });

  public readonly steps: { id: TravelFundStep; label: string; number: number }[] = [
    { id: 'select-event', label: 'Choose an Event', number: 1 },
    { id: 'terms', label: 'Terms and Conditions', number: 2 },
    { id: 'about-me', label: 'About Me', number: 3 },
    { id: 'expenses', label: 'Expenses', number: 4 },
  ];

  public onNextStep(): void {
    const currentIndex = STEP_ORDER.indexOf(this.step());
    if (currentIndex < STEP_ORDER.length - 1) {
      this.step.set(STEP_ORDER[currentIndex + 1]);
    }
  }

  public onPreviousStep(): void {
    const currentIndex = STEP_ORDER.indexOf(this.step());
    if (currentIndex > 0) {
      this.step.set(STEP_ORDER[currentIndex - 1]);
    }
  }

  public onSubmitApplication(): void {
    this.ref.close({ submitted: true });
  }

  public onCancel(): void {
    this.ref.close(null);
  }

  public isStepActive(stepId: TravelFundStep): boolean {
    return this.step() === stepId;
  }

  public isStepCompleted(stepId: TravelFundStep): boolean {
    return STEP_ORDER.indexOf(stepId) < STEP_ORDER.indexOf(this.step());
  }
}
