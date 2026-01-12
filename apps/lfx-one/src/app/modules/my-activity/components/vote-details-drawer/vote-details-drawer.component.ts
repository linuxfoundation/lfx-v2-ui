// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, effect, input, model, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { MessageComponent } from '@components/message/message.component';
import { SelectableCardComponent } from '@components/selectable-card/selectable-card.component';
import { TagComponent } from '@components/tag/tag.component';
import { PollStatus, VoteResponseStatus } from '@lfx-one/shared';
import { PollAnswer, UserChoice, VoteDetails } from '@lfx-one/shared/interfaces';
import { CombinedVoteStatusLabelPipe } from '@pipes/combined-vote-status-label.pipe';
import { CombinedVoteStatusSeverityPipe } from '@pipes/combined-vote-status-severity.pipe';
import { DrawerModule } from 'primeng/drawer';

@Component({
  selector: 'lfx-vote-details-drawer',
  imports: [
    DrawerModule,
    TagComponent,
    ButtonComponent,
    MessageComponent,
    SelectableCardComponent,
    DatePipe,
    CombinedVoteStatusLabelPipe,
    CombinedVoteStatusSeverityPipe,
    ReactiveFormsModule,
  ],
  templateUrl: './vote-details-drawer.component.html',
  styleUrl: './vote-details-drawer.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class VoteDetailsDrawerComponent {
  // Inputs
  public readonly vote = input<VoteDetails | null>(null);

  // Two-way binding for visibility
  public readonly visible = model<boolean>(false);

  // Outputs
  public readonly voteSubmitted = output<{ pollId: string; answers: PollAnswer[] }>();

  // Form for vote responses - dynamically built based on questions
  public voteForm = new FormGroup<Record<string, FormControl<string | null>>>({});

  // Checkbox forms - one FormGroup per multi-choice question
  public checkboxForms: Record<string, FormGroup<Record<string, FormControl<boolean>>>> = {};

  // Modal states
  protected showConfirmModal = false;
  protected showSuccessModal = false;

  // Computed: Check if drawer is read-only (submitted or closed)
  protected readonly isReadOnly = computed(() => {
    const v = this.vote();
    if (!v) return true;
    return v.poll_status !== PollStatus.ACTIVE || v.vote_status !== VoteResponseStatus.AWAITING_RESPONSE;
  });

  // Computed: Check if all questions are answered
  protected readonly allQuestionsAnswered = computed(() => {
    const v = this.vote();
    if (!v?.poll_questions) return false;

    return v.poll_questions.every((q) => {
      if (q.type === 'single_choice') {
        const control = this.voteForm.get(q.question_id);
        return control?.value !== null && control?.value !== '';
      }
      const group = this.checkboxForms[q.question_id];
      if (!group) return false;
      return Object.values(group.controls).some((ctrl) => ctrl.value === true);
    });
  });

  // Computed: Get selection type text
  protected readonly selectionTypeText = computed(() => {
    const v = this.vote();
    if (!v?.poll_questions?.length) return '';
    const firstQuestion = v.poll_questions[0];
    return firstQuestion.type === 'multiple_choice' ? 'Multiple selection' : 'Single selection';
  });

  // Computed: Check if user has voted
  protected readonly hasUserVoted = computed(() => {
    const v = this.vote();
    return v?.vote_status === VoteResponseStatus.RESPONDED;
  });

  // Computed: Show warning message for open votes
  // Note: We track visible() to force re-evaluation when drawer opens with new vote
  protected readonly showWarningMessage = computed(() => {
    const isVisible = this.visible();
    const v = this.vote();
    if (!isVisible || !v) return false;
    const isActive = v.poll_status === PollStatus.ACTIVE;
    const isAwaitingResponse = v.vote_status === VoteResponseStatus.AWAITING_RESPONSE;
    return isActive && isAwaitingResponse;
  });

  // Computed: Show submitted message for votes that have been submitted but poll not closed
  // Note: We track visible() to force re-evaluation when drawer opens with new vote
  protected readonly showSubmittedMessage = computed(() => {
    const isVisible = this.visible();
    const v = this.vote();
    if (!isVisible || !v) return false;
    const hasVoted = v.vote_status === VoteResponseStatus.RESPONDED;
    const isNotEnded = v.poll_status !== PollStatus.ENDED;
    const hasCreationTime = !!v.vote_creation_time;
    return hasVoted && isNotEnded && hasCreationTime;
  });

  // Computed: Get relative due date info
  protected readonly relativeDateInfo = computed(() => {
    const v = this.vote();
    if (!v) return { text: '', color: '' };

    const endDate = new Date(v.end_time);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Closed', color: 'text-slate-500' };
    } else if (diffDays <= 3) {
      return { text: `${diffDays} day${diffDays !== 1 ? 's' : ''} left`, color: 'text-red-600' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} days left`, color: 'text-amber-600' };
    }
    return { text: `${diffDays} days left`, color: 'text-slate-600' };
  });

  // Computed: Get user's vote choice text (e.g., "APPROVE")
  protected readonly userVoteChoiceText = computed(() => {
    const v = this.vote();
    if (!v?.poll_answers?.length || !v.poll_questions?.length) return null;

    const firstAnswer = v.poll_answers[0];
    if (!firstAnswer?.user_choice?.length) return null;

    return firstAnswer.user_choice.map((c) => c.choice_text.toUpperCase()).join(', ');
  });

  public constructor() {
    // Build form when vote changes
    effect(() => {
      const v = this.vote();
      if (v) {
        this.buildForm(v);
      }
    });
  }

  // Close the drawer and reset modal states
  protected onClose(): void {
    this.showConfirmModal = false;
    this.showSuccessModal = false;
    this.visible.set(false);
  }

  // Show confirmation modal before submitting
  protected onSubmitClick(): void {
    if (!this.allQuestionsAnswered()) return;
    this.showConfirmModal = true;
  }

  // Cancel confirmation
  protected onCancelConfirm(): void {
    this.showConfirmModal = false;
  }

  // Confirm and submit vote
  protected onConfirmSubmit(): void {
    const v = this.vote();
    if (!v) return;

    const answers: PollAnswer[] = v.poll_questions.map((question) => {
      const userChoice: UserChoice[] = [];

      if (question.type === 'single_choice') {
        const selectedChoiceId = this.voteForm.get(question.question_id)?.value as string;
        const selectedChoice = question.choices.find((c) => c.choice_id === selectedChoiceId);
        if (selectedChoice) {
          userChoice.push(selectedChoice);
        }
      } else {
        const group = this.checkboxForms[question.question_id];
        if (group) {
          question.choices.forEach((choice) => {
            if (group.get(choice.choice_id)?.value === true) {
              userChoice.push(choice);
            }
          });
        }
      }

      return {
        prompt: question.prompt,
        question_id: question.question_id,
        type: question.type,
        user_choice: userChoice,
        ranked_user_choice: [],
      };
    });

    this.showConfirmModal = false;
    this.showSuccessModal = true;

    // Emit the submission
    this.voteSubmitted.emit({
      pollId: v.poll_id,
      answers,
    });
  }

  // Close success modal and drawer
  protected onCloseSuccess(): void {
    this.showSuccessModal = false;
    this.onClose();
  }

  private buildForm(vote: VoteDetails): void {
    const radioControls: Record<string, FormControl<string | null>> = {};
    this.checkboxForms = {};

    vote.poll_questions.forEach((question) => {
      if (question.type === 'single_choice') {
        // Single choice: FormControl with choice_id as value
        let initialValue: string | null = null;

        // If user has already voted, populate their response
        if (vote.poll_answers?.length) {
          const answer = vote.poll_answers.find((a) => a.question_id === question.question_id);
          if (answer?.user_choice?.length) {
            initialValue = answer.user_choice[0].choice_id;
          }
        }

        radioControls[question.question_id] = new FormControl<string | null>(initialValue);
      } else {
        // Multiple choice: FormGroup with boolean controls for each choice
        const choiceControls: Record<string, FormControl<boolean>> = {};

        question.choices.forEach((choice) => {
          let isSelected = false;

          // If user has already voted, check if this choice was selected
          if (vote.poll_answers?.length) {
            const answer = vote.poll_answers.find((a) => a.question_id === question.question_id);
            if (answer?.user_choice?.length) {
              isSelected = answer.user_choice.some((c) => c.choice_id === choice.choice_id);
            }
          }

          choiceControls[choice.choice_id] = new FormControl<boolean>(isSelected, { nonNullable: true });
        });

        this.checkboxForms[question.question_id] = new FormGroup(choiceControls);
      }
    });

    this.voteForm = new FormGroup(radioControls);

    // Disable forms if read-only
    if (this.isReadOnly()) {
      this.voteForm.disable();
      Object.values(this.checkboxForms).forEach((form) => form.disable());
    }
  }
}
