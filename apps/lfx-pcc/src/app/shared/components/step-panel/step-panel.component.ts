// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, ContentChild, input, output, TemplateRef } from '@angular/core';
import { StepperModule } from 'primeng/stepper';

@Component({
  selector: 'lfx-step-panel',
  standalone: true,
  imports: [CommonModule, StepperModule],
  templateUrl: './step-panel.component.html',
})
export class StepPanelComponent {
  // Template references for content projection
  @ContentChild('contentTemplate', { static: false, descendants: false }) public contentTemplate?: TemplateRef<any>;

  // Input signals for StepPanel properties
  public readonly value = input<number>(0);

  // Output signals for StepPanel events
  public readonly valueChange = output<number>();

  // Event handlers
  protected handleValueChange(value: number): void {
    this.valueChange.emit(value);
  }
}
