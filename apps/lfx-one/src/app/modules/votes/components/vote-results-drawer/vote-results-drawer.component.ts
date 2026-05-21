// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, formatDate } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, model, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@components/button/button.component';
import { TagComponent } from '@components/tag/tag.component';
import { VoteBallotComponent } from '@components/vote-ballot/vote-ballot.component';
import { environment } from '@environments/environment';
import { PollStatus, PollType, VoteResponseStatus } from '@lfx-one/shared';
import {
  MyVoteResponse,
  PollCommentResult,
  RankedQuestionView,
  Vote,
  VoteBallotPayload,
  VoteParticipationStats,
  VoteResultsOption,
  VoteResultsQuestion,
  VoteResultsResponse,
} from '@lfx-one/shared/interfaces';
import { PollStatusLabelPipe } from '@pipes/poll-status-label.pipe';
import { PollStatusSeverityPipe } from '@pipes/poll-status-severity.pipe';
import { VoteService } from '@services/vote.service';
import { MessageService } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { catchError, combineLatest, distinctUntilChanged, finalize, map, of, shareReplay, startWith, Subject, switchMap, tap } from 'rxjs';

@Component({
  selector: 'lfx-vote-results-drawer',
  imports: [
    DrawerModule,
    TagComponent,
    ButtonComponent,
    DatePipe,
    PollStatusLabelPipe,
    PollStatusSeverityPipe,
    SkeletonModule,
    VoteBallotComponent,
    TooltipModule,
  ],
  templateUrl: './vote-results-drawer.component.html',
  styleUrl: './vote-results-drawer.component.scss',
})
export class VoteResultsDrawerComponent {
  // === Services ===
  private readonly voteService = inject(VoteService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  // === Inputs ===
  public readonly voteId = input<string | null>(null);
  public readonly listVote = input<Vote | null>(null);
  /** Pre-created vote_response UID. When non-null and the vote is still active, the inline ballot is shown in creator scope. */
  public readonly userResponseUid = input<string | null>(null);
  /** Selects the voter-blind panel (B/C/D states, no live tallies, no creator note) when 'voter'; defaults to the unchanged creator UI. The /me/votes dashboard passes 'voter'. */
  public readonly audience = input<'voter' | 'creator'>('creator');

  // === Model Signals (two-way binding) ===
  public readonly visible = model<boolean>(false);

  // === Writable Signals ===
  protected readonly loadingVoteDetails = signal<boolean>(false);
  protected readonly loadingVoteResults = signal<boolean>(false);
  protected readonly submittingBallot = signal(false);
  private readonly hasSubmittedBallot = signal(false);
  protected readonly voteLoadError = signal(false);
  /** True when the most recent getVoteResults call failed — voter State C uses this to distinguish "0 responses recorded" from "couldn't load results". */
  protected readonly voteResultsError = signal<boolean>(false);
  /** Distinguishes "my-response request in flight" from "my-response loaded with no row"; without this, a non-participant deep-linking a closed vote would briefly route to State C instead of access-denied. */
  protected readonly myResponseLoading = signal<boolean>(false);

  // === Shared Observables ===
  private readonly voteId$ = toObservable(this.voteId).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  // Imperative trigger: emitting refreshes vote results after a ballot is submitted.
  private readonly resultsRefresh$ = new Subject<void>();

  // === Derived Signals (from API) ===
  protected readonly vote: Signal<Vote | null> = this.initVote();
  protected readonly voteResults: Signal<VoteResultsResponse | null> = this.initVoteResults();
  /** Voter-scope vote_response row; null+loaded means non-participant (access-denied), null+loading means request in flight. */
  protected readonly myResponse: Signal<MyVoteResponse | null> = this.initMyResponse();

  // === Computed Signals ===
  protected readonly isGenericPoll: Signal<boolean> = this.initIsGenericPoll();
  protected readonly pccVotingUrl: Signal<string> = this.initPccVotingUrl();
  /** Voter scope also waits on my-response so State C never renders to a non-participant during a race between voteResults and my-response. */
  protected readonly isLoading: Signal<boolean> = computed(
    () => this.loadingVoteDetails() || this.loadingVoteResults() || (this.audience() === 'voter' && this.myResponseLoading())
  );
  protected readonly participationStats: Signal<VoteParticipationStats> = this.initParticipationStats();
  protected readonly isVoteClosed: Signal<boolean> = this.initIsVoteClosed();
  protected readonly questionsWithResults: Signal<VoteResultsQuestion[]> = this.initQuestionsWithResults();
  protected readonly rankedQuestions: Signal<RankedQuestionView[]> = this.initRankedQuestions();
  protected readonly commentResults: Signal<PollCommentResult[]> = this.initCommentResults();
  protected readonly votingMethodText: Signal<string> = this.initVotingMethodText();
  protected readonly rankedMethodDescription: Signal<string> = this.initRankedMethodDescription();
  /** True when creator scope can show the inline ballot for an active vote with a pending response uid. */
  protected readonly canCastVote: Signal<boolean> = computed(
    () => this.audience() === 'creator' && !this.isVoteClosed() && !!this.userResponseUid() && !this.hasSubmittedBallot()
  );

  // === Voter-state helpers ===
  protected readonly voterState: Signal<'not_voted' | 'submitted' | 'closed' | 'access_denied'> = this.initVoterState();
  protected readonly hasZeroVotes: Signal<boolean> = this.initHasZeroVotes();
  /** Header close-date treatment — countdown chip at ≤ 7 days, absolute date otherwise. */
  protected readonly closeDateDisplay: Signal<{ chip: string; absolute: string; isCountdown: boolean }> = this.initCloseDateDisplay();
  /** One-line plain-English explainer for each vote type, shown on hover of the voter header pill. */
  protected readonly voteTypeTooltip: Signal<string> = this.initVoteTypeTooltip();

  // === Protected Methods ===
  protected onClose(): void {
    this.visible.set(false);
  }

  protected handleBallotSubmitted(payload: VoteBallotPayload): void {
    const voteUid = this.voteId();
    const voteResponseUid = this.userResponseUid();
    if (!voteUid || !voteResponseUid) return;

    this.submittingBallot.set(true);
    this.voteService
      .submitVoteResponse({ vote_uid: voteUid, vote_response_uid: voteResponseUid, abstain: payload.abstain, user_vote_content: payload.user_vote_content })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submittingBallot.set(false);
          this.hasSubmittedBallot.set(true);
          this.messageService.add({ severity: 'success', summary: 'Vote submitted', detail: 'Your ballot has been recorded.', life: 3000 });
          this.resultsRefresh$.next();
        },
        error: () => {
          this.submittingBallot.set(false);
          const pccUrl = this.pccVotingUrl();
          this.messageService.add({
            severity: 'error',
            summary: 'Vote submission failed',
            detail: pccUrl ? `Could not submit your vote. Open in PCC: ${pccUrl}` : 'Could not submit your vote. Please try again.',
            life: 6000,
          });
        },
      });
  }

  // === Private Initializers ===
  private initVote(): Signal<Vote | null> {
    return toSignal(
      this.voteId$.pipe(
        // Reset per-vote UI state whenever a new vote opens in the drawer.
        tap(() => {
          this.hasSubmittedBallot.set(false);
          this.voteLoadError.set(false);
        }),
        switchMap((id) => {
          if (!id) {
            this.loadingVoteDetails.set(false);
            return of(null);
          }

          this.loadingVoteDetails.set(true);
          const listVote = this.listVote();

          return this.voteService.getVote(id).pipe(
            catchError(() => {
              if (!listVote) this.voteLoadError.set(true);
              return of(listVote);
            }),
            finalize(() => this.loadingVoteDetails.set(false)),
            startWith(listVote)
          );
        })
      ),
      { initialValue: null }
    );
  }

  /** Voter scope skips the results call until vote.status === ENDED so aggregate tallies never land in the browser before close — blind-results policy at the data layer, not just the template. distinctUntilChanged on the fetch key suppresses the duplicate trigger caused by initVote's startWith(listVote) → live emit. resultsRefresh$ re-fetches after creator-scope ballot submission. */
  private initVoteResults(): Signal<VoteResultsResponse | null> {
    return toSignal(
      combineLatest([this.voteId$, toObservable(this.audience), toObservable(this.vote), this.resultsRefresh$.pipe(startWith(null))]).pipe(
        map(([id, audience, vote]) => {
          const canFetch = !!id && (audience === 'creator' || vote?.status === PollStatus.ENDED);
          return canFetch ? (id as string) : null;
        }),
        distinctUntilChanged(),
        switchMap((id) => {
          if (!id) {
            this.loadingVoteResults.set(false);
            this.voteResultsError.set(false);
            return of(null);
          }
          this.loadingVoteResults.set(true);
          this.voteResultsError.set(false);
          return this.voteService.getVoteResults(id).pipe(
            catchError(() => {
              this.voteResultsError.set(true);
              return of(null);
            }),
            finalize(() => this.loadingVoteResults.set(false))
          );
        })
      ),
      { initialValue: null }
    );
  }

  private initIsGenericPoll(): Signal<boolean> {
    return computed(() => {
      const v = this.vote();
      if (!v) return false;
      // Missing poll_type defaults to GENERIC (matches initVotingMethodText) so the plurality branch renders.
      return (v.poll_type ?? PollType.GENERIC) === PollType.GENERIC;
    });
  }

  private initPccVotingUrl(): Signal<string> {
    return computed(() => {
      const v = this.vote();
      if (!v) return '';

      const pccBaseUrl = environment.urls.pcc;
      const baseUrl = pccBaseUrl.endsWith('/') ? pccBaseUrl.slice(0, -1) : pccBaseUrl;
      return `${baseUrl}/project/${v.project_uid}/collaboration/voting`;
    });
  }

  private initIsVoteClosed(): Signal<boolean> {
    return computed(() => {
      const v = this.vote();
      if (v?.status === PollStatus.ENDED) return true;

      // Treat full participation as finalized even if the vote hasn't formally ended.
      // Use raw counts to avoid rounding errors (e.g. 200/201 rounds to 100%).
      const stats = this.participationStats();
      return stats.eligibleVoters > 0 && stats.totalResponses >= stats.eligibleVoters;
    });
  }

  private initParticipationStats(): Signal<VoteParticipationStats> {
    return computed(() => {
      const results = this.voteResults();
      if (!results) {
        return { eligibleVoters: 0, totalResponses: 0, participationRate: 0 };
      }

      const eligibleVoters = results.num_recipients || 0;
      const totalResponses = results.num_votes_cast || 0;
      const participationRate = eligibleVoters > 0 ? Math.round((totalResponses / eligibleVoters) * 100) : 0;

      return { eligibleVoters, totalResponses, participationRate };
    });
  }

  private initQuestionsWithResults(): Signal<VoteResultsQuestion[]> {
    return computed(() => {
      const results = this.voteResults();
      const isClosed = this.isVoteClosed();

      if (!results?.poll_results?.length) {
        return [];
      }

      return results.poll_results.map((pollResult) => {
        const choiceVotes = pollResult.generic_choice_votes || [];

        // Compute total votes first for percentage calculation
        const totalVotes = choiceVotes.reduce((sum, cv) => sum + cv.vote_count, 0);

        // Build options with vote counts from the results API
        const optionsWithCounts: VoteResultsOption[] = choiceVotes.map((cv) => ({
          choiceId: cv.choice_id,
          text: pollResult.question.choices.find((c) => c.choice_id === cv.choice_id)?.choice_text || cv.choice_id,
          voteCount: cv.vote_count,
          percentage: this.computePercentage(cv.percentage, cv.vote_count, totalVotes),
          isWinner: false,
          isTied: false,
          isLeading: false,
        }));

        // Determine winner/ties based on max votes
        const maxVotes = Math.max(...optionsWithCounts.map((o) => o.voteCount), 0);
        const optionsWithMaxVotes = optionsWithCounts.filter((o) => o.voteCount === maxVotes);
        const isTied = optionsWithMaxVotes.length > 1 && maxVotes > 0;

        const processedOptions = optionsWithCounts.map((option) => ({
          ...option,
          isWinner: isClosed && !isTied && option.voteCount === maxVotes && maxVotes > 0,
          isTied: isClosed && isTied && option.voteCount === maxVotes,
          isLeading: option.voteCount === maxVotes && maxVotes > 0,
        }));

        return {
          questionId: pollResult.question.question_id,
          question: pollResult.question.prompt,
          options: processedOptions,
          totalVotes,
        };
      });
    });
  }

  /** Derives the ranked-choice per-question view model — round-summary payload is untyped upstream so detailed visualization is deferred to a placeholder banner. */
  private initRankedQuestions(): Signal<RankedQuestionView[]> {
    return computed(() => {
      const results = this.voteResults();
      if (!results?.poll_results?.length) return [];

      return results.poll_results.map((pr) => {
        // Choice text: prefer winner_info.poll_choices, fall back to question.choices.
        const choiceTextById = new Map((pr.ranked_choice_winner_info?.poll_choices ?? pr.question.choices ?? []).map((c) => [c.choice_id, c.choice_text]));

        const choiceDistributions = (pr.ranked_choice_votes ?? []).map((rcv) => {
          const totalRanked = rcv.rank_counts.reduce((sum, rc) => sum + rc.count, 0);
          const rankCounts = rcv.rank_counts.map((rc) => ({
            rank: rc.rank,
            count: rc.count,
            percentage: totalRanked > 0 ? Math.round((rc.count / totalRanked) * 100) : 0,
          }));
          return {
            choiceId: rcv.choice_id,
            choiceText: choiceTextById.get(rcv.choice_id) ?? rcv.choice_id,
            totalRanked,
            rankCounts,
          };
        });

        return {
          questionId: pr.question.question_id,
          prompt: pr.question.prompt,
          choiceDistributions,
          hasRoundSummary: !!pr.irv_round_summary || !!pr.meek_stv_round_summary,
        };
      });
    });
  }

  private initCommentResults(): Signal<PollCommentResult[]> {
    return computed(() => {
      const results = this.voteResults();
      if (!results?.comment_results?.length) {
        return [];
      }

      return results.comment_results.filter((cr) => cr.comments.length > 0);
    });
  }

  private computePercentage(apiPercentage: number, voteCount: number, totalVotes: number): number {
    if (apiPercentage > 0) return apiPercentage;
    if (totalVotes <= 0) return 0;
    return Math.round((voteCount / totalVotes) * 100);
  }

  private initVotingMethodText(): Signal<string> {
    return computed(() => {
      const v = this.vote();
      if (!v) return '';

      const methodLabels: Record<PollType, string> = {
        [PollType.GENERIC]: 'Plurality Vote',
        [PollType.CONDORCET_IRV]: 'Ranked Choice (Condorcet IRV)',
        [PollType.INSTANT_RUNOFF_VOTE]: 'Instant Runoff Vote',
        [PollType.MEEK_STV]: 'Meek STV',
      };

      const pollType = v.poll_type ?? PollType.GENERIC;
      return methodLabels[pollType] || pollType;
    });
  }

  private initRankedMethodDescription(): Signal<string> {
    return computed(() => {
      const pollType = this.vote()?.poll_type;
      switch (pollType) {
        case PollType.CONDORCET_IRV:
          return 'Voters ranked the choices in order of preference. Condorcet IRV first looks for a candidate who would beat every other candidate in head-to-head pairwise comparisons; if no such Condorcet winner exists, it falls back to instant-runoff elimination.';
        case PollType.INSTANT_RUNOFF_VOTE:
          return 'Voters ranked the choices in order of preference. Instant-runoff voting tallies first-preference votes and eliminates the lowest-ranked choice each round, reallocating those ballots until a candidate has a majority.';
        case PollType.MEEK_STV:
          return 'Voters ranked the choices in order of preference. Meek STV is a multi-winner single-transferable-vote method that elects candidates as they meet a quota and proportionally redistributes surplus and eliminated ballots.';
        default:
          return 'Voters ranked the choices in order of preference. The configured ranked-choice algorithm determines the winner (or winners).';
      }
    });
  }

  /** Fetches the current user's vote_response row in voter scope; tracks loading separately so initVoterState can distinguish "loaded null" (access-denied) from "still pending". */
  private initMyResponse(): Signal<MyVoteResponse | null> {
    return toSignal(
      combineLatest([this.voteId$, toObservable(this.audience)]).pipe(
        switchMap(([id, audience]) => {
          if (!id || audience !== 'voter') {
            this.myResponseLoading.set(false);
            return of(null);
          }
          this.myResponseLoading.set(true);
          return this.voteService.getMyVoteResponse(id).pipe(
            catchError(() => of(null)),
            finalize(() => this.myResponseLoading.set(false))
          );
        })
      ),
      { initialValue: null }
    );
  }

  /** Derives the four-state panel value; for voter scope, a loaded-null my-response means non-participant and routes to access_denied (otherwise a deep-link to a closed vote would leak results). */
  private initVoterState(): Signal<'not_voted' | 'submitted' | 'closed' | 'access_denied'> {
    return computed(() => {
      const v = this.vote();
      if (!v) return 'not_voted';
      const my = this.myResponse();
      const isVoter = this.audience() === 'voter';
      // Access-denied: voter_removed wins; voter with loaded-null row is a non-participant deep-link.
      if (my?.voter_removed) return 'access_denied';
      if (isVoter && !this.myResponseLoading() && !my) return 'access_denied';
      const closed = v.status === PollStatus.ENDED;
      const decoratedResponseStatus = this.listVote()?.response_status ?? v.response_status;
      const submitted = my?.vote_status === 'responded' || decoratedResponseStatus === VoteResponseStatus.RESPONDED;
      if (closed) return 'closed';
      if (submitted) return 'submitted';
      return 'not_voted';
    });
  }

  private initHasZeroVotes(): Signal<boolean> {
    return computed(() => {
      const qs = this.questionsWithResults();
      if (!qs.length) return true;
      return qs.every((q) => q.totalVotes === 0);
    });
  }

  private initCloseDateDisplay(): Signal<{ chip: string; absolute: string; isCountdown: boolean }> {
    return computed(() => {
      const v = this.vote();
      if (!v?.end_time) return { chip: '', absolute: '', isCountdown: false };
      const end = new Date(v.end_time);
      const absolute = formatDate(end, 'MMM d, y', 'en-US');
      const msLeft = end.getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
      if (daysLeft >= 0 && daysLeft <= 7) {
        let chip: string;
        if (daysLeft === 0) chip = 'Closes today';
        else if (daysLeft === 1) chip = 'Closes tomorrow';
        else chip = `Closes in ${daysLeft} days`;
        return { chip, absolute, isCountdown: true };
      }
      return { chip: `Closes ${absolute}`, absolute, isCountdown: false };
    });
  }

  private initVoteTypeTooltip(): Signal<string> {
    return computed(() => {
      const pollType = this.vote()?.poll_type ?? PollType.GENERIC;
      switch (pollType) {
        case PollType.GENERIC:
          return 'Each voter picks one option; the option with the most votes wins.';
        case PollType.CONDORCET_IRV:
          return 'Voters rank options; a candidate that beats all others head-to-head wins, else IRV elimination decides.';
        case PollType.INSTANT_RUNOFF_VOTE:
          return 'Voters rank options; the lowest-ranked is eliminated each round until a candidate has a majority.';
        case PollType.MEEK_STV:
          return 'Voters rank options; multi-winner proportional method that transfers surplus and eliminated ballots.';
      }
    });
  }
}
