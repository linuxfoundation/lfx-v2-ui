// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { MyEvent, VisaRequestApplicantInfo } from '@lfx-one/shared/interfaces';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { EventSelectionComponent } from '../event-selection/event-selection.component';
import { VisaRequestApplyFormComponent } from '../visa-request-apply-form/visa-request-apply-form.component';
import { VisaRequestTermsComponent } from '../visa-request-terms/visa-request-terms.component';

export type VisaRequestStep = 'select-event' | 'terms' | 'apply';

const STEP_ORDER: VisaRequestStep[] = ['select-event', 'terms', 'apply'];

@Component({
  selector: 'lfx-visa-request-application-dialog',
  imports: [ButtonComponent, EventSelectionComponent, VisaRequestTermsComponent, VisaRequestApplyFormComponent],
  templateUrl: './visa-request-application-dialog.component.html',
  styleUrl: './visa-request-application-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaRequestApplicationDialogComponent {
  private readonly ref = inject(DynamicDialogRef);

  public step = signal<VisaRequestStep>('select-event');
  public selectedEvent = signal<MyEvent | null>(null);
  public applyFormValid = signal(false);
  public applicantData = signal<VisaRequestApplicantInfo | null>(null);
  public submitting = signal(false);

  public readonly isNextDisabled = computed(() => {
    if (this.step() === 'select-event') return !this.selectedEvent();
    if (this.step() === 'apply') return !this.applyFormValid();
    return false;
  });

  public readonly steps: { id: VisaRequestStep; label: string; number: number }[] = [
    { id: 'select-event', label: 'Choose an Event', number: 1 },
    { id: 'terms', label: 'Terms and Conditions', number: 2 },
    { id: 'apply', label: 'Apply', number: 3 },
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
    // TODO: wire up to submit endpoint once available
    this.ref.close({ submitted: true });
  }

  public onCancel(): void {
    this.ref.close(null);
  }

  public isStepActive(stepId: VisaRequestStep): boolean {
    return this.step() === stepId;
  }

  public isStepCompleted(stepId: VisaRequestStep): boolean {
    return STEP_ORDER.indexOf(stepId) < STEP_ORDER.indexOf(this.step());
  }
}
