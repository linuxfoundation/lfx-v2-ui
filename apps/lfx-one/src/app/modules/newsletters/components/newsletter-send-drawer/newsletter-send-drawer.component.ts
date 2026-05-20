// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, model, output, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { MultiSelectComponent } from '@components/multi-select/multi-select.component';
import { Committee, NewsletterContextType, NewsletterSendResult } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { NewsletterService } from '@services/newsletter.service';
import { MessageService } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, startWith, Subject, switchMap, take, takeUntil } from 'rxjs';

interface CommitteeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'lfx-newsletter-send-drawer',
  imports: [DrawerModule, ProgressSpinnerModule, ReactiveFormsModule, ButtonComponent, InputTextComponent, MultiSelectComponent],
  templateUrl: './newsletter-send-drawer.component.html',
  styleUrl: './newsletter-send-drawer.component.scss',
})
export class NewsletterSendDrawerComponent {
  // === Services ===
  private readonly newsletterService = inject(NewsletterService);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  // === Inputs ===
  public readonly subject = input.required<string>();
  public readonly bodyHtml = input.required<string>();
  public readonly contextType = input.required<NewsletterContextType>();
  public readonly contextUid = input.required<string>();
  public readonly edEmail = input.required<string>();

  // === Model Signals (two-way) ===
  public readonly visible = model<boolean>(false);

  // === Outputs ===
  public readonly newsletterSent = output<NewsletterSendResult>();

  // === Forms ===
  public readonly audienceForm = new FormGroup({
    committeeUids: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required, Validators.minLength(1)] }),
  });
  public readonly testForm = new FormGroup({
    testEmail: new FormControl<string>('', { nonNullable: true }),
  });

  // === Writable Signals ===
  protected readonly committees = signal<Committee[]>([]);
  protected readonly loadingCommittees = signal<boolean>(false);
  protected readonly testSending = signal<boolean>(false);
  protected readonly sending = signal<boolean>(false);
  protected readonly recipientCount = signal<number | null>(null);
  protected readonly recipientCountLoading = signal<boolean>(false);

  // === Computed ===
  protected readonly committeeOptions: Signal<CommitteeOption[]> = computed(() =>
    this.committees().map((c) => ({ label: c.name || 'Unnamed committee', value: c.uid }))
  );
  protected readonly selectedCount = this.initSelectedCount();
  protected readonly canSend = computed(() => this.selectedCount() > 0 && !this.sending());
  protected readonly testEmail = toSignal(this.testForm.controls.testEmail.valueChanges, { initialValue: this.testForm.controls.testEmail.value });
  protected readonly canTestSend = computed(() => {
    const email = (this.testEmail() || '').trim();
    return email.length > 0 && email.includes('@') && !this.testSending();
  });

  private readonly cancel$ = new Subject<void>();

  public constructor() {
    // Load committees whenever the drawer becomes visible.
    effect(() => {
      const visible = this.visible();
      if (visible) {
        this.loadCommittees(this.contextUid());
        // Default the test email to the ED's address when the drawer opens.
        if (!this.testForm.controls.testEmail.value && this.edEmail()) {
          this.testForm.controls.testEmail.setValue(this.edEmail(), { emitEvent: false });
        }
      } else {
        this.cancel$.next();
      }
    });

    // Live recipient-count lookup, debounced.
    this.audienceForm.controls.committeeUids.valueChanges
      .pipe(
        startWith(this.audienceForm.controls.committeeUids.value),
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap((uids) => {
          if (!uids || uids.length === 0) {
            this.recipientCount.set(0);
            return of(null);
          }
          this.recipientCountLoading.set(true);
          return this.newsletterService.getRecipientCount({ committeeUids: uids }).pipe(
            map((res) => res.count),
            catchError(() => of(null)),
            finalize(() => this.recipientCountLoading.set(false))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((count) => {
        if (count !== null) this.recipientCount.set(count);
      });
  }

  public onClose(): void {
    this.cancel$.next();
    this.visible.set(false);
  }

  public onSendTest(): void {
    if (!this.canTestSend()) return;
    this.testSending.set(true);
    this.newsletterService
      .testSend({
        subject: this.subject(),
        bodyHtml: this.bodyHtml(),
        toEmail: this.testForm.controls.testEmail.value.trim(),
        contextType: this.contextType(),
        contextUid: this.contextUid(),
        edReplyEmail: this.edEmail(),
      })
      .pipe(
        take(1),
        takeUntil(this.cancel$),
        finalize(() => this.testSending.set(false))
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Test sent',
            detail: `A test newsletter was sent to ${this.testForm.controls.testEmail.value.trim()}.`,
          });
        },
        error: (err: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Test send failed',
            detail: err?.error?.message || err?.message || 'Could not send test email. Please try again.',
          });
        },
      });
  }

  public onSend(): void {
    if (!this.canSend()) return;
    const committeeUids = this.audienceForm.controls.committeeUids.value;
    this.sending.set(true);
    this.newsletterService
      .send({
        subject: this.subject(),
        bodyHtml: this.bodyHtml(),
        committeeUids,
        contextType: this.contextType(),
        contextUid: this.contextUid(),
        edReplyEmail: this.edEmail(),
      })
      .pipe(
        take(1),
        takeUntil(this.cancel$),
        finalize(() => this.sending.set(false))
      )
      .subscribe({
        next: (result) => {
          if (result.failed > 0) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Sent with errors',
              detail: `Delivered ${result.sent} of ${result.totalRecipients}. ${result.failed} failed.`,
              life: 8000,
            });
          } else {
            this.messageService.add({
              severity: 'success',
              summary: 'Newsletter sent',
              detail: `Delivered to ${result.sent} recipients.`,
            });
          }
          this.newsletterSent.emit(result);
          this.visible.set(false);
          this.audienceForm.reset({ committeeUids: [] });
          this.recipientCount.set(null);
        },
        error: (err: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Send failed',
            detail: err?.error?.message || err?.message || 'Could not send newsletter. Please try again.',
          });
        },
      });
  }

  private loadCommittees(contextUid: string): void {
    if (!contextUid) {
      this.committees.set([]);
      return;
    }
    this.loadingCommittees.set(true);
    this.committeeService
      .getCommitteesByProject(contextUid)
      .pipe(
        take(1),
        takeUntil(this.cancel$),
        catchError(() => of([] as Committee[])),
        finalize(() => this.loadingCommittees.set(false))
      )
      .subscribe((committees) => this.committees.set(committees));
  }

  private initSelectedCount(): Signal<number> {
    return toSignal(
      this.audienceForm.controls.committeeUids.valueChanges.pipe(
        startWith(this.audienceForm.controls.committeeUids.value),
        map((v) => v?.length ?? 0)
      ),
      { initialValue: 0 }
    );
  }
}
