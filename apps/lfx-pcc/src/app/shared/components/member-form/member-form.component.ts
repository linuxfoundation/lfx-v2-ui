// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@app/shared/components/button/button.component';
import { CalendarComponent } from '@app/shared/components/calendar/calendar.component';
import { DropdownComponent } from '@app/shared/components/dropdown/dropdown.component';
import { InputTextComponent } from '@app/shared/components/input-text/input-text.component';
import { CommitteeService } from '@app/shared/services/committee.service';
import { MEMBER_ROLES, VOTING_STATUSES } from '@lfx-pcc/shared/constants';
import { CommitteeMember } from '@lfx-pcc/shared/interfaces';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'lfx-member-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, DropdownComponent, InputTextComponent, CalendarComponent],
  templateUrl: './member-form.component.html',
  styleUrl: './member-form.component.scss',
})
export class MemberFormComponent {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  // Loading state for form submissions
  public submitting = signal<boolean>(false);

  // Create form group internally
  public form = signal<FormGroup>(this.createMemberFormGroup());
  public loading = signal<boolean>(false);

  public isEditing = computed(() => this.config.data?.isEditing || false);
  public memberId = computed(() => this.config.data?.memberId);
  public member = computed(() => this.config.data?.member);
  public committee = computed(() => this.config.data?.committee);

  // Member options
  public roleOptions = MEMBER_ROLES;
  public votingStatusOptions = VOTING_STATUSES;

  public constructor() {
    // Initialize form with data when component is created
    this.initializeForm();
  }

  public onCancel(): void {
    this.config.data?.onCancel?.();
    this.dialogRef.close();
  }

  public onSubmit(): void {
    if (this.form().valid) {
      this.submitting.set(true);
      const formValue = this.form().value;
      const committeeId = this.committee().id;

      if (!committeeId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Committee ID is required',
        });
        this.submitting.set(false);
        return;
      }

      // Prepare member data using form values directly, with date formatting overrides
      const memberData: Partial<CommitteeMember> = {
        ...formValue,
        // Override date fields to format them properly (convert Date objects to ISO date strings)
        role_start: formValue.role_start ? new Date(formValue.role_start).toISOString().split('T')[0] : undefined,
        role_end: formValue.role_end ? new Date(formValue.role_end).toISOString().split('T')[0] : undefined,
        voting_status_start: formValue.voting_status_start ? new Date(formValue.voting_status_start).toISOString().split('T')[0] : undefined,
        voting_status_end: formValue.voting_status_end ? new Date(formValue.voting_status_end).toISOString().split('T')[0] : undefined,
      };

      const operation = this.isEditing()
        ? this.committeeService.updateCommitteeMember(committeeId, this.memberId()!, memberData)
        : this.committeeService.createCommitteeMember(committeeId, memberData);

      operation.subscribe({
        next: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Member ${this.isEditing() ? 'updated' : 'created'} successfully`,
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.submitting.set(false);
          console.error('Failed to save member:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to ${this.isEditing() ? 'update' : 'create'} member`,
          });
        },
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.form().controls).forEach((key) => {
        this.form().get(key)?.markAsTouched();
      });
    }
  }

  private initializeForm(): void {
    if (this.isEditing() && this.member()) {
      const member = this.member()!;
      this.form().patchValue({
        first_name: member.first_name,
        last_name: member.last_name,
        email: member.email,
        job_title: member.job_title,
        organization: member.organization,
        organization_url: member.organization_url,
        role: member.role,
        voting_status: member.voting_status,
        appointed_by: member.appointed_by,
        role_start: member.role_start ? new Date(member.role_start) : null,
        role_end: member.role_end ? new Date(member.role_end) : null,
        voting_status_start: member.voting_status_start ? new Date(member.voting_status_start) : null,
        voting_status_end: member.voting_status_end ? new Date(member.voting_status_end) : null,
      });
    }
  }

  private createMemberFormGroup(): FormGroup {
    return new FormGroup({
      first_name: new FormControl('', [Validators.required]),
      last_name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required, Validators.email]),
      job_title: new FormControl(''),
      organization: new FormControl(''),
      organization_url: new FormControl('', [Validators.pattern('^https?://.+')]),
      role: new FormControl(''),
      voting_status: new FormControl(''),
      appointed_by: new FormControl(''),
      role_start: new FormControl(null),
      role_end: new FormControl(null),
      voting_status_start: new FormControl(null),
      voting_status_end: new FormControl(null),
    });
  }
}
