// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { BoardSeat, CommitteeSeat, ReassignSeatBody } from '@lfx-one/shared/interfaces';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

import { MOCK_SAVE_LATENCY_MS } from './edit-key-contact-modal.component';

/** Basic email-format regex (matches spec 015 FR-017a). */
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface ReassignSubmitEvent {
  seatId: string;
  seatKind: 'board' | 'committee';
  body: ReassignSeatBody;
}

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

  protected readonly subtitle = computed(() => {
    const n = this.checkedCount();
    const m = this.checkedFoundationCount();
    const roleWord = n === 1 ? 'role' : 'roles';
    const foundationWord = m === 1 ? 'foundation' : 'foundations';
    return `${n} ${roleWord} across ${m} ${foundationWord}`;
  });

  protected readonly primaryButtonLabel = computed(() => {
    if (this.isSaving()) return 'Reassigning…';
    const n = this.checkedCount();
    const roleWord = n === 1 ? 'role' : 'roles';
    return `Save Changes (${n} ${roleWord})`;
  });

  protected readonly currentMember = computed(() => this.seat()?.person ?? null);

  protected readonly seatLabel = computed(() => {
    const s = this.seat();
    if (!s) return '';
    const fName = this.foundationName();
    if (this.seatKind() === 'board') {
      return `${fName} — ${(s as BoardSeat).seatName}`;
    }
    return `${fName} — ${(s as CommitteeSeat).committeeName}`;
  });

  protected readonly tagPillText = computed(() => {
    const s = this.seat();
    if (!s) return '';
    if (this.seatKind() === 'board') return (s as BoardSeat).tagLabel;
    return (s as CommitteeSeat).role;
  });

  protected readonly badgeLabel = computed(() => (this.seatKind() === 'board' ? 'Board' : 'Committee'));

  /** Save Changes button is enabled when all conditions hold (FR-008d). */
  protected readonly saveEnabled = computed(() => {
    if (this.isSaving()) return false;
    if (this.checkedCount() === 0) return false;
    const email = this.emailField().trim();
    if (!email || !EMAIL_REGEX.test(email)) return false;
    if (this.firstNameField().trim().length === 0) return false;
    if (this.lastNameField().trim().length === 0) return false;
    return true;
  });

  // === Injected ===
  private readonly destroyRef = inject(DestroyRef);

  /** Save timer handle so we can cancel on destroy (FR-008k). */
  private saveTimerId: ReturnType<typeof setTimeout> | null = null;

  public constructor() {
    // Reset form state every time the modal becomes visible.
    effect(() => {
      if (this.visible()) {
        this.emailField.set('');
        this.firstNameField.set('');
        this.lastNameField.set('');
        this.emailTouched.set(false);
        this.emailFormatError.set(null);
        this.duplicateError.set(null);
        this.roleChecked.set(true);
        this.isSaving.set(false);
      }
    });

    // Cancel pending save timer on destroy (FR-008k).
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
}
