// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { EnrollmentsState, IndividualEnrollment } from '@lfx-one/shared/interfaces';
import { deriveEnrollmentStatus, enrollmentStatusSeverity } from '@lfx-one/shared/utils';

import { environment } from '@environments/environment';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { EmptyStateComponent } from '@components/empty-state/empty-state.component';
import { TagComponent } from '@components/tag/tag.component';
import { EnrollmentService } from '@services/enrollment.service';

@Component({
  selector: 'lfx-profile-individual-enrollment',
  imports: [ButtonComponent, CardComponent, DatePipe, EmptyStateComponent, TagComponent],
  templateUrl: './profile-individual-enrollment.component.html',
  styleUrl: './profile-individual-enrollment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileIndividualEnrollmentComponent {
  private readonly enrollmentService = inject(EnrollmentService);

  private readonly _state: Signal<EnrollmentsState | undefined> = this.initState();

  protected readonly enrollments: Signal<IndividualEnrollment[] | null | undefined> = this.initEnrollments();
  protected readonly enrollmentError: Signal<string | null> = this.initEnrollmentError();

  protected readonly deriveStatus = deriveEnrollmentStatus;
  protected readonly statusSeverity = enrollmentStatusSeverity;

  protected enrollUrl(item: IndividualEnrollment, renew = false): string {
    const base = environment.urls.enrollment;
    return `${base}${item.ctaPath}${renew ? '&renew=true' : ''}`;
  }

  private initState(): Signal<EnrollmentsState | undefined> {
    return toSignal(this.enrollmentService.getEnrollments());
  }

  private initEnrollments(): Signal<IndividualEnrollment[] | null | undefined> {
    return computed(() => {
      const s = this._state();
      if (!s || s.kind === 'loading') return undefined;
      if (s.kind === 'error') return null;
      return s.items;
    });
  }

  private initEnrollmentError(): Signal<string | null> {
    return computed(() => {
      const s = this._state();
      return s?.kind === 'error' ? s.message : null;
    });
  }
}
