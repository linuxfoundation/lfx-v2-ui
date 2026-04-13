// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EventsService } from '@app/shared/services/events.service';
import { ButtonComponent } from '@components/button/button.component';
import { MyEvent, TravelFundAboutMe, TravelFundApplication, TravelFundExpenses, TravelFundStep } from '@lfx-one/shared/interfaces';
import { MessageService } from 'primeng/api';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { EventSelectionComponent } from '../event-selection/event-selection.component';
import { TravelFundTermsComponent } from '../travel-fund-terms/travel-fund-terms.component';
import { AboutMeFormComponent } from '../about-me-form/about-me-form.component';
import { TravelExpensesFormComponent } from '../travel-expenses-form/travel-expenses-form.component';

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
  private readonly eventsService = inject(EventsService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  public step = signal<TravelFundStep>('select-event');
  public selectedEvent = signal<MyEvent | null>(null);
  public termsAccepted = signal(false);
  public aboutMeFormValid = signal(false);
  public aboutMeData = signal<TravelFundAboutMe | null>(null);
  public expensesData = signal<TravelFundExpenses | null>(null);
  public submitting = signal(false);

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

  public readonly stepStates = computed(() =>
    this.steps.map((s) => ({
      ...s,
      isActive: this.step() === s.id,
      isCompleted: STEP_ORDER.indexOf(s.id) < STEP_ORDER.indexOf(this.step()),
    }))
  );

  public onNextStep(): void {
    if (this.step() === 'terms') {
      this.termsAccepted.set(true);
    }
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
    const event = this.selectedEvent();
    const aboutMe = this.aboutMeData();

    if (!event || !aboutMe) return;

    const payload: TravelFundApplication = {
      eventId: event.id,
      eventName: event.name,
      termsAccepted: this.termsAccepted(),
      aboutMe,
      expenses: this.expensesData() ?? {
        airfareCost: 0,
        airfareNotes: '',
        hotelCost: 0,
        hotelNotes: '',
        groundTransportCost: 0,
        groundTransportNotes: '',
        estimatedTotal: 0,
      },
    };

    this.submitting.set(true);

    this.eventsService
      .submitTravelFundApplication(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: 'Your travel fund application has been submitted successfully.',
            });
            this.ref.close({ submitted: true });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Submission Failed',
              detail: response.message ?? 'Unable to submit your application. Please try again.',
            });
            this.submitting.set(false);
          }
        },
        error: () => this.submitting.set(false),
      });
  }

  public onCancel(): void {
    this.ref.close(null);
  }
}
