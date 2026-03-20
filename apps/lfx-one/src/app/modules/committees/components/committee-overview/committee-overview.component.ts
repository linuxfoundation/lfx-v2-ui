// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, input, output, signal, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { TagComponent } from '@components/tag/tag.component';
import { Committee, CommitteeMember, Meeting, Survey, Vote } from '@lfx-one/shared/interfaces';
import { CommitteeMemberRole, PollStatus } from '@lfx-one/shared/enums';
import { CommitteeService } from '@services/committee.service';
import { MeetingService } from '@services/meeting.service';
import { VoteService } from '@services/vote.service';
import { SurveyService } from '@services/survey.service';
import { MessageService } from 'primeng/api';
import { catchError, filter, forkJoin, of, switchMap, take } from 'rxjs';

@Component({
  selector: 'lfx-committee-overview',
  imports: [CardComponent, TagComponent, DatePipe, FormsModule, ButtonComponent],
  templateUrl: './committee-overview.component.html',
  styleUrl: './committee-overview.component.scss',
})
export class CommitteeOverviewComponent {
  // Injections
  private readonly committeeService = inject(CommitteeService);
  private readonly meetingService = inject(MeetingService);
  private readonly voteService = inject(VoteService);
  private readonly surveyService = inject(SurveyService);
  private readonly messageService = inject(MessageService);

  // Inputs
  public committee = input.required<Committee>();
  public members = input<CommitteeMember[]>([]);
  public membersLoading = input<boolean>(true);
  public canEdit = input<boolean>(false);

  // Outputs
  public readonly committeeUpdated = output<void>();

  // Chairs edit state
  public editingChairs = signal(false);
  public editChairUid = signal<string | null>(null);
  public editViceChairUid = signal<string | null>(null);
  public savingChairs = signal(false);

  // Channels edit state
  public editingChannels = signal(false);
  public editMailingList = signal('');
  public editChatChannel = signal('');
  public savingChannels = signal(false);

  // Computed: chairs derived from members
  public chairs: Signal<CommitteeMember[]> = this.initChairs();

  // Computed: distinct organization count from members
  public orgCount: Signal<number> = computed(() => {
    const allMembers = this.members();
    const orgs = new Set(allMembers.map((m) => m.organization?.name).filter(Boolean));
    return orgs.size;
  });

  // Committee-scoped data fetches
  public meetings: Signal<Meeting[]> = this.initMeetings();
  public votes: Signal<Vote[]> = this.initVotes();
  public surveys: Signal<Survey[]> = this.initSurveys();

  // Computed stats from fetched data
  public activeVotesCount: Signal<number> = computed(() => this.votes().filter((v) => v.status === PollStatus.ACTIVE).length);

  public openSurveysCount: Signal<number> = computed(() => this.surveys().filter((s) => s.survey_status === 'active' || s.survey_status === 'open').length);

  public upcomingMeetings: Signal<Meeting[]> = computed(() => {
    const now = new Date().toISOString();
    return this.meetings()
      .filter((m) => m.start_time > now)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
      .slice(0, 2);
  });

  // Chairs edit methods
  public startEditChairs(): void {
    const currentChair = this.chairs().find((c) => c.role?.name === CommitteeMemberRole.CHAIR);
    const currentViceChair = this.chairs().find((c) => c.role?.name === CommitteeMemberRole.VICE_CHAIR);
    this.editChairUid.set(currentChair?.uid || null);
    this.editViceChairUid.set(currentViceChair?.uid || null);
    this.editingChairs.set(true);
  }

  public cancelEditChairs(): void {
    this.editingChairs.set(false);
  }

  public saveChairs(): void {
    this.savingChairs.set(true);
    const committeeId = this.committee().uid;
    const currentChair = this.chairs().find((c) => c.role?.name === CommitteeMemberRole.CHAIR);
    const currentViceChair = this.chairs().find((c) => c.role?.name === CommitteeMemberRole.VICE_CHAIR);
    const newChairUid = this.editChairUid();
    const newViceChairUid = this.editViceChairUid();

    const updates: ReturnType<typeof this.committeeService.updateCommitteeMember>[] = [];

    // Remove old chair role if changed
    if (currentChair && currentChair.uid !== newChairUid) {
      updates.push(this.committeeService.updateCommitteeMember(committeeId, currentChair.uid, { role: null }));
    }
    // Remove old vice chair role if changed
    if (currentViceChair && currentViceChair.uid !== newViceChairUid) {
      updates.push(this.committeeService.updateCommitteeMember(committeeId, currentViceChair.uid, { role: null }));
    }
    // Assign new chair
    if (newChairUid && newChairUid !== currentChair?.uid) {
      updates.push(this.committeeService.updateCommitteeMember(committeeId, newChairUid, { role: { name: CommitteeMemberRole.CHAIR } }));
    }
    // Assign new vice chair
    if (newViceChairUid && newViceChairUid !== currentViceChair?.uid) {
      updates.push(this.committeeService.updateCommitteeMember(committeeId, newViceChairUid, { role: { name: CommitteeMemberRole.VICE_CHAIR } }));
    }

    if (updates.length === 0) {
      this.editingChairs.set(false);
      this.savingChairs.set(false);
      return;
    }

    forkJoin(updates)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Chairs updated' });
          this.editingChairs.set(false);
          this.savingChairs.set(false);
          this.committeeUpdated.emit();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update chairs' });
          this.savingChairs.set(false);
        },
      });
  }

  // Channels edit methods
  public startEditChannels(): void {
    this.editMailingList.set(this.committee().mailing_list || '');
    this.editChatChannel.set(this.committee().chat_channel || '');
    this.editingChannels.set(true);
  }

  public cancelEditChannels(): void {
    this.editingChannels.set(false);
  }

  public saveChannels(): void {
    this.savingChannels.set(true);
    this.committeeService
      .updateCommittee(this.committee().uid, {
        mailing_list: this.editMailingList() || undefined,
        chat_channel: this.editChatChannel() || undefined,
      })
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Channels updated' });
          this.editingChannels.set(false);
          this.savingChannels.set(false);
          this.committeeUpdated.emit();
        },
        error: () => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update channels' });
          this.savingChannels.set(false);
        },
      });
  }

  // Private initializer functions
  private initChairs(): Signal<CommitteeMember[]> {
    return computed(() => {
      const allMembers = this.members();
      return allMembers.filter((m) => m.role?.name === CommitteeMemberRole.CHAIR || m.role?.name === CommitteeMemberRole.VICE_CHAIR);
    });
  }

  private initMeetings(): Signal<Meeting[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => this.meetingService.getMeetingsByCommittee(c.uid).pipe(catchError(() => of([]))))
      ),
      { initialValue: [] }
    );
  }

  private initVotes(): Signal<Vote[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => this.voteService.getVotesByCommittee(c.uid).pipe(catchError(() => of([]))))
      ),
      { initialValue: [] }
    );
  }

  private initSurveys(): Signal<Survey[]> {
    return toSignal(
      toObservable(this.committee).pipe(
        filter((c) => !!c?.uid),
        switchMap((c) => this.surveyService.getSurveysByCommittee(c.uid).pipe(catchError(() => of([]))))
      ),
      { initialValue: [] }
    );
  }
}
