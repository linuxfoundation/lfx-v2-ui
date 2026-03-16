// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '@components/button/button.component';
import { CalendarComponent } from '@components/calendar/calendar.component';
import { SelectComponent } from '@components/select/select.component';
import { CommitteeMemberRole } from '@lfx-one/shared/enums';
import { Committee, CommitteeLeadership, CommitteeMember, CreateCommitteeMemberRequest, LeadershipRole } from '@lfx-one/shared/interfaces';
import { formatDateToISOString } from '@lfx-one/shared/utils';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { of, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-assign-leadership-dialog',
  imports: [ReactiveFormsModule, ButtonComponent, CalendarComponent, SelectComponent],
  templateUrl: './assign-leadership-dialog.component.html',
})
export class AssignLeadershipDialogComponent {
  private readonly config = inject(DynamicDialogConfig);
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  public readonly role: LeadershipRole;
  public readonly committee: Committee;
  public readonly members: CommitteeMember[];
  public readonly currentLeader: CommitteeLeadership | null;
  public readonly roleLabel: string;

  public form: FormGroup;

  public submitting = signal(false);
  public removing = signal(false);

  public readonly memberOptions: { label: string; value: string }[];

  public constructor() {
    this.role = this.config.data?.role ?? 'chair';
    this.committee = this.config.data?.committee;
    this.members = this.config.data?.members ?? [];
    this.currentLeader = this.config.data?.currentLeader ?? null;

    this.roleLabel = this.role === 'chair' ? 'Chair' : 'Co-Chair';

    this.form = new FormGroup({
      member_uid: new FormControl(this.currentLeader?.uid ?? null),
      elected_date: new FormControl(this.currentLeader?.elected_date ? new Date(this.currentLeader.elected_date) : null),
    });

    this.memberOptions = this.members.map((m) => ({
      label: `${m.first_name} ${m.last_name}${m.organization?.name ? ` — ${m.organization.name}` : ''}`,
      value: m.uid,
    }));
  }

  public onCancel(): void {
    this.dialogRef.close();
  }

  // TODO: Leadership assign + clear is two separate API calls. If the second fails,
  // two leaders can exist for the same seat. This needs a server-side atomic swap operation.
  public onSubmit(): void {
    const memberUid = this.form.value.member_uid;
    if (!memberUid) return;

    const selectedMember = this.members.find((m) => m.uid === memberUid);
    if (!selectedMember) return;

    this.submitting.set(true);

    const leadership: CommitteeLeadership = {
      uid: selectedMember.uid,
      first_name: selectedMember.first_name,
      last_name: selectedMember.last_name,
      email: selectedMember.email,
      elected_date: formatDateToISOString(this.form.value.elected_date) || undefined,
      organization: selectedMember.organization?.name,
    };

    const roleName = this.role === 'chair' ? CommitteeMemberRole.CHAIR : CommitteeMemberRole.VICE_CHAIR;
    const roleUpdate: Partial<CreateCommitteeMemberRequest> = {
      role: {
        name: roleName,
        start_date: formatDateToISOString(this.form.value.elected_date) || null,
      },
    };

    this.committeeService
      .updateCommitteeMember(this.committee.uid, memberUid, roleUpdate)
      .pipe(
        switchMap(() => {
          if (this.currentLeader && this.currentLeader.uid !== memberUid) {
            return this.committeeService.updateCommitteeMember(this.committee.uid, this.currentLeader.uid, {
              role: { name: CommitteeMemberRole.NONE },
            });
          }
          return of(null);
        })
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `${this.roleLabel} assigned successfully`,
          });
          this.dialogRef.close({ role: this.role, leadership });
        },
        error: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed to assign ${this.roleLabel.toLowerCase()}`,
          });
        },
      });
  }

  public onRemove(): void {
    if (!this.currentLeader) return;

    this.removing.set(true);

    this.committeeService.updateCommitteeMember(this.committee.uid, this.currentLeader.uid, { role: { name: CommitteeMemberRole.NONE } }).subscribe({
      next: () => {
        this.removing.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `${this.roleLabel} removed`,
        });
        this.dialogRef.close({ role: this.role, leadership: null });
      },
      error: () => {
        this.removing.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to remove ${this.roleLabel.toLowerCase()}`,
        });
      },
    });
  }
}
