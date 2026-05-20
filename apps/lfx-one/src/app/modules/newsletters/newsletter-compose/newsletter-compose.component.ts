// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { isPlatformBrowser } from '@angular/common';
import { Component, computed, effect, inject, PLATFORM_ID, signal, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { EditorComponent } from '@components/editor/editor.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { NewsletterContextType, ProjectContext } from '@lfx-one/shared/interfaces';
import { ProjectContextService } from '@services/project-context.service';
import { UserService } from '@services/user.service';
import { debounceTime } from 'rxjs';

import { NewsletterPreviewComponent } from '../components/newsletter-preview/newsletter-preview.component';
import { NewsletterSendDrawerComponent } from '../components/newsletter-send-drawer/newsletter-send-drawer.component';

interface ComposeDraft {
  subject: string;
  bodyHtml: string;
}

const STORAGE_KEY_PREFIX = 'lfx-newsletter-compose:';

@Component({
  selector: 'lfx-newsletter-compose',
  imports: [ReactiveFormsModule, ButtonComponent, EditorComponent, InputTextComponent, NewsletterPreviewComponent, NewsletterSendDrawerComponent],
  templateUrl: './newsletter-compose.component.html',
  styleUrl: './newsletter-compose.component.scss',
})
export class NewsletterComposeComponent {
  // === Services ===
  private readonly projectContextService = inject(ProjectContextService);
  private readonly userService = inject(UserService);
  private readonly platformId = inject(PLATFORM_ID);

  // === Form ===
  public readonly form = new FormGroup({
    subject: new FormControl<string>('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    bodyHtml: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
  });

  // === Writable Signals ===
  public readonly sendDrawerVisible = signal(false);
  public readonly mobilePreviewVisible = signal(false);

  // === Reactive context ===
  public readonly activeContext: Signal<ProjectContext | null> = this.projectContextService.activeContext;
  public readonly isFoundationContext: Signal<boolean> = this.projectContextService.isFoundationContext;
  public readonly contextUid: Signal<string> = this.projectContextService.activeContextUid;
  public readonly contextType: Signal<NewsletterContextType> = computed(() => (this.isFoundationContext() ? 'foundation' : 'project'));
  public readonly displayName: Signal<string> = computed(() => this.activeContext()?.name ?? '');
  public readonly logoUrl: Signal<string | undefined> = computed(() => this.activeContext()?.logoUrl);

  // === Form value mirrors (for preview + drawer inputs) ===
  public readonly subjectValue = toSignal(this.form.controls.subject.valueChanges, { initialValue: this.form.controls.subject.value });
  public readonly bodyValue = toSignal(this.form.controls.bodyHtml.valueChanges, { initialValue: this.form.controls.bodyHtml.value });

  // === Auth-derived ===
  public readonly edName: Signal<string> = computed(() => {
    const user = this.userService.user();
    return user?.name || user?.given_name || user?.nickname || 'Executive Director';
  });
  public readonly edEmail: Signal<string> = computed(() => this.userService.user()?.email ?? '');

  // === Computed UI flags ===
  public readonly canSend: Signal<boolean> = computed(() => {
    const subject = (this.subjectValue() ?? '').trim();
    const body = stripHtml(this.bodyValue() ?? '').trim();
    return subject.length > 0 && body.length > 0 && this.contextUid().length > 0;
  });

  public readonly storageKey: Signal<string> = computed(() => `${STORAGE_KEY_PREFIX}${this.contextUid()}`);

  public constructor() {
    // Restore from localStorage when the context becomes available (browser only).
    effect(() => {
      const key = this.storageKey();
      if (!key.endsWith(':') && isPlatformBrowser(this.platformId)) {
        this.restoreDraft(key);
      }
    });

    // Persist to localStorage on every change (debounced).
    if (isPlatformBrowser(this.platformId)) {
      this.form.valueChanges.pipe(debounceTime(500), takeUntilDestroyed()).subscribe(() => {
        const key = this.storageKey();
        if (!key.endsWith(':')) {
          this.persistDraft(key);
        }
      });
    }
  }

  public openSendDrawer(): void {
    if (!this.canSend()) return;
    this.sendDrawerVisible.set(true);
  }

  public togglePreview(): void {
    this.mobilePreviewVisible.update((v) => !v);
  }

  public onSendComplete(): void {
    // Clear the compose surface + localStorage on a successful send.
    this.form.reset({ subject: '', bodyHtml: '' });
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.removeItem(this.storageKey());
      } catch {
        // Silently ignore storage errors (private browsing, quota).
      }
    }
  }

  private restoreDraft(key: string): void {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ComposeDraft;
      if (typeof parsed?.subject === 'string') {
        this.form.controls.subject.setValue(parsed.subject, { emitEvent: false });
      }
      if (typeof parsed?.bodyHtml === 'string') {
        this.form.controls.bodyHtml.setValue(parsed.bodyHtml, { emitEvent: false });
      }
    } catch {
      // Corrupt or unparseable; ignore.
    }
  }

  private persistDraft(key: string): void {
    try {
      const draft: ComposeDraft = {
        subject: this.form.controls.subject.value,
        bodyHtml: this.form.controls.bodyHtml.value,
      };
      // Skip writing an empty draft (avoids cluttering storage with empties).
      if (!draft.subject && !stripHtml(draft.bodyHtml).trim()) {
        localStorage.removeItem(key);
        return;
      }
      localStorage.setItem(key, JSON.stringify(draft));
    } catch {
      // Silently ignore storage errors.
    }
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
}
