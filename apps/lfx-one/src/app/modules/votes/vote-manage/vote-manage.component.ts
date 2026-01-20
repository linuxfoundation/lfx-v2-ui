// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import { COMMITTEE_LABEL, VOTE_LABEL, VOTE_TOTAL_STEPS } from '@lfx-one/shared/constants';
import { PollStatus, PollType } from '@lfx-one/shared/enums';
import { CommitteeReference, Vote } from '@lfx-one/shared/interfaces';
import { ProjectContextService } from '@services/project-context.service';
import { MessageService } from 'primeng/api';
import { StepperModule } from 'primeng/stepper';
import { of, switchMap } from 'rxjs';

import { VoteBasicsComponent } from '../components/vote-basics/vote-basics.component';
import { VoteQuestionComponent } from '../components/vote-question/vote-question.component';

@Component({
  selector: 'lfx-vote-manage',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, StepperModule, VoteBasicsComponent, VoteQuestionComponent],
  templateUrl: './vote-manage.component.html',
  styleUrl: './vote-manage.component.scss',
})
export class VoteManageComponent {
  // Private injections
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly projectContextService = inject(ProjectContextService);

  // Protected constants
  public readonly totalSteps = VOTE_TOTAL_STEPS;
  public readonly committeeLabel = COMMITTEE_LABEL;
  public readonly voteLabel = VOTE_LABEL;

  // Form
  public readonly form = signal<FormGroup>(this.createFormGroup());

  // Simple WritableSignals
  public readonly mode = signal<'create' | 'edit'>('create');
  public readonly voteId = signal<string | null>(null);
  public readonly submitting = signal<boolean>(false);
  private readonly internalStep = signal<number>(1);

  // Complex computed/toSignal signals
  public readonly isEditMode: Signal<boolean> = this.initIsEditMode();
  public readonly vote: Signal<Vote | null> = this.initVote();
  public readonly project: Signal<ReturnType<typeof this.projectContextService.selectedProject>> = this.initProject();
  public readonly formValue: Signal<Record<string, unknown>> = this.initFormValue();
  public readonly canGoPrevious: Signal<boolean> = this.initCanGoPrevious();
  public readonly canGoNext: Signal<boolean> = this.initCanGoNext();
  public readonly isFirstStep: Signal<boolean> = this.initIsFirstStep();
  public readonly isLastStep: Signal<boolean> = this.initIsLastStep();
  public currentStep: Signal<number> = this.initCurrentStep();

  public nextStep(): void {
    const next = this.currentStep() + 1;
    if (next <= this.totalSteps && this.canNavigateToStep(next)) {
      if (this.isEditMode()) {
        this.router.navigate([], { queryParams: { step: next } });
      } else {
        this.internalStep.set(next);
      }
    }
  }

  public previousStep(): void {
    const previous = this.currentStep() - 1;
    if (previous >= 1) {
      if (this.isEditMode()) {
        this.router.navigate([], { queryParams: { step: previous } });
      } else {
        this.internalStep.set(previous);
      }
    }
  }

  public goToStep(step: number | undefined): void {
    if (step !== undefined && step >= 1 && step <= this.totalSteps) {
      if (this.isEditMode()) {
        // In edit mode, allow navigation to any step via query params
        this.router.navigate([], { queryParams: { step } });
      } else if (step <= this.currentStep()) {
        // In create mode, only allow going back to previous steps
        this.internalStep.set(step);
      }
    }
  }

  public onCancel(): void {
    this.router.navigate(['/votes']);
  }

  public onSaveAsDraft(): void {
    // TODO: Implement save as draft functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Draft',
      detail: `${this.voteLabel.singular} saved as draft`,
    });
  }

  public onSubmit(): void {
    if (this.form().invalid) {
      this.markFormControlsAsTouched();
      return;
    }

    this.submitting.set(true);

    // TODO: Implement actual API call
    // For now, simulate success
    setTimeout(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `${this.voteLabel.singular} ${this.isEditMode() ? 'updated' : 'created'} successfully`,
      });
      this.submitting.set(false);
      this.router.navigate(['/votes']);
    }, 1000);
  }

  public isCurrentStepValid(): boolean {
    return this.isStepValid(this.currentStep());
  }

  /**
   * Create a new question FormGroup with default values
   */
  public createQuestionFormGroup(): FormGroup {
    return new FormGroup({
      question: new FormControl('', [Validators.required, Validators.minLength(10)]),
      response_type: new FormControl<'single' | 'multiple'>('single', [Validators.required]),
      options: new FormArray(
        [new FormControl('', [Validators.required, Validators.minLength(1)]), new FormControl('', [Validators.required, Validators.minLength(1)])],
        [Validators.minLength(2)]
      ),
    });
  }

  // Private initializer functions
  private createFormGroup(): FormGroup {
    return new FormGroup({
      // Step 1: Vote Basics
      title: new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]),
      description: new FormControl(''),
      committee: new FormControl<CommitteeReference | null>(null, [Validators.required]),
      eligible_participants: new FormControl('', [Validators.required]),
      close_date: new FormControl<Date | null>(null, [Validators.required]),

      // Step 2: Vote Questions (array of questions)
      questions: new FormArray([this.createQuestionFormGroup()], [Validators.minLength(1)]),
    });
  }

  private initIsEditMode(): Signal<boolean> {
    return computed(() => this.mode() === 'edit');
  }

  private initVote(): Signal<Vote | null> {
    return toSignal(
      this.route.paramMap.pipe(
        switchMap((params) => {
          const voteId = params.get('id');
          if (voteId) {
            this.mode.set('edit');
            this.voteId.set(voteId);
            // TODO: Fetch vote from API
            // For now, return mock data
            return of(this.getMockVote(voteId));
          }
          this.mode.set('create');
          return of(null);
        })
      ),
      { initialValue: null }
    );
  }

  private initProject(): Signal<ReturnType<typeof this.projectContextService.selectedProject>> {
    return computed(() => this.projectContextService.selectedProject() || this.projectContextService.selectedFoundation());
  }

  private initFormValue(): Signal<Record<string, unknown>> {
    return toSignal(this.form().valueChanges, { initialValue: this.form().value });
  }

  private initCanGoPrevious(): Signal<boolean> {
    return computed(() => this.currentStep() > 1);
  }

  private initCanGoNext(): Signal<boolean> {
    return computed(() => {
      // Access formValue to trigger reactivity on form changes
      this.formValue();
      return this.currentStep() < this.totalSteps && this.canNavigateToStep(this.currentStep() + 1);
    });
  }

  private initIsFirstStep(): Signal<boolean> {
    return computed(() => this.currentStep() === 1);
  }

  private initIsLastStep(): Signal<boolean> {
    return computed(() => this.currentStep() === this.totalSteps);
  }

  private initCurrentStep(): Signal<number> {
    return toSignal(
      this.route.queryParamMap.pipe(
        switchMap((params) => {
          // In edit mode, use query parameters
          if (this.isEditMode()) {
            const stepParam = params.get('step');
            if (stepParam) {
              const step = parseInt(stepParam, 10);
              if (step >= 1 && step <= this.totalSteps) {
                return of(step);
              }
            }
            return of(1);
          }
          // In create mode, use internal step signal
          return toObservable(this.internalStep);
        })
      ),
      { initialValue: 1 }
    );
  }

  private canNavigateToStep(step: number): boolean {
    // Allow navigation to previous steps or current step
    if (step <= this.currentStep()) {
      return true;
    }

    // For forward navigation, validate all previous steps
    for (let i = 1; i < step; i++) {
      if (!this.isStepValid(i)) {
        return false;
      }
    }
    return true;
  }

  private isStepValid(step: number): boolean {
    const form = this.form();

    switch (step) {
      case 1: {
        const titleValid = !!form.get('title')?.valid;
        const committeeValid = !!form.get('committee')?.value;
        const eligibleParticipantsValid = !!form.get('eligible_participants')?.value;
        const closeDateValid = !!form.get('close_date')?.value;
        return titleValid && committeeValid && eligibleParticipantsValid && closeDateValid;
      }
      case 2: {
        const questionsArray = form.get('questions') as FormArray;
        if (questionsArray.length === 0) {
          return false;
        }
        // Validate each question
        return questionsArray.controls.every((questionGroup) => {
          const qg = questionGroup as FormGroup;
          const questionValid = !!qg.get('question')?.valid;
          const responseTypeValid = !!qg.get('response_type')?.valid;
          const optionsArray = qg.get('options') as FormArray;
          const optionsValid = optionsArray.length >= 2 && optionsArray.controls.every((c) => c.value && c.value.trim().length > 0);
          return questionValid && responseTypeValid && optionsValid;
        });
      }
      case 3:
        return true; // Review step is always valid if we got here
      default:
        return false;
    }
  }

  private markFormControlsAsTouched(): void {
    Object.keys(this.form().controls).forEach((key) => {
      const control = this.form().get(key);
      control?.markAsTouched();
      control?.markAsDirty();
    });
  }

  private getMockVote(voteId: string): Vote {
    return {
      uid: voteId,
      poll_id: voteId,
      name: 'Mock Vote',
      description: 'This is a mock vote for testing',
      committee_filers: ['voting_rep'],
      committee_id: 'comm-001',
      committee_uid: 'comm-001',
      committee_name: 'Technical Steering Committee',
      committee_type: 'technical',
      committee_voting_status: true,
      creation_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_modified_time: new Date().toISOString(),
      num_response_received: 0,
      num_winners: 1,
      poll_questions: [],
      poll_type: PollType.GENERIC,
      project_uid: 'proj-001',
      project_id: 'proj-001',
      project_name: 'LFX Platform',
      pseudo_anonymity: false,
      status: PollStatus.DISABLED,
      total_voting_request_invitations: 0,
    };
  }
}
