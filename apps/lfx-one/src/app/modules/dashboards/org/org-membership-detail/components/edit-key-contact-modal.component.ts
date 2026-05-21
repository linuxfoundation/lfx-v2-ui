// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, computed, DestroyRef, effect, inject, input, model, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { OrgMembershipKeyContact, OrgMembershipKeyContactPerson, OrgMembershipKeyContactType } from '@lfx-one/shared/interfaces';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';

/** FR-018b — single tunable constant for the simulated save latency window. */
export const MOCK_SAVE_LATENCY_MS = 400;

/** FR-017a — basic email-format regex used on blur and at submit. */
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export interface EditKeyContactSubmitEvent {
  contactType: OrgMembershipKeyContactType;
  contactTypeLabel: string;
  /** Only populated for the Replace flow (single-contact); null for Add */
  editingPersonId: string | null;
  person: OrgMembershipKeyContactPerson;
}

export interface EditKeyContactRemoveEvent {
  contactType: OrgMembershipKeyContactType;
  contactTypeLabel: string;
  personId: string;
}

type ModalKind = 'closed' | 'replace-form' | 'chooser' | 'add-form' | 'remove-list' | 'single-add-form';

@Component({
  selector: 'lfx-edit-key-contact-modal',
  standalone: true,
  imports: [NgTemplateOutlet, FormsModule, DialogModule, InputTextModule, TooltipModule],
  templateUrl: './edit-key-contact-modal.component.html',
})
export class EditKeyContactModalComponent {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Save timer handle so we can cancel on destroy. */
  private saveTimerId: ReturnType<typeof setTimeout> | null = null;

  // === Two-way bound visibility ===
  public readonly visible = model<boolean>(false);

  // === Inputs ===
  public readonly contact = input<OrgMembershipKeyContact | null>(null);
  public readonly foundationName = input<string>('');
  /** Person being replaced in the single-contact Replace flow. Null for Add-only flows. */
  public readonly editingPersonId = input<string | null>(null);

  // === Outputs ===
  public readonly replaceSubmit = output<EditKeyContactSubmitEvent>();
  public readonly addSubmit = output<EditKeyContactSubmitEvent>();
  public readonly removeSubmit = output<EditKeyContactRemoveEvent>();
  public readonly modalHide = output<void>();

  // === Internal state ===
  protected readonly modalKind = signal<ModalKind>('closed');
  protected readonly isSaving = signal(false);
  protected readonly previousFocus = signal<HTMLElement | null>(null);

  // Form fields
  protected readonly emailField = signal('');
  protected readonly firstNameField = signal('');
  protected readonly lastNameField = signal('');
  protected readonly emailTouched = signal(false);
  protected readonly emailFormatError = signal<string | null>(null);
  protected readonly duplicateError = signal<string | null>(null);

  // Remove-flow state
  protected readonly selectedRemoveId = signal<string | null>(null);

  protected readonly contactTypeLabel = computed(() => this.contact()?.contactTypeLabel ?? '');
  protected readonly minContacts = computed(() => this.contact()?.minContacts ?? 0);
  protected readonly maxContacts = computed(() => this.contact()?.maxContacts ?? 0);
  protected readonly people = computed(() => this.contact()?.people ?? []);
  protected readonly currentPerson = computed<OrgMembershipKeyContactPerson | null>(() => {
    const editingId = this.editingPersonId();
    if (!editingId) return null;
    return this.people().find((p) => p.personId === editingId) ?? null;
  });

  protected readonly canAdd = computed(() => this.people().length < this.maxContacts());
  protected readonly canRemove = computed(() => this.people().length > 0 && this.people().length > this.minContacts());

  protected readonly addCardTooltip = computed(() => (!this.canAdd() ? 'Maximum contacts reached' : ''));
  protected readonly removeCardTooltip = computed(() => {
    if (this.people().length === 0) return 'No contacts to remove';
    if (!this.canRemove()) return 'At least one contact required';
    return '';
  });

  protected readonly addCardLabel = computed(() => (this.people().length === 0 ? `Add ${this.contactTypeLabel()}` : 'Add Another Contact'));

  protected readonly infoBannerText = computed(() => {
    const min = this.minContacts();
    const max = this.maxContacts();
    if (min === 1 && max === 1) {
      return 'Your organization must have one key contact of this type.';
    }
    if (min >= 1 && max > 1) {
      return `Your organization must have at least ${min}, and can have up to ${max} contacts of this type.`;
    }
    if (min === 0 && max > 1) {
      return `Your organization can have up to ${max} contacts of this type.`;
    }
    return '';
  });

  protected readonly primaryButtonLabel = computed(() => {
    const kind = this.modalKind();
    const saving = this.isSaving();
    if (kind === 'remove-list') return saving ? 'Removing…' : 'Remove Contact';
    return saving ? 'Saving…' : 'Save Changes';
  });

  protected readonly primaryButtonStyleClass = computed(() => {
    const kind = this.modalKind();
    return kind === 'remove-list' ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' : 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600';
  });

  protected readonly canSubmit = computed(() => {
    if (this.isSaving()) return false;
    const kind = this.modalKind();
    if (kind === 'remove-list') return this.selectedRemoveId() !== null;
    if (kind === 'replace-form' || kind === 'add-form' || kind === 'single-add-form') {
      return (
        this.emailField().trim().length > 0 &&
        this.firstNameField().trim().length > 0 &&
        this.lastNameField().trim().length > 0 &&
        !this.emailFormatError() &&
        !this.duplicateError() &&
        EMAIL_REGEX.test(this.emailField().trim())
      );
    }
    return false;
  });

  public constructor() {
    // When visibility flips on, decide which sub-flow to open based on the contact's shape
    effect(() => {
      if (this.visible()) {
        const c = this.contact();
        if (!c) return;
        this.resetFormState();
        const initial = this.decideInitialKind(c);
        this.modalKind.set(initial);
      } else {
        this.modalKind.set('closed');
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.saveTimerId !== null) {
        clearTimeout(this.saveTimerId);
        this.saveTimerId = null;
      }
    });
  }

  protected resetFormState(): void {
    this.emailField.set('');
    this.firstNameField.set('');
    this.lastNameField.set('');
    this.emailTouched.set(false);
    this.emailFormatError.set(null);
    this.duplicateError.set(null);
    this.selectedRemoveId.set(null);
    this.isSaving.set(false);
  }

  // === Chooser interactions (FR-016a / FR-016e live toggle) ===
  protected selectAddCard(): void {
    if (!this.canAdd() || this.isSaving()) return;
    // Live toggle (FR-016e) — discard remove selection if switching from remove-list
    this.selectedRemoveId.set(null);
    this.modalKind.set('add-form');
    setTimeout(() => this.focusInitialElement(), 0);
  }

  protected selectRemoveCard(): void {
    if (!this.canRemove() || this.isSaving()) return;
    // Live toggle (FR-016e) — discard form input if switching from add-form
    this.resetFormState();
    this.modalKind.set('remove-list');
    setTimeout(() => this.focusInitialElement(), 0);
  }

  protected selectRemoveCandidate(personId: string): void {
    if (this.isSaving()) return;
    this.selectedRemoveId.set(personId);
  }

  // === Field validation (FR-017a — on blur) ===
  protected onEmailBlur(): void {
    this.emailTouched.set(true);
    this.duplicateError.set(null); // user is editing → clear any previous duplicate error
    const value = this.emailField().trim();
    if (value && !EMAIL_REGEX.test(value)) {
      this.emailFormatError.set('Enter a valid email address');
    } else {
      this.emailFormatError.set(null);
    }
  }

  protected onEmailChange(value: string): void {
    this.emailField.set(value);
    if (this.duplicateError()) {
      this.duplicateError.set(null);
    }
    if (this.emailFormatError() && EMAIL_REGEX.test(value.trim())) {
      this.emailFormatError.set(null);
    }
  }

  // === Submit handlers ===
  protected onSaveClick(): void {
    if (!this.canSubmit()) return;
    // FR-016f — in-row duplicate check (excludes the person being replaced in Replace flow)
    const enteredEmail = this.emailField().trim().toLowerCase();
    const editingId = this.modalKind() === 'replace-form' ? this.editingPersonId() : null;
    const duplicate = this.people().some((p) => p.personId !== editingId && p.email.trim().toLowerCase() === enteredEmail);
    if (duplicate) {
      this.duplicateError.set(`This person is already a ${this.contactTypeLabel()}.`);
      return;
    }

    const kind = this.modalKind();
    const newPerson: OrgMembershipKeyContactPerson = {
      personId: `temp-${this.generateUuid()}`,
      firstName: this.firstNameField().trim(),
      lastName: this.lastNameField().trim(),
      fullName: `${this.firstNameField().trim()} ${this.lastNameField().trim()}`,
      email: this.emailField().trim(),
      jobTitle: null,
      initials: this.deriveInitials(this.firstNameField().trim(), this.lastNameField().trim()),
    };

    this.simulateSave(() => {
      const contact = this.contact();
      if (!contact) return;
      if (kind === 'replace-form') {
        this.replaceSubmit.emit({
          contactType: contact.contactType,
          contactTypeLabel: contact.contactTypeLabel,
          editingPersonId: this.editingPersonId(),
          person: newPerson,
        });
      } else {
        // add-form or single-add-form
        this.addSubmit.emit({
          contactType: contact.contactType,
          contactTypeLabel: contact.contactTypeLabel,
          editingPersonId: null,
          person: newPerson,
        });
      }
      this.closeModal();
    });
  }

  protected onRemoveClick(): void {
    if (!this.canSubmit()) return;
    const contact = this.contact();
    const personId = this.selectedRemoveId();
    if (!contact || !personId) return;

    this.simulateSave(() => {
      this.removeSubmit.emit({
        contactType: contact.contactType,
        contactTypeLabel: contact.contactTypeLabel,
        personId,
      });
      this.closeModal();
    });
  }

  protected onCancelClick(): void {
    if (this.isSaving()) return;
    this.closeModal();
  }

  // === A11y — FR-035 focus management ===
  protected onModalShow(): void {
    const active = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    this.previousFocus.set(active);
    setTimeout(() => this.focusInitialElement(), 0);
  }

  protected onModalHideEvent(): void {
    const prev = this.previousFocus();
    if (prev && typeof prev.focus === 'function') {
      setTimeout(() => prev.focus(), 0);
    }
    this.modalHide.emit();
  }

  // === Keyboard activation handlers (FR-035) ===
  protected onChooserKeydown(event: KeyboardEvent, kind: 'add' | 'remove'): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (kind === 'add') this.selectAddCard();
    else this.selectRemoveCard();
  }

  protected onRemoveCandidateKeydown(event: KeyboardEvent, personId: string): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.selectRemoveCandidate(personId);
  }

  protected onFormEnter(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.onSaveClick();
  }

  // === Private helpers ===

  private simulateSave(then: () => void): void {
    this.isSaving.set(true);
    this.saveTimerId = setTimeout(() => {
      this.saveTimerId = null;
      try {
        then();
      } finally {
        this.isSaving.set(false);
      }
    }, MOCK_SAVE_LATENCY_MS);
  }

  private closeModal(): void {
    this.visible.set(false);
    this.modalHide.emit();
  }

  private focusInitialElement(): void {
    if (typeof document === 'undefined') return;
    const kind = this.modalKind();
    let selector = '';
    if (kind === 'replace-form' || kind === 'add-form' || kind === 'single-add-form') {
      selector = '[data-testid="edit-key-contact-email-input"]';
    } else if (kind === 'chooser') {
      selector = '[data-testid="edit-key-contact-chooser-add"]:not([disabled])';
    } else if (kind === 'remove-list') {
      selector = '[data-testid^="edit-key-contact-remove-candidate-"]';
    }
    if (!selector) return;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (el && typeof el.focus === 'function') {
      el.focus();
    }
    this.cdr.markForCheck();
  }

  private decideInitialKind(contact: OrgMembershipKeyContact): ModalKind {
    if (contact.maxContacts === 1) {
      if (contact.people.length === 0) return 'single-add-form';
      return 'replace-form';
    }
    return 'chooser';
  }

  private deriveInitials(firstName: string, lastName: string): string {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  private generateUuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID (older Node SSR contexts)
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}
