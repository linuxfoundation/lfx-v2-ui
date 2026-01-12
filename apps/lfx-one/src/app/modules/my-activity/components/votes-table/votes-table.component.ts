// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe } from '@angular/common';
import { Component, computed, input, signal, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TableComponent } from '@components/table/table.component';
import { TagComponent } from '@components/tag/tag.component';
import {
  COMBINED_VOTE_STATUS_LABELS,
  MOCK_POLL_DESCRIPTIONS,
  MOCK_POLL_QUESTIONS,
  MY_ACTIVITY_FILTER_LABELS,
  PollStatus,
  VoteResponseStatus,
} from '@lfx-one/shared';
import { PollAnswer, UserVote, VoteDetails } from '@lfx-one/shared/interfaces';
import { CombinedVoteStatus, getCombinedVoteStatus } from '@lfx-one/shared/utils';
import { CanVotePipe } from '@pipes/can-vote.pipe';
import { CombinedVoteStatusLabelPipe } from '@pipes/combined-vote-status-label.pipe';
import { CombinedVoteStatusSeverityPipe } from '@pipes/combined-vote-status-severity.pipe';
import { IsDueWithinMonthPipe } from '@pipes/is-due-within-month.pipe';
import { RelativeDueDatePipe } from '@pipes/relative-due-date.pipe';
import { VoteActionTextPipe } from '@pipes/vote-action-text.pipe';
import { TooltipModule } from 'primeng/tooltip';
import { debounceTime, distinctUntilChanged, startWith } from 'rxjs';

import { VoteDetailsDrawerComponent } from '../vote-details-drawer/vote-details-drawer.component';

@Component({
  selector: 'lfx-votes-table',
  imports: [
    CardComponent,
    TableComponent,
    TagComponent,
    ButtonComponent,
    DatePipe,
    ReactiveFormsModule,
    InputTextComponent,
    SelectComponent,
    CombinedVoteStatusLabelPipe,
    CombinedVoteStatusSeverityPipe,
    CanVotePipe,
    VoteActionTextPipe,
    RelativeDueDatePipe,
    IsDueWithinMonthPipe,
    TooltipModule,
    VoteDetailsDrawerComponent,
  ],
  templateUrl: './votes-table.component.html',
})
export class VotesTableComponent {
  public votes = input.required<UserVote[]>();

  // Internal votes signal for managing state (allows updates after submission)
  protected readonly internalVotes = signal<UserVote[]>([]);

  // Drawer state
  protected readonly drawerVisible = signal<boolean>(false);
  protected readonly selectedVote = signal<VoteDetails | null>(null);

  public searchForm: FormGroup;
  private readonly searchTerm: Signal<string>;
  private readonly statusFilter = signal<CombinedVoteStatus | null>(null);
  private readonly committeeFilter = signal<string | null>(null);

  protected readonly statusOptions: Signal<{ label: string; value: CombinedVoteStatus | null }[]>;
  protected readonly committeeOptions: Signal<{ label: string; value: string | null }[]>;
  protected readonly filteredVotes: Signal<UserVote[]>;

  public constructor() {
    this.searchForm = new FormGroup({
      search: new FormControl<string>(''),
      status: new FormControl<CombinedVoteStatus | null>(null),
      committee: new FormControl<string | null>(null),
    });

    this.searchTerm = toSignal(this.searchForm.get('search')!.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()), {
      initialValue: '',
    });

    this.statusOptions = computed(() => this.initializeStatusOptions());
    this.committeeOptions = computed(() => this.initializeCommitteeOptions());
    this.filteredVotes = computed(() => this.filterVotes());
  }

  protected onStatusChange(value: CombinedVoteStatus | null): void {
    this.statusFilter.set(value);
  }

  protected onCommitteeChange(value: string | null): void {
    this.committeeFilter.set(value);
  }

  protected onVoteClick(vote: UserVote): void {
    const details = this.getMockVoteDetails(vote);
    this.selectedVote.set(details);
    this.drawerVisible.set(true);
  }

  protected onDrawerClose(): void {
    this.drawerVisible.set(false);
  }

  protected onVoteSubmitted(result: { pollId: string; answers: PollAnswer[] }): void {
    // Update the vote in the list to show as submitted
    const currentVotes = this.getVotesSource();
    const updatedVotes = currentVotes.map((v) => {
      if (v.poll_id === result.pollId) {
        return {
          ...v,
          vote_status: VoteResponseStatus.RESPONDED,
          vote_creation_time: new Date().toISOString(),
        };
      }
      return v;
    });
    this.internalVotes.set(updatedVotes);
    this.drawerVisible.set(false);
  }

  private getVotesSource(): UserVote[] {
    // Use internal votes if we have them (after a submission), otherwise use input
    const internal = this.internalVotes();
    return internal.length > 0 ? internal : this.votes();
  }

  private getMockVoteDetails(vote: UserVote): VoteDetails {
    const details: VoteDetails = {
      ...vote,
      description: MOCK_POLL_DESCRIPTIONS.get(vote.poll_id) || 'No description available.',
      creator: 'Committee Chair',
      discussion_link: 'https://discuss.lfx.dev/topic/' + vote.poll_id,
      poll_questions: MOCK_POLL_QUESTIONS.get(vote.poll_id) || [],
      total_voting_request_invitations: 25,
      num_response_received: vote.poll_status === PollStatus.ENDED ? 20 : 12,
    };

    // Add user's answers if they have voted
    if (vote.vote_status === VoteResponseStatus.RESPONDED && details.poll_questions.length > 0) {
      details.poll_answers = details.poll_questions.map((q) => ({
        prompt: q.prompt,
        question_id: q.question_id,
        type: q.type,
        user_choice: [q.choices[0]], // Mock: user selected first option
        ranked_user_choice: [],
      }));
    }

    // Add vote results for closed votes
    if (vote.poll_status === PollStatus.ENDED && details.poll_questions.length > 0) {
      const choices = details.poll_questions[0].choices;
      details.generic_choice_votes = {};
      choices.forEach((choice, index) => {
        // Mock vote distribution
        const voteCount = this.getMockVoteCount(index);
        details.generic_choice_votes![choice.choice_id] = voteCount;
      });
    }

    return details;
  }

  private getMockVoteCount(index: number): number {
    if (index === 0) return 15;
    if (index === 1) return 3;
    return 2;
  }

  private initializeStatusOptions(): { label: string; value: CombinedVoteStatus | null }[] {
    const votesData = this.getVotesSource();
    const statusCounts = new Map<CombinedVoteStatus, number>();

    votesData.forEach((vote) => {
      const combinedStatus = getCombinedVoteStatus(vote);
      statusCounts.set(combinedStatus, (statusCounts.get(combinedStatus) || 0) + 1);
    });

    const options: { label: string; value: CombinedVoteStatus | null }[] = [{ label: MY_ACTIVITY_FILTER_LABELS.allStatus, value: null }];

    const statusOrder: CombinedVoteStatus[] = ['open', 'submitted', 'closed'];
    statusOrder.forEach((status) => {
      const count = statusCounts.get(status) || 0;
      if (count > 0) {
        options.push({
          label: `${COMBINED_VOTE_STATUS_LABELS[status]} (${count})`,
          value: status,
        });
      }
    });

    return options;
  }

  private initializeCommitteeOptions(): { label: string; value: string | null }[] {
    const votesData = this.getVotesSource();
    const committeeCounts = new Map<string, number>();

    votesData.forEach((vote) => {
      vote.committees.forEach((committee) => {
        const name = committee.name || committee.uid;
        committeeCounts.set(name, (committeeCounts.get(name) || 0) + 1);
      });
    });

    const uniqueCommittees = Array.from(committeeCounts.keys()).sort((a, b) => a.localeCompare(b));

    const options: { label: string; value: string | null }[] = [{ label: MY_ACTIVITY_FILTER_LABELS.allCommittees, value: null }];

    uniqueCommittees.forEach((committee) => {
      const count = committeeCounts.get(committee) || 0;
      options.push({
        label: `${committee} (${count})`,
        value: committee,
      });
    });

    return options;
  }

  private filterVotes(): UserVote[] {
    let filtered = this.getVotesSource();

    const searchTerm = this.searchTerm()?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(
        (vote) => vote.poll_name.toLowerCase().includes(searchTerm) || vote.committees.some((c) => (c.name || c.uid).toLowerCase().includes(searchTerm))
      );
    }

    const status = this.statusFilter();
    if (status) {
      filtered = filtered.filter((vote) => getCombinedVoteStatus(vote) === status);
    }

    const committee = this.committeeFilter();
    if (committee) {
      filtered = filtered.filter((vote) => vote.committees.some((c) => (c.name || c.uid) === committee));
    }

    return this.sortVotes(filtered);
  }

  private sortVotes(votes: UserVote[]): UserVote[] {
    const statusPriority: Record<CombinedVoteStatus, number> = { open: 1, submitted: 2, closed: 3 };

    return [...votes].sort((a, b) => {
      const statusA = getCombinedVoteStatus(a);
      const statusB = getCombinedVoteStatus(b);

      if (statusA !== statusB) {
        return statusPriority[statusA] - statusPriority[statusB];
      }

      const dateA = new Date(a.end_time).getTime();
      const dateB = new Date(b.end_time).getTime();
      return dateA - dateB;
    });
  }
}
