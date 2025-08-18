// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, ContentChild, input, output, TemplateRef } from '@angular/core';
import { StepperModule } from 'primeng/stepper';

@Component({
  selector: 'lfx-step',
  standalone: true,
  imports: [CommonModule, StepperModule],
  templateUrl: './step.component.html',
})
export class StepComponent {
  // Template references for content projection
  @ContentChild('content', { static: false, descendants: false }) public contentTemplate?: TemplateRef<any>;

  // Input signals for Step properties
  public readonly value = input<number>(0);
  public readonly disabled = input<boolean>(false);

  // Output signals for Step events
  public readonly valueChange = output<number>();

  // Event handlers
  protected handleValueChange(value: number): void {
    this.valueChange.emit(value);
  }
}
