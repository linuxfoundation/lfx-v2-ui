// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, inject, input, output, signal, Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RsvpButtonGroupComponent } from '@app/modules/meetings/components/rsvp-button-group/rsvp-button-group.component';
import { ButtonComponent } from '@components/button/button.component';
import { TagComponent } from '@components/tag/tag.component';
import { MeetingService } from '@services/meeting.service';
import { HiddenActionsService } from '@shared/services/hidden-actions.service';
import { MessageService } from 'primeng/api';
import { timer } from 'rxjs';

import type { DecoratedPendingAction, Meeting, PendingActionItem } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-pending-actions',
  imports: [ButtonComponent, TagComponent, RsvpButtonGroupComponent],
  templateUrl: './pending-actions.component.html',
  styleUrl: './pending-actions.component.scss',
})
export class PendingActionsComponent {
  private readonly hiddenActionsService = inject(HiddenActionsService);
  private readonly meetingService = inject(MeetingService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly pendingActions = input.required<PendingActionItem[]>();
  public readonly displayLimit = input<number>(5);

  public readonly actionClick = output<PendingActionItem>();

  // Cookie-backed dismissals live outside the signal graph; bumping forces the computed to recompute.
  private readonly hiddenActionsVersion = signal(0);
  protected readonly expandedRsvpKey = signal<string | null>(null);
  // Tracks the row currently in the 1.5s post-RSVP confirmation window so the row background can
  // briefly tint green to acknowledge the response before the row visually collapses. Cleared
  // inside the `timer(1500)` callback in `handleRsvpChanged`. Note: persistence (cookie write via
  // `hideAction`) runs SYNCHRONOUSLY before that timer — only the visual cue lives on the timer,
  // so a route change inside the window can't undo the dismissal. Independent from
  // `expandedRsvpKey` because the row stays expanded (showing the selected response button) for
  // the full 1.5s — the tint is an additive cue, not an exclusive state.
  protected readonly dismissingRowKey = signal<string | null>(null);

  // The meetingUid currently being fetched (if any). Per-meeting tracking instead of a global flag
  // so a stale response from row A's request can't clobber row B's loading state when the user
  // quickly toggles between rows.
  private readonly loadingMeetingUid = signal<string | null>(null);
  private readonly rsvpMeetingCache = signal<Record<string, Meeting>>({});

  private readonly visibleActions: Signal<PendingActionItem[]> = computed(() => {
    this.hiddenActionsVersion();
    const unhidden = this.pendingActions().filter((item) => !this.hiddenActionsService.isActionHidden(item));
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

    this.hiddenActionsService.hideAction(item);
    this.hiddenActionsVersion.update((v) => v + 1);
    this.actionClick.emit(item);
  }

  protected handleRsvpChanged(item: DecoratedPendingAction): void {
    // Skip `actionClick` emit so the parent dashboard doesn't refresh and skeleton-flash sibling rows.
    // Persist the dismissal SYNCHRONOUSLY (before the timer) so a route change / unmount within
    // the 1.5s window can't cancel the cookie write via `takeUntilDestroyed` and cause the
    // already-RSVPed row to reappear on the next visit. The timer below is purely the visual
    // confirmation cue — it owns `dismissingRowKey` (emerald tint) and the deferred collapse of
    // `expandedRsvpKey`, both of which are safe to drop on unmount because the row is gone anyway.
    this.hiddenActionsService.hideAction(item);
    this.hiddenActionsVersion.update((v) => v + 1);

    // Defer the visual cleanup so the chosen response and toast register before the row vanishes.
    // Guard the collapse on rowKey so A's timer can't collapse B if the user moved on.
    const rowKey = this.getRowKey(item);
    this.dismissingRowKey.set(rowKey);
    timer(1500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (this.expandedRsvpKey() === rowKey) {
          this.expandedRsvpKey.set(null);
        }
        // Same staleness guard as `expandedRsvpKey` — a deferred clear from row A must not wipe
        // row B's confirmation tint if the user RSVPed B during A's 1.5s window.
        if (this.dismissingRowKey() === rowKey) {
          this.dismissingRowKey.set(null);
        }
      });
  }

  private isRsvpInline(item: PendingActionItem): boolean {
    return item.type === 'RSVP' && !!item.meetingUid;
  }

  // Prefer intrinsic IDs; fall back to a composite for action types that don't carry IDs yet.
  private getRowKey(item: PendingActionItem): string {
    if (item.meetingUid) {
      return `${item.type}-${item.meetingUid}-${item.occurrenceId ?? ''}`;
    }
    return `${item.type}-${item.text}-${item.buttonLink ?? ''}`;
  }

  // Per-row background tint, baked into each `DecoratedPendingAction` alongside its other view state.
  //  - Post-RSVP confirmation window wins (soft emerald) so the user gets a "registered" cue
  //    during the 1.5s pre-dismiss timer, regardless of row position or type.
  //  - RSVP rows otherwise carry a soft amber tint — they're the most common row type and the
  //    warm tone reads as the card's primary "respond now" affordance.
  //  - Other types zebra-stripe by visible-list index so adjacent same-type items don't blur
  //    into one another. `gray-50/60` is light enough to keep text contrast comfortable.
  // All states use solid `background-color` (not gradients) so the row's `transition-colors`
  // can cross-fade between them — `transition-colors` doesn't animate `background-image`, so a
  // gradient → emerald swap would snap rather than fade and defeat the confirmation cue.
  // All tints reference LFX palette tokens (lfxColors in tailwind.config.js) — no raw hex.
  private initDecoratedActions(): Signal<DecoratedPendingAction[]> {
    return computed(() => {
      const expandedKey = this.expandedRsvpKey();
      const loadingUid = this.loadingMeetingUid();
      const cache = this.rsvpMeetingCache();
      const dismissingKey = this.dismissingRowKey();

      return this.visibleActions().map((item, index) => {
        const rowKey = this.getRowKey(item);
        const isRsvpInline = this.isRsvpInline(item);
        const meeting = item.meetingUid ? (cache[item.meetingUid] ?? null) : null;
        let rowClass: string;
        if (dismissingKey === rowKey) {
          rowClass = 'bg-emerald-50/60';
        } else if (item.type === 'RSVP') {
          rowClass = 'bg-amber-50/60';
        } else {
          rowClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50/60';
        }
        return {
          ...item,
          rowKey,
          isRsvpInline,
          isRsvpInlineLink: isRsvpInline && !!item.buttonLink,
          isExpanded: expandedKey === rowKey,
          isLoading: !!item.meetingUid && loadingUid === item.meetingUid,
          meeting,
          rowClass,
        };
      });
    });
  }

  private loadMeetingForRsvp(item: PendingActionItem): void {
    const meetingUid = item.meetingUid;
    if (!meetingUid) return;

    this.expandedRsvpKey.set(this.getRowKey(item));

    if (this.rsvpMeetingCache()[meetingUid]) return;

    this.loadingMeetingUid.set(meetingUid);
    this.meetingService
      .getMeeting(meetingUid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (meeting) => {
          this.rsvpMeetingCache.update((cache) => ({ ...cache, [meetingUid]: meeting }));
          // Only clear loading if this is still the in-flight request — guards against stale row swaps.
          if (this.loadingMeetingUid() === meetingUid) {
            this.loadingMeetingUid.set(null);
          }
        },
        error: () => {
          if (this.loadingMeetingUid() === meetingUid) {
            this.loadingMeetingUid.set(null);
          }
          if (this.expandedRsvpKey() === this.getRowKey(item)) {
            this.expandedRsvpKey.set(null);
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
}
