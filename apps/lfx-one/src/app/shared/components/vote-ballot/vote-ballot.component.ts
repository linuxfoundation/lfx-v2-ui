// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, input, OnInit, output, signal, Signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { PollQuestion, Vote, VoteAnswerInput } from '@lfx-one/shared/interfaces';
import { RadioButtonComponent } from '@components/radio-button/radio-button.component';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'lfx-vote-ballot',
  imports: [ReactiveFormsModule, RadioButtonComponent, CheckboxModule],
  templateUrl: './vote-ballot.component.html',
  styleUrl: './vote-ballot.component.scss',
})
export class VoteBallotComponent implements OnInit {
  // Inputs
  public readonly vote = input.required<Vote>();
  public readonly voteResponseUid = input.required<string>();
  public readonly compact = input(false);
  public readonly submitting = input(false);

  // Outputs
  public readonly voteSubmitted = output<{ abstain: boolean; user_vote_content?: VoteAnswerInput[] }>();
  public readonly voteCancelled = output<void>();

  // Form — controls added/removed dynamically when vote() changes
  public readonly form = new FormGroup<Record<string, AbstractControl>>({});

  // Simple signals
  protected abstain = signal(false);

  // Complex signals
  protected readonly visibleQuestions: Signal<PollQuestion[]> = this.initVisibleQuestions();
  protected readonly isSubmitDisabled: Signal<boolean> = this.initIsSubmitDisabled();

  public ngOnInit(): void {
    // vote() is stable for the component's lifetime — set once when the row expands or drawer opens
    const questions = this.vote().poll_questions ?? [];
    for (const question of questions) {
      if (question.type === 'multiple_choice') {
        this.form.addControl(question.question_id, new FormControl<string[]>([], (ctrl) => ((ctrl.value as string[]).length > 0 ? null : { required: true })));
      } else {
        this.form.addControl(question.question_id, new FormControl<string | null>(null, Validators.required));
      }
    }
  }

  protected onSubmit(): void {
    if (this.isSubmitDisabled()) return;

    if (this.abstain()) {
      this.voteSubmitted.emit({ abstain: true });
      return;
    }

    const formValue = this.form.value as Record<string, string | string[]>;
    const userVoteContent: VoteAnswerInput[] = Object.entries(formValue).map(([questionId, value]) => ({
      question_id: questionId,
      choice_ids: Array.isArray(value) ? value : [value],
    }));

    this.voteSubmitted.emit({ abstain: false, user_vote_content: userVoteContent });
  }

  protected onCancel(): void {
    this.voteCancelled.emit();
  }

  protected onAbstainToggle(): void {
    const next = !this.abstain();
    this.abstain.set(next);
    if (next) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  private initVisibleQuestions(): Signal<PollQuestion[]> {
    return computed(() => {
      const questions = this.vote().poll_questions ?? [];
      return this.compact() ? questions.slice(0, 1) : questions;
    });
  }

  private initIsSubmitDisabled(): Signal<boolean> {
    // initialValue 'INVALID' keeps Submit disabled before ngOnInit adds controls (form starts empty = VALID)
    const formStatus = toSignal(this.form.statusChanges, { initialValue: 'INVALID' });
    return computed(() => this.submitting() || (!this.abstain() && formStatus() !== 'VALID'));
  }
}
