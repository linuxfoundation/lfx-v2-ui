// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, Signal } from '@angular/core';
import { Certification, TrainingEnrollment } from '@lfx-one/shared/interfaces';
import { CONTINUE_LEARNING_URL } from '@lfx-one/shared/constants';

import { ButtonComponent } from '@components/button/button.component';

@Component({
  selector: 'lfx-training-card',
  imports: [ButtonComponent, DatePipe],
  templateUrl: './training-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingCardComponent {
  // ─── Inputs ────────────────────────────────────────────────────────────────
  public readonly training = input.required<TrainingEnrollment | Certification>();
  public readonly variant = input<'ongoing' | 'completed'>('ongoing');

  // ─── Public constants (used in template) ───────────────────────────────────
  protected readonly continueLearningUrl = CONTINUE_LEARNING_URL;

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly hasImage: Signal<boolean> = this.initHasImage();
  protected readonly isOngoing: Signal<boolean> = this.initIsOngoing();
  protected readonly date: Signal<string> = this.initDate();
  protected readonly dateLabel: Signal<string> = this.initDateLabel();
  protected readonly levelClasses: Signal<string> = this.initLevelClasses();
  protected readonly downloadUrl: Signal<string | null> = this.initDownloadUrl();

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initHasImage(): Signal<boolean> {
    return computed(() => !!this.training().imageUrl);
  }

  private initIsOngoing(): Signal<boolean> {
    return computed(() => this.variant() === 'ongoing');
  }

  private initDate(): Signal<string> {
    return computed(() => {
      const t = this.training();
      // variant='ongoing' → caller passes TrainingEnrollment; variant='completed' → Certification
      if (this.variant() === 'ongoing') {
        return (t as TrainingEnrollment).enrolledDate ?? '';
      }
      return (t as Certification).issuedDate ?? '';
    });
  }

  private initDateLabel(): Signal<string> {
    return computed(() => (this.variant() === 'ongoing' ? 'Enrolled' : 'Completed'));
  }

  private initLevelClasses(): Signal<string> {
    return computed(() => {
      const level = this.training().level;
      if (level === 'Beginner') return 'bg-blue-50 text-blue-700 border border-blue-200';
      if (level === 'Intermediate') return 'bg-purple-50 text-purple-700 border border-purple-200';
      if (level === 'Advanced') return 'bg-orange-50 text-orange-700 border border-orange-200';
      return 'bg-gray-50 text-gray-500 border border-gray-200';
    });
  }

  private initDownloadUrl(): Signal<string | null> {
    return computed(() => {
      if (this.variant() !== 'completed') return null;
      const t = this.training() as Certification;
      return t.downloadUrl ?? null;
    });
  }
}
