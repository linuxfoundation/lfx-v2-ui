// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonComponent } from '@components/button/button.component';
import {
  CreateNewsletterDraftRequest,
  GenerateNewsletterResponse,
  Newsletter,
  NewsletterContextType,
  NewsletterSendResult,
  ProjectContext,
  UpdateNewsletterDraftRequest,
} from '@lfx-one/shared/interfaces';
import { NewsletterService } from '@services/newsletter.service';
import { ProjectContextService } from '@services/project-context.service';
import { ProjectService } from '@services/project.service';
import { UserService } from '@services/user.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { StepperModule } from 'primeng/stepper';
import { catchError, combineLatest, debounceTime, distinctUntilChanged, filter, finalize, map, of, switchMap, take } from 'rxjs';

import { NewsletterAudienceStepComponent } from '../components/newsletter-audience-step/newsletter-audience-step.component';
import { NewsletterContentStepComponent } from '../components/newsletter-content-step/newsletter-content-step.component';
import { NewsletterPreviewDrawerComponent } from '../components/newsletter-preview-drawer/newsletter-preview-drawer.component';
import { NewsletterSendStepComponent } from '../components/newsletter-send-step/newsletter-send-step.component';

const TOTAL_STEPS = 3;
const STEP_TITLES: Record<number, string> = {
  1: 'Audience',
  2: 'Content',
  3: 'Send',
};

@Component({
  selector: 'lfx-newsletter-manage',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    StepperModule,
    SkeletonModule,
    ConfirmDialogModule,
    ButtonComponent,
    NewsletterAudienceStepComponent,
    NewsletterContentStepComponent,
    NewsletterSendStepComponent,
    NewsletterPreviewDrawerComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './newsletter-manage.component.html',
  styleUrl: './newsletter-manage.component.scss',
})
export class NewsletterManageComponent {
  // === Services ===
  protected readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly newsletterService = inject(NewsletterService);
  private readonly projectContextService = inject(ProjectContextService);
  private readonly projectService = inject(ProjectService);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // === Forms ===
  public readonly form = new FormGroup({
    committeeUids: new FormControl<string[]>([], { nonNullable: true }),
    subject: new FormControl<string>('', { nonNullable: true }),
    bodyHtml: new FormControl<string>('', { nonNullable: true }),
  });

  // === Mode + state ===
  public readonly newsletterId = signal<string | null>(null);
  public readonly version = signal<number>(0);
  public readonly isEditMode = computed(() => this.newsletterId() !== null);
  public readonly draftLoading = signal<boolean>(false);
  public readonly submitting = signal<boolean>(false);
  public readonly testSending = signal<boolean>(false);
  public readonly savedAt = signal<Date | null>(null);
  public readonly savingDraft = signal<boolean>(false);
  public readonly previewDrawerVisible = signal<boolean>(false);

  // === Step state ===
  private readonly internalStep = signal<number>(1);
  public readonly totalSteps = TOTAL_STEPS;
  public readonly currentStep: Signal<number> = this.initCurrentStep();

  // === Project context ===
  public readonly activeContext: Signal<ProjectContext | null> = this.projectContextService.activeContext;
  public readonly isFoundationContext: Signal<boolean> = this.projectContextService.isFoundationContext;
  public readonly contextUid: Signal<string> = this.projectContextService.activeContextUid;
  public readonly contextType: Signal<NewsletterContextType> = computed(() => (this.isFoundationContext() ? 'foundation' : 'project'));
  public readonly displayName: Signal<string> = computed(() => this.activeContext()?.name ?? '');
  private readonly fetchedLogoUrl = signal<string | undefined>(undefined);
  public readonly logoUrl: Signal<string | undefined> = computed(() => this.activeContext()?.logoUrl || this.fetchedLogoUrl());
  public readonly hasContext: Signal<boolean> = computed(() => this.contextUid().length > 0);

  // === Auth-derived ===
  public readonly edName: Signal<string> = computed(() => {
    const user = this.userService.user();
    return user?.name || user?.given_name || user?.nickname || 'Executive Director';
  });
  public readonly edEmail: Signal<string> = computed(() => this.userService.user()?.email ?? '');

  // === Form mirrors ===
  // Plain signals + manual subscription rather than toSignal(valueChanges)
  // because populateFormFromDraft patches with { emitEvent: false } to suppress
  // autosave on initial load. With toSignal these would never update from the
  // initial empty value; we seed them manually in populateFormFromDraft instead.
  private readonly committeeUidsValue = signal<string[]>([]);
  private readonly subjectValue = signal<string>('');
  private readonly bodyValue = signal<string>('');

  // === Recipient summary (computed here so review/send steps can share it) ===
  protected readonly recipientCount = signal<number | null>(null);
  protected readonly recipientCountLoading = signal<boolean>(false);

  // === Validation gates ===
  public readonly subjectFilled = computed(() => (this.subjectValue() ?? '').trim().length > 0);
  public readonly bodyFilled = computed(() => stripHtml(this.bodyValue() ?? '').trim().length > 0);
  public readonly audienceFilled = computed(() => (this.committeeUidsValue() ?? []).length > 0);
  public readonly canSend = computed(() => this.audienceFilled() && this.subjectFilled() && this.bodyFilled() && this.hasContext() && !this.submitting());
  public readonly canSendTest = computed(
    () => this.subjectFilled() && this.bodyFilled() && this.hasContext() && this.edEmail().length > 0 && !this.testSending()
  );
  public readonly canProceed = computed(() => this.computeCanProceed(this.currentStep()));
  public readonly canGoPrevious = computed(() => this.currentStep() > 1);
  public readonly canGoNext = computed(() => this.currentStep() < this.totalSteps && this.canProceed());
  public readonly isLastStep = computed(() => this.currentStep() === this.totalSteps);
  public readonly currentStepTitle = computed(() => STEP_TITLES[this.currentStep()] ?? '');
  protected readonly savedLabel = computed(() => {
    const at = this.savedAt();
    if (!at) return null;
    return `Saved ${formatRelative(at)}`;
  });

  public constructor() {
    this.initContextLogo();
    this.initFormMirrors();
    this.initLoadDraft();
    this.initAutosave();
    this.initRecipientCount();
  }

  protected goToStep(step: number | undefined): void {
    if (step === undefined || step < 1 || step > this.totalSteps) return;
    // Only allow forward navigation if all previous steps are valid; backward is always fine.
    if (step > this.currentStep()) {
      for (let i = this.currentStep(); i < step; i++) {
        if (!this.computeCanProceed(i)) return;
      }
    }
    if (this.isEditMode()) {
      this.router.navigate([], { relativeTo: this.route, queryParams: { step }, queryParamsHandling: 'merge', replaceUrl: true });
    } else {
      this.internalStep.set(step);
    }
  }

  protected nextStep(): void {
    if (this.canGoNext()) this.goToStep(this.currentStep() + 1);
  }

  protected previousStep(): void {
    if (this.canGoPrevious()) this.goToStep(this.currentStep() - 1);
  }

  protected onCancel(): void {
    this.goToList();
  }

  protected openPreviewDrawer(): void {
    this.previewDrawerVisible.set(true);
  }

  protected onGenerated(result: GenerateNewsletterResponse): void {
    this.form.patchValue({
      subject: result.subject ?? this.form.controls.subject.value,
      bodyHtml: result.bodyHtml,
    });
  }

  protected onSendTest(): void {
    if (!this.canSendTest()) return;
    this.testSending.set(true);
    this.newsletterService
      .testSend({
        subject: this.form.controls.subject.value,
        bodyHtml: this.form.controls.bodyHtml.value,
        toEmail: this.edEmail(),
        contextType: this.contextType(),
        contextUid: this.contextUid(),
        edReplyEmail: this.edEmail(),
      })
      .pipe(
        take(1),
        finalize(() => this.testSending.set(false))
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Test sent',
            detail: `A test newsletter was sent to ${this.edEmail()}.`,
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

  protected onSend(): void {
    if (!this.canSend()) return;
    const count = this.recipientCount();
    const recipientLabel = count !== null && count > 0 ? `~${count} ${count === 1 ? 'recipient' : 'recipients'}` : 'the selected groups';
    this.confirmationService.confirm({
      header: 'Send newsletter?',
      message: `This will send your newsletter to ${recipientLabel}. Once sent, it can't be undone.`,
      icon: 'pi pi-paper-plane',
      acceptLabel: 'Send now',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-sm',
      rejectButtonStyleClass: 'p-button-secondary p-button-sm p-button-outlined',
      accept: () => this.runSend(),
    });
  }

  // The `:id/edit` route has two URL segments, so `['..']` resolves to `/<id>`
  // which doesn't match any route. Anchoring to `this.route.parent` (the
  // newsletter module root) and navigating to the explicit `list` child works
  // for both create and edit modes.
  private goToList(): void {
    this.router.navigate(['list'], { relativeTo: this.route.parent });
  }

  private computeCanProceed(step: number): boolean {
    switch (step) {
      case 1:
        return this.audienceFilled();
      case 2:
        return this.subjectFilled() && this.bodyFilled();
      case 3:
        return this.canSend();
      default:
        return false;
    }
  }

  private initFormMirrors(): void {
    this.form.controls.committeeUids.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => this.committeeUidsValue.set(v ?? []));
    this.form.controls.subject.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => this.subjectValue.set(v ?? ''));
    this.form.controls.bodyHtml.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((v) => this.bodyValue.set(v ?? ''));
  }

  private initRecipientCount(): void {
    this.form.controls.committeeUids.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((uids) => this.fetchRecipientCountFor(uids ?? []));
  }

  private fetchRecipientCountFor(uids: string[]): void {
    if (!uids || uids.length === 0) {
      this.recipientCount.set(0);
      return;
    }
    this.recipientCountLoading.set(true);
    this.newsletterService
      .getRecipientCount({ committeeUids: uids })
      .pipe(
        take(1),
        finalize(() => this.recipientCountLoading.set(false))
      )
      .subscribe({
        next: (res) => this.recipientCount.set(res.count),
        error: () => this.recipientCount.set(null),
      });
  }

  private runSend(): void {
    this.submitting.set(true);
    const id = this.newsletterId();
    const send$ = id
      ? this.newsletterService.sendDraft(id, this.version())
      : this.newsletterService.send({
          subject: this.form.controls.subject.value,
          bodyHtml: this.form.controls.bodyHtml.value,
          committeeUids: this.form.controls.committeeUids.value,
          contextType: this.contextType(),
          contextUid: this.contextUid(),
          edReplyEmail: this.edEmail(),
        });

    send$
      .pipe(
        take(1),
        finalize(() => this.submitting.set(false))
      )
      .subscribe({
        next: (result: NewsletterSendResult) => {
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
              detail: `Delivered to ${result.sent} ${result.sent === 1 ? 'recipient' : 'recipients'}.`,
            });
          }
          this.goToList();
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

  private initCurrentStep(): Signal<number> {
    // Mode can flip mid-flow: a /create session that autosaves becomes edit
    // mode once newsletterId is set, without a route change. So we react to
    // isEditMode() and read from the matching source (URL in edit mode,
    // internalStep otherwise) rather than committing to one source at
    // construction time.
    const initialStep = this.parseStepParam(this.route.snapshot.queryParamMap.get('step'));
    this.internalStep.set(initialStep);

    return toSignal(
      combineLatest([toObservable(this.isEditMode), this.route.queryParamMap, toObservable(this.internalStep)]).pipe(
        map(([editMode, params, internal]) => (editMode ? this.parseStepParam(params.get('step')) : internal))
      ),
      { initialValue: initialStep }
    );
  }

  private parseStepParam(raw: string | null): number {
    if (!raw) return 1;
    const step = parseInt(raw, 10);
    if (step >= 1 && step <= this.totalSteps) return step;
    return 1;
  }

  private initContextLogo(): void {
    effect(() => {
      const ctx = this.activeContext();
      if (ctx?.logoUrl) {
        this.fetchedLogoUrl.set(undefined);
        return;
      }
      if (!ctx?.slug) {
        this.fetchedLogoUrl.set(undefined);
        return;
      }
      this.projectService
        .getProject(ctx.slug, false)
        .pipe(
          take(1),
          map((project) => project?.logo_url || undefined),
          catchError(() => of(undefined))
        )
        .subscribe((url) => this.fetchedLogoUrl.set(url));
    });
  }

  private initLoadDraft(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.newsletterId.set(id);
    this.draftLoading.set(true);
    this.newsletterService
      .getDraft(id)
      .pipe(
        take(1),
        finalize(() => this.draftLoading.set(false))
      )
      .subscribe({
        next: (draft) => this.populateFormFromDraft(draft),
        error: (err: HttpErrorResponse) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Could not load draft',
            detail: err?.error?.message || err?.message || 'The draft may have been deleted or is unavailable.',
          });
          this.goToList();
        },
      });
  }

  private populateFormFromDraft(draft: Newsletter): void {
    this.version.set(draft.version);
    const committeeUids = draft.committeeUids ?? [];
    const subject = draft.subject ?? '';
    const bodyHtml = draft.bodyHtml ?? '';
    this.form.patchValue({ committeeUids, subject, bodyHtml }, { emitEvent: false });
    // patchValue suppresses valueChanges, so mirror into the local signals
    // manually — otherwise canProceed/canSend/audienceFilled stay false on
    // initial draft load, disabling Next and Send buttons.
    this.committeeUidsValue.set(committeeUids);
    this.subjectValue.set(subject);
    this.bodyValue.set(bodyHtml);
    // initRecipientCount listens to valueChanges, which won't fire here either.
    this.fetchRecipientCountFor(committeeUids);
  }

  private initAutosave(): void {
    this.form.valueChanges
      .pipe(
        debounceTime(1000),
        // Skip when nothing meaningful to save yet.
        filter(() => this.hasContext() && this.hasAnythingToSave()),
        // Avoid duplicate writes for identical states.
        distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
        switchMap(() => this.saveDraft()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  // The Go service requires committees + subject + body to all be present for
  // any draft write — there's no concept of a partial draft. So we only fire
  // autosave once the form has enough to satisfy that contract; otherwise the
  // user just sees 400 errors in the console as they type.
  private hasAnythingToSave(): boolean {
    return this.audienceFilled() && this.subjectFilled() && this.bodyFilled();
  }

  private saveDraft() {
    const id = this.newsletterId();
    this.savingDraft.set(true);
    const basePayload = {
      subject: this.form.controls.subject.value,
      bodyHtml: this.form.controls.bodyHtml.value,
      committeeUids: this.form.controls.committeeUids.value,
      edReplyEmail: this.edEmail(),
    };

    if (id) {
      const update: UpdateNewsletterDraftRequest = basePayload;
      return this.newsletterService.updateDraft(id, this.version(), update).pipe(
        take(1),
        finalize(() => this.savingDraft.set(false)),
        map((draft) => {
          this.version.set(draft.version);
          this.savedAt.set(new Date());
          return draft;
        }),
        catchError((err: HttpErrorResponse) => {
          this.savingDraft.set(false);
          if (err.status === 409) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Draft out of sync',
              detail: 'Another session updated this draft. Reload to continue.',
              life: 10_000,
            });
          }
          return of(null);
        })
      );
    }

    const create: CreateNewsletterDraftRequest = {
      contextType: this.contextType(),
      contextUid: this.contextUid(),
      ...basePayload,
    };
    return this.newsletterService.createDraft(create).pipe(
      take(1),
      finalize(() => this.savingDraft.set(false)),
      map((draft) => {
        this.newsletterId.set(draft.id);
        this.version.set(draft.version);
        this.savedAt.set(new Date());
        // We intentionally do NOT navigate to /:id/edit here. Router.navigate
        // tears down this component and recreates it on the :id/edit route,
        // which wipes the form mid-typing while initLoadDraft re-fetches what
        // we just saved. The draft id is held in memory so subsequent autosaves
        // route through updateDraft; if the user refreshes, they'll lose the
        // wizard URL but the draft is preserved in the list page.
        //
        // But isEditMode() just flipped to true, and currentStep now reads
        // from queryParamMap. Seed the URL with the current step so Next stays
        // in sync — otherwise the UI would freeze on whichever step the user
        // was on when autosave landed.
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { step: this.internalStep() },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
        return draft;
      }),
      catchError(() => of(null))
    );
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
}
