// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, inject, input, output, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RsvpButtonGroupComponent } from '@app/modules/meetings/components/rsvp-button-group/rsvp-button-group.component';
import { ButtonComponent } from '@components/button/button.component';
import { TagComponent } from '@components/tag/tag.component';
import { VoteBallotComponent } from '@components/vote-ballot/vote-ballot.component';
import { environment } from '@environments/environment';
import { stableKeyParity } from '@lfx-one/shared/utils';
import { MeetingService } from '@services/meeting.service';
import { VoteService } from '@services/vote.service';
import { HiddenActionsService } from '@shared/services/hidden-actions.service';
import { MessageService } from 'primeng/api';
import { timer } from 'rxjs';

import type { DecoratedPendingAction, Meeting, PendingActionItem, Vote, VoteAnswerInput } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-pending-actions',
  imports: [ButtonComponent, TagComponent, RsvpButtonGroupComponent, VoteBallotComponent],
  templateUrl: './pending-actions.component.html',
  styleUrl: './pending-actions.component.scss',
})
export class PendingActionsComponent {
  private readonly hiddenActionsService = inject(HiddenActionsService);
  private readonly meetingService = inject(MeetingService);
  private readonly voteService = inject(VoteService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly pendingActions = input.required<PendingActionItem[]>();
  public readonly displayLimit = input<number>(5);

  public readonly actionClick = output<PendingActionItem>();

  // Cookie-backed dismissals live outside the signal graph; bumping forces the computed to recompute.
  private readonly hiddenActionsVersion = signal(0);
  // Covers both RSVP and Vote inline expansions — only one row can be expanded at a time.
  protected readonly expandedRowKey = signal<string | null>(null);
  protected readonly dismissingRowKeys = signal<ReadonlySet<string>>(new Set());
  private readonly loadingMeetingUid = signal<string | null>(null);
  private readonly rsvpMeetingCache = signal<Record<string, Meeting>>({});
  private readonly loadingVoteUid = signal<string | null>(null);
  private readonly voteCache = signal<Record<string, Vote>>({});
  // Tracks which vote uid is being submitted (HTTP POST in-flight) to pass submitting=true to the ballot.
  protected readonly submittingVoteUid = signal<string | null>(null);
  // Pinned through the 1.5s post-RSVP/vote cue window so a parent re-emit can't filter the row out
  // before the confirmation tint renders.
  private readonly frozenDismissingKeys = signal<ReadonlySet<string>>(new Set());

  private readonly visibleActions: Signal<PendingActionItem[]> = computed(() => {
    this.hiddenActionsVersion();
    const frozen = this.frozenDismissingKeys();
    const unhidden = this.pendingActions().filter((item) => frozen.has(this.getRowKey(item)) || !this.hiddenActionsService.isActionHidden(item));
    const limit = this.displayLimit();
    // `slice(0, -1)` would silently drop the last item, so clamp non-finite/negative limits.
    const safeLimit = Number.isFinite(limit) ? Math.max(0, limit) : 5;
    return unhidden.slice(0, safeLimit);
  });

  protected readonly decoratedActions: Signal<DecoratedPendingAction[]> = this.initDecoratedActions();

  protected handleActionClick(item: DecoratedPendingAction): void {
    if (this.isRsvpInline(item)) {
      this.loadMeetingForRsvp(item);
      return;
    }
    if (this.isVoteInline(item)) {
      this.loadVoteForRow(item);
      return;
    }
    this.hiddenActionsService.hideAction(item);
    this.hiddenActionsVersion.update((v) => v + 1);
    this.actionClick.emit(item);
  }

  protected handleRsvpChanged(item: DecoratedPendingAction): void {
    // Skip `actionClick` so the parent dashboard doesn't refresh and skeleton-flash siblings.
    // Persist SYNCHRONOUSLY (before the timer) so an unmount inside the 1.5s window can't
    // cancel the cookie write via `takeUntilDestroyed` and resurrect the row on next visit.
    this.startRowDismissal(item);
  }

  protected handleVoteSubmitted(item: DecoratedPendingAction, payload: { abstain: boolean; user_vote_content?: VoteAnswerInput[] }): void {
    const voteUid = item.voteUid;
    const voteResponseUid = item.voteResponseUid;
    if (!voteUid || !voteResponseUid) return;

    this.submittingVoteUid.set(voteUid);

    this.voteService
      .submitVoteResponse({ vote_uid: voteUid, vote_response_uid: voteResponseUid, abstain: payload.abstain, user_vote_content: payload.user_vote_content })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submittingVoteUid.set(null);
          this.messageService.add({ severity: 'success', summary: 'Vote submitted', detail: 'Your ballot has been recorded.', life: 3000 });
          this.startRowDismissal(item);
        },
        error: () => {
          this.submittingVoteUid.set(null);
          const vote = item.vote ?? null;
          const pccBase = environment.urls.pcc.replace(/\/$/, '');
          const pccUrl = vote ? `${pccBase}/project/${vote.project_uid}/collaboration/voting` : `${pccBase}/collaboration/voting`;
          this.messageService.add({
            severity: 'error',
            summary: 'Vote submission failed',
            detail: `Could not submit your vote. Open in PCC: ${pccUrl}`,
            life: 6000,
          });
        },
      });
  }

  protected handleVoteCancelled(item: DecoratedPendingAction): void {
    const rowKey = this.getRowKey(item);
    if (this.expandedRowKey() === rowKey) {
      this.expandedRowKey.set(null);
    }
  }

  private isRsvpInline(item: PendingActionItem): boolean {
    return item.type === 'RSVP' && !!item.meetingUid;
  }

  private isVoteInline(item: PendingActionItem): boolean {
    return item.type === 'Vote' && !!item.voteUid && !!item.voteResponseUid;
  }

  private isVoteSingleQuestion(vote: Vote): boolean {
    return (vote.poll_questions?.length ?? 0) === 1;
  }

  // Composite key for action types that carry intrinsic IDs; text+link fallback for others.
  private getRowKey(item: PendingActionItem): string {
    if (item.meetingUid) {
      return `${item.type}-${item.meetingUid}-${item.occurrenceId ?? ''}`;
    }
    if (item.voteUid) {
      return `${item.type}-${item.voteUid}`;
    }
    return `${item.type}-${item.text}-${item.buttonLink ?? ''}`;
  }

  private initDecoratedActions(): Signal<DecoratedPendingAction[]> {
    return computed(() => {
      const expandedKey = this.expandedRowKey();
      const loadingMeetingUid = this.loadingMeetingUid();
      const loadingVoteUid = this.loadingVoteUid();
      const meetingCache = this.rsvpMeetingCache();
      const voteCache = this.voteCache();
      const dismissing = this.dismissingRowKeys();

      return this.visibleActions().map((item) => {
        const rowKey = this.getRowKey(item);
        const isRsvpInline = this.isRsvpInline(item);
        const isVoteInline = this.isVoteInline(item);
        const meeting = item.meetingUid ? (meetingCache[item.meetingUid] ?? null) : null;
        const vote = item.voteUid ? (voteCache[item.voteUid] ?? null) : null;
        let rowClass: string;
        if (dismissing.has(rowKey)) {
          rowClass = 'bg-emerald-50/60';
        } else if (item.type === 'RSVP') {
          rowClass = 'bg-amber-50/60';
        } else {
          rowClass = stableKeyParity(rowKey) === 0 ? 'bg-white' : 'bg-gray-50/60';
        }
        return {
          ...item,
          rowKey,
          isRsvpInline,
          isRsvpInlineLink: isRsvpInline && !!item.buttonLink,
          isVoteInline,
          isExpanded: expandedKey === rowKey,
          isLoading: (!!item.meetingUid && loadingMeetingUid === item.meetingUid) || (!!item.voteUid && loadingVoteUid === item.voteUid),
          meeting,
          vote,
          rowClass,
        };
      });
    });
  }

  // Shared dismiss pattern: hides the action cookie, applies the emerald tint, then removes the row after 1.5s.
  private startRowDismissal(item: PendingActionItem): void {
    this.hiddenActionsService.hideAction(item);
    const rowKey = this.getRowKey(item);
    this.dismissingRowKeys.update((keys) => new Set(keys).add(rowKey));
    this.frozenDismissingKeys.update((keys) => new Set(keys).add(rowKey));
    timer(1500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.expandedRowKey() === rowKey) {
          this.expandedRowKey.set(null);
        }
        this.frozenDismissingKeys.update((keys) => {
          if (!keys.has(rowKey)) return keys;
          const next = new Set(keys);
          next.delete(rowKey);
          return next;
        });
        const wasDismissing = this.dismissingRowKeys().has(rowKey);
        this.dismissingRowKeys.update((keys) => {
          if (!keys.has(rowKey)) return keys;
          const next = new Set(keys);
          next.delete(rowKey);
          return next;
        });
        if (wasDismissing) {
          this.hiddenActionsVersion.update((v) => v + 1);
        }
      });
  }

  private loadMeetingForRsvp(item: PendingActionItem): void {
    const meetingUid = item.meetingUid;
    if (!meetingUid) return;

    this.expandedRowKey.set(this.getRowKey(item));

    if (this.rsvpMeetingCache()[meetingUid]) return;

    this.loadingMeetingUid.set(meetingUid);
    this.meetingService
      .getMeeting(meetingUid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (meeting) => {
          this.rsvpMeetingCache.update((cache) => ({ ...cache, [meetingUid]: meeting }));
          if (this.loadingMeetingUid() === meetingUid) {
            this.loadingMeetingUid.set(null);
          }
        },
        error: () => {
          if (this.loadingMeetingUid() === meetingUid) {
            this.loadingMeetingUid.set(null);
          }
          if (this.expandedRowKey() === this.getRowKey(item)) {
            this.expandedRowKey.set(null);
          }
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load meeting',
            detail: 'Open the meeting page from the title link and try again.',
            life: 4000,
          });
        },
      });
  }

  private loadVoteForRow(item: PendingActionItem): void {
    const voteUid = item.voteUid;
    if (!voteUid) return;

    this.expandedRowKey.set(this.getRowKey(item));

    const cached = this.voteCache()[voteUid];
    if (cached) {
      // Multi-question: open /votes in a new tab until drawer respond-mode lands (Step 6/7).
      if (!this.isVoteSingleQuestion(cached)) {
        this.expandedRowKey.set(null);
        window.open(item.buttonLink ?? '/votes', '_blank', 'noopener,noreferrer');
      }
      return;
    }

    this.loadingVoteUid.set(voteUid);
    this.voteService
      .getVote(voteUid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (vote) => {
          this.voteCache.update((cache) => ({ ...cache, [voteUid]: vote }));
          if (this.loadingVoteUid() === voteUid) {
            this.loadingVoteUid.set(null);
          }
          // Multi-question: open /votes in a new tab until drawer respond-mode lands (Step 6/7).
          if (!this.isVoteSingleQuestion(vote)) {
            this.expandedRowKey.set(null);
            window.open(item.buttonLink ?? '/votes', '_blank', 'noopener,noreferrer');
          }
        },
        error: () => {
          if (this.loadingVoteUid() === voteUid) {
            this.loadingVoteUid.set(null);
          }
          if (this.expandedRowKey() === this.getRowKey(item)) {
            this.expandedRowKey.set(null);
          }
          const pccUrl = `${environment.urls.pcc.replace(/\/$/, '')}/collaboration/voting`;
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load ballot',
            detail: `Please try again or open your ballot in PCC: ${pccUrl}`,
            life: 5000,
          });
        },
      });
  }
}
