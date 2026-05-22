// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, Signal, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { Committee, WeeklyBrief, WeeklyBriefCurrentResponse, WeeklyBriefThrottle } from '@lfx-one/shared/interfaces';
import { WeeklyBriefService } from '@services/weekly-brief.service';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { BehaviorSubject, catchError, combineLatest, filter, finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-weekly-brief-card',
  imports: [CardComponent, ButtonComponent, SkeletonModule],
  templateUrl: './weekly-brief-card.component.html',
  styleUrl: './weekly-brief-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeeklyBriefCardComponent {
  // Inputs
  public readonly committee = input.required<Committee>();
  public readonly canEdit = input<boolean>(false);

  // Injections
  private readonly weeklyBriefService = inject(WeeklyBriefService);
  private readonly messageService = inject(MessageService);

  // UI state signals
  public readonly fetchLoading = signal(true);
  public readonly generating = signal(false);
  public readonly saving = signal(false);
  public readonly editMode = signal(false);
  public readonly editText = signal('');

  // Refresh trigger — local idiom: BehaviorSubject + combineLatest with input observable
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  private readonly briefResponse: Signal<WeeklyBriefCurrentResponse | null> = this.initBriefResponse();

  // Derived signals
  public readonly brief: Signal<WeeklyBrief | null> = computed(() => this.briefResponse()?.brief ?? null);
  public readonly throttle: Signal<WeeklyBriefThrottle | null> = computed(() => this.briefResponse()?.throttle ?? null);

  public readonly canGenerate: Signal<boolean> = computed(() => {
    const t = this.throttle();
    return !t || t.generates_used < t.generates_limit;
  });

  public readonly canRegenerate: Signal<boolean> = computed(() => {
    const t = this.throttle();
    return !t || t.regenerations_used < t.regenerations_limit;
  });

  public readonly weekLabel: Signal<string> = computed(() => {
    const b = this.brief();
    if (!b) return '';
    const start = new Date(b.window_start);
    const end = new Date(b.window_end);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;
  });

  // Public actions
  public onGenerate(): void {
    const committeeUid = this.committee()?.uid;
    if (!committeeUid) return;
    this.generating.set(true);
    const currentBrief = this.brief();
    const body = currentBrief ? { revision: currentBrief.revision } : {};
    this.weeklyBriefService.generateWeeklyBrief(committeeUid, body).subscribe({
      next: () => {
        this.generating.set(false);
        this.refresh$.next();
      },
      error: (err: HttpErrorResponse) => {
        this.generating.set(false);
        const detail =
          err?.status === 429
            ? 'Weekly generation limit reached. Try again next week.'
            : 'Failed to generate brief. Please try again.';
        this.messageService.add({ severity: 'error', summary: 'Generate failed', detail });
      },
    });
  }

  public onEdit(): void {
    this.editMode.set(true);
    this.editText.set(this.brief()?.brief_text ?? '');
  }

  public onSave(): void {
    const committeeUid = this.committee()?.uid;
    const current = this.brief();
    if (!committeeUid || !current) return;
    this.saving.set(true);
    this.weeklyBriefService.saveWeeklyBrief(committeeUid, { brief_text: this.editText(), revision: current.revision }).subscribe({
      next: () => {
        this.saving.set(false);
        this.editMode.set(false);
        this.refresh$.next();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const detail =
          err?.status === 409 ? 'Someone else updated this brief. Reload to see the latest version.' : 'Failed to save brief. Please try again.';
        this.messageService.add({ severity: 'error', summary: 'Save failed', detail });
      },
    });
  }

  public async onCopyAndShare(): Promise<void> {
    const text = this.brief()?.brief_text ?? '';
    try {
      await navigator.clipboard.writeText(text);
      this.messageService.add({
        severity: 'success',
        summary: 'Copied',
        detail: 'Brief copied — paste into your mailing list or Slack',
      });
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Copy failed',
        detail: 'Could not access clipboard.',
      });
    }
  }

  public onCancelEdit(): void {
    this.editMode.set(false);
  }

  public onEditTextChange(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.editText.set(value);
  }

  // Private initializers
  private initBriefResponse(): Signal<WeeklyBriefCurrentResponse | null> {
    const committee$ = toObservable(this.committee);
    return toSignal(
      combineLatest([committee$, this.refresh$]).pipe(
        filter(([c]) => !!c?.uid),
        switchMap(([c]) => {
          this.fetchLoading.set(true);
          return this.weeklyBriefService.getWeeklyBrief(c.uid).pipe(
            catchError(() => of(null as WeeklyBriefCurrentResponse | null)),
            finalize(() => this.fetchLoading.set(false))
          );
        })
      ),
      { initialValue: null }
    );
  }
}
