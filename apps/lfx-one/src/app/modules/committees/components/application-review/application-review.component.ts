// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, effect, inject, input, output, signal, Signal } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { Committee, GroupJoinApplication } from '@lfx-one/shared/interfaces';
import { CommitteeService } from '@services/committee.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'lfx-application-review',
  imports: [DatePipe, UpperCasePipe, CardComponent, ButtonComponent],
  templateUrl: './application-review.component.html',
})
export class ApplicationReviewComponent {
  private readonly committeeService = inject(CommitteeService);
  private readonly messageService = inject(MessageService);

  // Inputs
  public committee = input.required<Committee | null>();

  // Outputs
  public readonly memberAdded = output<void>();

  // State
  public applications = signal<GroupJoinApplication[]>([]);
  public loading = signal<boolean>(true);
  public processingId = signal<string | null>(null);

  // Permissions — only writers can review applications
  public canReview: Signal<boolean> = computed(() => !!this.committee()?.writer);

  // Only show this section if the group uses the 'apply' join mode
  public isApplyMode: Signal<boolean> = computed(() => {
    return this.committee()?.join_mode === 'apply';
  });

  public pendingApplications: Signal<GroupJoinApplication[]> = computed(() => {
    return this.applications().filter((a) => a.status === 'pending');
  });

  public pendingCount: Signal<number> = computed(() => {
    return this.pendingApplications().length;
  });

  public constructor() {
    effect(() => {
      const c = this.committee();
      if (!c?.uid) {
        this.applications.set([]);
        this.loading.set(false);
        return;
      }
      if (c.join_mode !== 'apply') {
        this.applications.set([]);
        this.loading.set(false);
        return;
      }
      if (!c.writer) {
        this.applications.set([]);
        this.loading.set(false);
        return;
      }
      this.loadApplications(c.uid);
    });
  }

  public loadApplications(committeeUid: string): void {
    this.applications.set([]);
    this.loading.set(true);
    this.committeeService.getApplications(committeeUid).subscribe({
      next: (apps) => {
        if (this.committee()?.uid !== committeeUid) return;
        this.applications.set(apps);
        this.loading.set(false);
      },
      error: () => {
        if (this.committee()?.uid !== committeeUid) return;
        this.applications.set([]);
        this.loading.set(false);
      },
    });
  }

  public approve(application: GroupJoinApplication): void {
    const c = this.committee();
    if (!c?.uid) return;

    this.processingId.set(application.uid);

    this.committeeService.approveApplication(c.uid, application.uid).subscribe({
      next: () => {
        this.processingId.set(null);
        this.messageService.add({
          severity: 'success',
          summary: 'Application Approved',
          detail: `${application.applicant_name || application.applicant_email} has been added to the group.`,
        });
        // Remove from list
        this.applications.update((apps) => apps.filter((a) => a.uid !== application.uid));
        // Notify parent to refresh members
        this.memberAdded.emit();
      },
      error: () => {
        this.processingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to approve application. Please try again.',
        });
      },
    });
  }

  public reject(application: GroupJoinApplication): void {
    const c = this.committee();
    if (!c?.uid) return;

    this.processingId.set(application.uid);

    this.committeeService.rejectApplication(c.uid, application.uid).subscribe({
      next: () => {
        this.processingId.set(null);
        this.messageService.add({
          severity: 'info',
          summary: 'Application Declined',
          detail: `Request from ${application.applicant_name || application.applicant_email} has been declined.`,
        });
        // Remove from list
        this.applications.update((apps) => apps.filter((a) => a.uid !== application.uid));
      },
      error: () => {
        this.processingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to decline application. Please try again.',
        });
      },
    });
  }
}
