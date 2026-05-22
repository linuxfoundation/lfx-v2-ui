// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, inject, input, model, output, signal, type Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMAIL_REGEX, MOCK_SAVE_LATENCY_MS } from '@lfx-one/shared/constants';
import type { BoardSeat, CommitteeSeat, ReassignSubmitEvent } from '@lfx-one/shared/interfaces';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { filter } from 'rxjs';

@Component({
  selector: 'lfx-reassign-board-roles-modal',
  standalone: true,
  imports: [FormsModule, DialogModule, InputTextModule, CheckboxModule, TooltipModule],
  templateUrl: './reassign-board-roles-modal.component.html',
})
export class ReassignBoardRolesModalComponent {
  // === Two-way bound visibility ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly seat = input<BoardSeat | CommitteeSeat | null>(null);
  public readonly seatKind = input<'board' | 'committee'>('board');
  public readonly foundationName = input<string>('');

  // === Outputs ===
  public readonly reassignSubmit = output<ReassignSubmitEvent>();
  public readonly modalHide = output<void>();

  // === Internal state ===
  protected readonly isSaving = signal(false);
  protected readonly roleChecked = signal(true);
  protected readonly emailField = signal('');
  protected readonly firstNameField = signal('');
  protected readonly lastNameField = signal('');
  protected readonly emailTouched = signal(false);
  protected readonly emailFormatError = signal<string | null>(null);
  protected readonly duplicateError = signal<string | null>(null);

  // === Derived signals (computed) ===
  protected readonly checkedCount = computed(() => (this.roleChecked() ? 1 : 0));
  protected readonly checkedFoundationCount = computed(() => (this.roleChecked() ? 1 : 0));

  protected readonly subtitle: Signal<string> = computed(() => this.initSubtitle());
  protected readonly primaryButtonLabel: Signal<string> = computed(() => this.initPrimaryButtonLabel());
  protected readonly currentMember = computed(() => this.seat()?.person ?? null);
  protected readonly seatLabel: Signal<string> = computed(() => this.initSeatLabel());
  protected readonly tagPillText: Signal<string> = computed(() => this.initTagPillText());
  protected readonly badgeLabel = computed(() => (this.seatKind() === 'board' ? 'Board' : 'Committee'));

  /** Save Changes button is enabled when all conditions hold (FR-008d). */
  protected readonly saveEnabled: Signal<boolean> = computed(() => this.initSaveEnabled());

  // === Injected ===
  private readonly destroyRef = inject(DestroyRef);

  /** Save timer handle so we can cancel on destroy (FR-008k). */
  private saveTimerId: ReturnType<typeof setTimeout> | null = null;

  public constructor() {
    toObservable(this.visible)
      .pipe(filter(Boolean), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.emailField.set('');
        this.firstNameField.set('');
        this.lastNameField.set('');
        this.emailTouched.set(false);
        this.emailFormatError.set(null);
        this.duplicateError.set(null);
        this.roleChecked.set(true);
        this.isSaving.set(false);
      });

    this.destroyRef.onDestroy(() => {
      if (this.saveTimerId !== null) {
        clearTimeout(this.saveTimerId);
        this.saveTimerId = null;
      }
    });
  }

  // === Event handlers ===
  protected onEmailBlur(): void {
    this.emailTouched.set(true);
    const email = this.emailField().trim();
    if (email && !EMAIL_REGEX.test(email)) {
      this.emailFormatError.set('Enter a valid email address');
    } else {
      this.emailFormatError.set(null);
    }
    this.duplicateError.set(null);
  }

  protected toggleSelectAll(): void {
    this.roleChecked.update((v) => !v);
  }

  protected toggleRoleRow(): void {
    this.roleChecked.update((v) => !v);
  }

  /** Triggered by primary button click OR Enter key inside form inputs. */
  protected onSave(): void {
    if (!this.saveEnabled()) return;

    const enteredEmail = this.emailField().trim().toLowerCase();
    const currentEmail = this.currentMember()?.email?.toLowerCase() ?? '';
    if (enteredEmail === currentEmail) {
      this.duplicateError.set('This person already holds the selected role(s).');
      return;
    }

    this.isSaving.set(true);
    this.saveTimerId = setTimeout(() => {
      this.saveTimerId = null;
      const seat = this.seat();
      if (!seat) {
        this.isSaving.set(false);
        return;
      }
      this.reassignSubmit.emit({
        seatId: seat.seatId,
        seatKind: this.seatKind(),
        body: {
          firstName: this.firstNameField().trim(),
          lastName: this.lastNameField().trim(),
          email: this.emailField().trim(),
        },
      });
      this.isSaving.set(false);
      this.visible.set(false);
      this.modalHide.emit();
    }, MOCK_SAVE_LATENCY_MS);
  }

  /** Handle Enter key inside any text input — fire Save Changes when enabled (FR-017b). */
  protected onFormKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.saveEnabled()) {
      event.preventDefault();
      this.onSave();
    }
  }

  protected onCancel(): void {
    if (this.isSaving()) return;
    this.visible.set(false);
    this.modalHide.emit();
  }

  protected onHide(): void {
    if (!this.isSaving()) {
      this.modalHide.emit();
    }
  }

  // === Private helpers for computed signals ===
  private initSubtitle(): string {
    const n = this.checkedCount();
    const m = this.checkedFoundationCount();
    const roleWord = n === 1 ? 'role' : 'roles';
    const foundationWord = m === 1 ? 'foundation' : 'foundations';
    return `${n} ${roleWord} across ${m} ${foundationWord}`;
  }

  private initPrimaryButtonLabel(): string {
    if (this.isSaving()) return 'Reassigning…';
    const n = this.checkedCount();
    const roleWord = n === 1 ? 'role' : 'roles';
    return `Save Changes (${n} ${roleWord})`;
  }

  private initSeatLabel(): string {
    const s = this.seat();
    if (!s) return '';
    const fName = this.foundationName();
    if (this.seatKind() === 'board') {
      return `${fName} — ${(s as BoardSeat).seatName}`;
    }
    return `${fName} — ${(s as CommitteeSeat).committeeName}`;
  }

  private initTagPillText(): string {
    const s = this.seat();
    if (!s) return '';
    if (this.seatKind() === 'board') return (s as BoardSeat).tagLabel;
    return (s as CommitteeSeat).role;
  }

  private initSaveEnabled(): boolean {
    if (this.isSaving()) return false;
    if (this.checkedCount() === 0) return false;
    const email = this.emailField().trim();
    if (!email || !EMAIL_REGEX.test(email)) return false;
    if (this.firstNameField().trim().length === 0) return false;
    if (this.lastNameField().trim().length === 0) return false;
    return true;
  }
}
