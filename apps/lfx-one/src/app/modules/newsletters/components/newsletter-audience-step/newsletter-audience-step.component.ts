// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, effect, inject, input, Signal, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MultiSelectComponent } from '@components/multi-select/multi-select.component';
import { Committee, NewsletterRecipient } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { NewsletterService } from '@services/newsletter.service';
import { Popover, PopoverModule } from 'primeng/popover';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { catchError, finalize, of, startWith, take } from 'rxjs';

interface CommitteeOption {
  label: string;
  value: string;
  category: string;
}

@Component({
  selector: 'lfx-newsletter-audience-step',
  imports: [ReactiveFormsModule, MultiSelectComponent, PopoverModule, ProgressSpinnerModule],
  templateUrl: './newsletter-audience-step.component.html',
})
export class NewsletterAudienceStepComponent {
  // === Services ===
  private readonly committeeService = inject(CommitteeService);
  private readonly newsletterService = inject(NewsletterService);
  private readonly destroyRef = inject(DestroyRef);

  // === Inputs ===
  public readonly form = input.required<FormGroup>();
  public readonly contextUid = input.required<string>();
  public readonly recipientCount = input<number | null>(null);
  public readonly recipientCountLoading = input<boolean>(false);

  // === Signals ===
  protected readonly committees = signal<Committee[]>([]);
  protected readonly loadingCommittees = signal<boolean>(false);
  protected readonly recipients = signal<NewsletterRecipient[]>([]);
  protected readonly recipientsLoading = signal<boolean>(false);
  protected readonly recipientsError = signal<string | null>(null);
  protected readonly recipientsPopover = viewChild<Popover>('recipientsPopover');
  protected readonly committeeUidsValue = signal<string[]>([]);

  protected readonly committeeOptions = computed<CommitteeOption[]>(() =>
    this.committees().map((c) => ({
      label: c.name || 'Unnamed group',
      value: c.uid,
      category: c.category || 'Other',
    }))
  );
  protected readonly selectedCount: Signal<number> = computed(() => this.committeeUidsValue().length);
  protected readonly hasCommittees = computed(() => this.committeeOptions().length > 0);

  public constructor() {
    // Load committees when contextUid changes.
    effect(() => {
      const uid = this.contextUid();
      if (!uid) {
        this.committees.set([]);
        return;
      }
      this.loadingCommittees.set(true);
      this.committeeService
        .getCommitteesByProject(uid)
        .pipe(
          take(1),
          catchError(() => of([] as Committee[])),
          finalize(() => this.loadingCommittees.set(false))
        )
        .subscribe((committees) => this.committees.set(committees));
    });

    // Mirror the form's committeeUids value into a signal for template reactivity.
    effect((onCleanup) => {
      const control = this.form().get('committeeUids');
      if (!control) return;
      this.committeeUidsValue.set((control.value as string[]) ?? []);
      const sub = control.valueChanges
        .pipe(startWith(control.value), takeUntilDestroyed(this.destroyRef))
        .subscribe((v) => this.committeeUidsValue.set((v as string[]) ?? []));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected onShowRecipients(event: Event): void {
    const popover = this.recipientsPopover();
    if (!popover) return;
    popover.toggle(event);

    const uids: string[] = this.form().get('committeeUids')?.value ?? [];
    if (uids.length === 0) {
      this.recipients.set([]);
      this.recipientsError.set(null);
      return;
    }

    this.recipientsLoading.set(true);
    this.recipientsError.set(null);
    this.newsletterService
      .getRecipients({ committeeUids: uids })
      .pipe(
        take(1),
        finalize(() => this.recipientsLoading.set(false))
      )
      .subscribe({
        next: (res) => this.recipients.set(res.recipients ?? []),
        error: () => {
          this.recipients.set([]);
          this.recipientsError.set('Could not load recipients. Please try again.');
        },
      });
  }
}
