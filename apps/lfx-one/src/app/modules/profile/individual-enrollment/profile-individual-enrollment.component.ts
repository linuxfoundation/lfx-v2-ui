// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { SlicePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IndividualEnrollment } from '@lfx-one/shared/interfaces';
import { deriveEnrollmentStatus, enrollmentStatusSeverity } from '@lfx-one/shared/utils';

import { environment } from '@environments/environment';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { TagComponent } from '@components/tag/tag.component';
import { EnrollmentService } from '@services/enrollment.service';

@Component({
  selector: 'lfx-profile-individual-enrollment',
  imports: [ButtonComponent, CardComponent, EmptyStateComponent, TagComponent, SlicePipe],
  templateUrl: './profile-individual-enrollment.component.html',
  styleUrl: './profile-individual-enrollment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileIndividualEnrollmentComponent {
  private readonly enrollmentService = inject(EnrollmentService);

  protected readonly enrollments: Signal<IndividualEnrollment[] | undefined> = this.initEnrollments();

  // Expose utilities to template
  protected readonly deriveStatus = deriveEnrollmentStatus;
  protected readonly statusSeverity = enrollmentStatusSeverity;

  protected enrollUrl(item: IndividualEnrollment, renew = false): string {
    const base = environment.urls.enrollment;
    return `${base}${item.ctaPath}${renew ? '&renew=true' : ''}`;
  }

  private initEnrollments(): Signal<IndividualEnrollment[] | undefined> {
    return toSignal(this.enrollmentService.getEnrollments());
  }
}
