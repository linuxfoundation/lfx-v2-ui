// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { INDUSTRY_OPTIONS, ORG_DESCRIPTION_MAX_LENGTH, SECTOR_OPTIONS } from '@lfx-one/shared/constants';
import type { OrgCanonicalRecord, OrgProfileEditableFields, OrgUpdateRequest } from '@lfx-one/shared/interfaces';
import { httpsUrlValidator } from '@lfx-one/shared/validators';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';

import { InitialsPipe } from '@pipes/initials.pipe';
import { OrgProfileService } from '@services/org-profile.service';
import { OpenIntercomDirective } from '@shared/directives/open-intercom.directive';

/** Spec 021 — Org Profile edit form (US2): reactive form with dirty-check + validation gate (FR-007), partial-update PUT (FR-008), `AccountContextService` propagation (FR-009), differentiated 403/502 toasts (FR-010). */
@Component({
  selector: 'lfx-org-profile-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    TextareaModule,
    ToastModule,
    TooltipModule,
    InitialsPipe,
    OpenIntercomDirective,
  ],
  providers: [MessageService],
  templateUrl: './org-profile-edit.component.html',
})
export class OrgProfileEditComponent implements OnInit {
  /** Emitted on successful save — parent applies the new record and exits edit mode. */
  @Output() public readonly saved = new EventEmitter<OrgCanonicalRecord>();

  /** Emitted on cancel — parent exits edit mode and discards changes. */
  @Output() public readonly cancelled = new EventEmitter<void>();

  /** Source record loaded on the read-only view; reused here to avoid re-fetching (research R4). */
  public readonly record = input.required<OrgCanonicalRecord>();

  protected form!: FormGroup;

  private readonly fb = inject(FormBuilder);
  private readonly orgProfileService = inject(OrgProfileService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly industryOptions = INDUSTRY_OPTIONS;
  protected readonly sectorOptions = SECTOR_OPTIONS;
  protected readonly descriptionMaxLength = ORG_DESCRIPTION_MAX_LENGTH;

  protected readonly saving = signal(false);

  /** Tracks whether any field differs from the original snapshot. Updated on each form value change. */
  protected readonly dirty = signal(false);
  protected readonly formValid = signal(true);

  /** Per-field touched-and-invalid flags — keep `form.get(...)` out of the template (CLAUDE.md "No functions in HTML templates"). */
  protected readonly descriptionInvalid = signal(false);
  protected readonly employeesInvalid = signal(false);
  protected readonly crunchbaseInvalid = signal(false);

  /** Disabled until the user changes a field AND all validation passes (FR-007). */
  protected readonly canSave = computed(() => this.dirty() && this.formValid() && !this.saving());

  private original!: OrgProfileEditableFields;

  public ngOnInit(): void {
    this.initForm();
  }

  protected onCancel(): void {
    if (this.saving()) return;
    this.cancelled.emit();
  }

  protected onSave(): void {
    if (!this.canSave()) return;

    const current = this.form.value as OrgProfileEditableFields;
    const payload = this.buildPartialPayload(current);
    if (Object.keys(payload).length === 0) {
      return;
    }

    this.saving.set(true);
    this.form.disable({ emitEvent: false });

    this.orgProfileService
      .updateOrg(this.record().uid, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.form.enable({ emitEvent: false });
          this.saved.emit(updated);
        },
        error: (error: unknown) => {
          this.saving.set(false);
          this.form.enable({ emitEvent: false });
          this.dirty.set(this.computeDirty(this.form.value as OrgProfileEditableFields));
          this.formValid.set(this.form.valid);
          this.messageService.add(this.toastForError(error));
        },
      });
  }

  protected onFieldBlur(field: 'description' | 'numberOfEmployees' | 'crunchBaseUrl'): void {
    this.form.get(field)?.markAsTouched();
    this.refreshFieldFlags();
  }

  private initForm(): void {
    this.original = this.snapshotFromRecord(this.record());
    this.form = this.fb.group({
      description: [this.original.description, [Validators.maxLength(this.descriptionMaxLength)]],
      website: [this.original.website],
      numberOfEmployees: [this.original.numberOfEmployees, [Validators.min(0)]],
      crunchBaseUrl: [this.original.crunchBaseUrl, [httpsUrlValidator()]],
      industry: [this.original.industry],
      sector: [this.original.sector],
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.dirty.set(this.computeDirty(value as OrgProfileEditableFields));
      this.formValid.set(this.form.valid);
    });

    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshFieldFlags());
  }

  /** FR-010 — differentiated error copy by upstream status. */
  private toastForError(error: unknown): { severity: string; summary: string; detail: string; life: number } {
    const status = error instanceof HttpErrorResponse ? error.status : 0;
    if (status === 403) {
      return {
        severity: 'error',
        summary: 'Permission denied',
        detail: 'You no longer have permission to edit this organization.',
        life: 5000,
      };
    }
    if (status === 502 || status === 504 || status === 0) {
      return {
        severity: 'error',
        summary: 'Save failed',
        detail: 'Unable to save changes. Please try again.',
        life: 5000,
      };
    }
    return {
      severity: 'error',
      summary: 'Save failed',
      detail: 'Something went wrong while saving. Please try again.',
      life: 5000,
    };
  }

  private refreshFieldFlags(): void {
    this.descriptionInvalid.set(this.isFieldInvalid('description'));
    this.employeesInvalid.set(this.isFieldInvalid('numberOfEmployees'));
    this.crunchbaseInvalid.set(this.isFieldInvalid('crunchBaseUrl'));
  }

  private isFieldInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!control && control.invalid && control.touched;
  }

  private snapshotFromRecord(record: OrgCanonicalRecord): OrgProfileEditableFields {
    return {
      description: record.description ?? '',
      website: record.website ?? '',
      numberOfEmployees: record.numberOfEmployees ?? null,
      crunchBaseUrl: record.crunchBaseUrl ?? '',
      industry: record.industry ?? '',
      sector: record.sector ?? '',
    };
  }

  private computeDirty(current: OrgProfileEditableFields): boolean {
    return (
      current.description !== this.original.description ||
      current.website !== this.original.website ||
      current.numberOfEmployees !== this.original.numberOfEmployees ||
      current.crunchBaseUrl !== this.original.crunchBaseUrl ||
      current.industry !== this.original.industry ||
      current.sector !== this.original.sector
    );
  }

  /** Build partial-update payload by including only changed fields; null/empty values pass through so users can clear upstream values. */
  private buildPartialPayload(current: OrgProfileEditableFields): OrgUpdateRequest {
    const payload: OrgUpdateRequest = {};
    if (current.description !== this.original.description) payload.description = current.description;
    if (current.website !== this.original.website) payload.website = current.website;
    if (current.numberOfEmployees !== this.original.numberOfEmployees) payload.numberOfEmployees = current.numberOfEmployees;
    if (current.crunchBaseUrl !== this.original.crunchBaseUrl) payload.crunchBaseUrl = current.crunchBaseUrl;
    if (current.industry !== this.original.industry) payload.industry = current.industry;
    if (current.sector !== this.original.sector) payload.sector = current.sector;
    return payload;
  }
}
