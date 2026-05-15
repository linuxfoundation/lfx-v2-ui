// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, PLATFORM_ID, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { RadioButtonComponent } from '@components/radio-button/radio-button.component';
import { TagComponent } from '@components/tag/tag.component';
import { PollType } from '@lfx-one/shared';
import { CreateVoteResponseRequest, PollQuestion, Vote, VoteAnswerInput } from '@lfx-one/shared/interfaces';
import { PollStatusLabelPipe } from '@pipes/poll-status-label.pipe';
import { PollStatusSeverityPipe } from '@pipes/poll-status-severity.pipe';
import { VoteService } from '@services/vote.service';
import { MessageService } from 'primeng/api';
import { CheckboxModule } from 'primeng/checkbox';
import { DrawerModule } from 'primeng/drawer';
import { SkeletonModule } from 'primeng/skeleton';
import { catchError, finalize, of, shareReplay, startWith, switchMap, take } from 'rxjs';

import { DatePipe } from '@angular/common';

@Component({
  selector: 'lfx-vote-cast-drawer',
  imports: [
    DrawerModule,
    SkeletonModule,
    CheckboxModule,
    FormsModule,
    ReactiveFormsModule,
    ButtonComponent,
    RadioButtonComponent,
    TagComponent,
    PollStatusLabelPipe,
    PollStatusSeverityPipe,
    DatePipe,
  ],
  templateUrl: './vote-cast-drawer.component.html',
  styleUrl: './vote-cast-drawer.component.scss',
})
export class VoteCastDrawerComponent {
  // === Services ===
  private readonly voteService = inject(VoteService);
  private readonly messageService = inject(MessageService);
  private readonly platformId = inject(PLATFORM_ID);

  // === Inputs ===
  public readonly voteId = input<string | null>(null);
  public readonly listVote = input<Vote | null>(null);

  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Outputs ===
  public readonly voteSubmitted = output<string>();

  // === Forms ===
  // Per-question form. Keys are question_id. Each value is:
  //   - string | null for single_choice (selected choice_id)
  //   - string[] | null for multiple_choice (array of selected choice_ids)
  // Submit normalises both shapes into VoteAnswerInput.choice_ids.
  public readonly form = new FormGroup({});

  // === Writable Signals ===
  protected readonly loadingVote = signal<boolean>(false);
  protected readonly submitting = signal<boolean>(false);
  protected readonly abstain = signal<boolean>(false);

  // === Shared Observables ===
  private readonly voteId$ = toObservable(this.voteId).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  // === Derived Signals (from API) ===
  protected readonly vote: Signal<Vote | null> = this.initVote();
  // form.statusChanges is the canonical reactive surface for FormGroup validity.
  // We pipe to startWith(form.status) so the signal has a synchronous initial value
  // (status emissions only fire on changes, not on initial construction).
  private readonly formStatus: Signal<string> = toSignal(this.form.statusChanges.pipe(startWith(this.form.status)), { initialValue: this.form.status });

  // === Computed Signals ===
  protected readonly isGenericPoll: Signal<boolean> = computed(() => this.vote()?.poll_type === PollType.GENERIC);
  protected readonly questions: Signal<PollQuestion[]> = computed(() => this.vote()?.poll_questions ?? []);
  protected readonly allowAbstain: Signal<boolean> = computed(() => !!this.vote()?.allow_abstain);
  protected readonly submitDisabled: Signal<boolean> = computed(() => {
    if (this.submitting()) return true;
    if (this.abstain()) return false;
    return this.formStatus() !== 'VALID';
  });

  public constructor() {
    // Rebuild the form whenever a new vote is loaded so controls match its questions.
    effect(() => {
      const questions = this.questions();
      this.rebuildForm(questions);
    });

    // Reset transient state when the drawer closes so reopening starts fresh.
    effect(() => {
      if (!this.visible()) {
        this.abstain.set(false);
        this.submitting.set(false);
      }
    });

    // Toggling abstain disables answer fields without losing their values.
    effect(() => {
      if (this.abstain()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
      }
    });
  }

  // === Protected Methods ===
  protected onClose(): void {
    this.visible.set(false);
  }

  protected onAbstainChange(checked: boolean): void {
    this.abstain.set(checked);
  }

  protected isSingleChoice(question: PollQuestion): boolean {
    return question.type === 'single_choice';
  }

  protected isMultipleChoice(question: PollQuestion): boolean {
    return question.type === 'multiple_choice';
  }

  protected onSubmit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const vote = this.vote();
    if (!vote || this.submitting()) return;

    const isAbstain = this.abstain();
    const userVoteContent = isAbstain ? undefined : this.buildAnswers(vote.poll_questions ?? []);

    this.submitting.set(true);

    // The voting service pre-allocates one vote_response row per invitee when a vote
    // is enabled; the cast endpoint requires that pre-allocated UID. A fresh client
    // UUID returns 404. Fetch the user's row first, then POST with its uid.
    this.voteService
      .getMyVoteResponse(vote.uid)
      .pipe(take(1))
      .subscribe({
        next: (myResponse) => {
          if (!myResponse?.uid) {
            this.submitting.set(false);
            this.messageService.add({
              severity: 'error',
              summary: 'Unable to find your invitation',
              detail: 'We could not find your vote invitation for this ballot. Please refresh and try again.',
              life: 5000,
            });
            return;
          }

          const payload: CreateVoteResponseRequest = {
            vote_response_uid: myResponse.uid,
            vote_uid: vote.uid,
            abstain: isAbstain,
            user_vote_content: userVoteContent,
          };

          this.voteService
            .createVoteResponse(payload)
            .pipe(finalize(() => this.submitting.set(false)))
            .subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Vote submitted',
                  detail: `Your ${isAbstain ? 'abstention' : 'ballot'} has been recorded.`,
                  life: 3000,
                });
                this.voteSubmitted.emit(vote.uid);
                this.visible.set(false);
              },
              error: () => {
                this.messageService.add({
                  severity: 'error',
                  summary: 'Unable to submit vote',
                  detail: 'Something went wrong submitting your ballot. Please try again.',
                  life: 5000,
                });
              },
            });
        },
        error: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Unable to submit vote',
            detail: 'We could not look up your invitation. Please refresh and try again.',
            life: 5000,
          });
        },
      });
  }

  // === Private Initializers ===
  private initVote(): Signal<Vote | null> {
    return toSignal(
      this.voteId$.pipe(
        switchMap((id) => {
          if (!id) {
            this.loadingVote.set(false);
            return of(null);
          }

          this.loadingVote.set(true);
          const listVote = this.listVote();

          return this.voteService.getVote(id).pipe(
            catchError(() => of(listVote)),
            finalize(() => this.loadingVote.set(false)),
            startWith(listVote)
          );
        })
      ),
      { initialValue: null }
    );
  }

  // === Private Helpers ===
  // Reconciles the form against the current vote's questions: drops controls for
  // removed questions, adds controls for new ones, leaves stable controls alone.
  private rebuildForm(questions: PollQuestion[]): void {
    const desiredIds = new Set(questions.map((q) => q.question_id));
    for (const existingId of Object.keys(this.form.controls)) {
      if (!desiredIds.has(existingId)) {
        this.form.removeControl(existingId, { emitEvent: false });
      }
    }
    for (const question of questions) {
      if (this.form.contains(question.question_id)) continue;
      if (question.type === 'multiple_choice') {
        this.form.addControl(question.question_id, new FormControl<string[] | null>(null, Validators.required), { emitEvent: false });
      } else {
        this.form.addControl(question.question_id, new FormControl<string | null>(null, Validators.required), { emitEvent: false });
      }
    }
  }

  private buildAnswers(questions: PollQuestion[]): VoteAnswerInput[] {
    return questions.map((q) => ({
      question_id: q.question_id,
      choice_ids: this.normaliseChoiceIds(this.form.get(q.question_id)?.value),
    }));
  }

  private normaliseChoiceIds(raw: unknown): string[] {
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'string' && raw.length > 0) return [raw];
    return [];
  }
}
