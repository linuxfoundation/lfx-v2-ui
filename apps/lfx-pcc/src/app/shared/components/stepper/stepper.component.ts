// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { StepperModule } from 'primeng/stepper';

@Component({
  selector: 'lfx-stepper',
  standalone: true,
  imports: [CommonModule, StepperModule],
  templateUrl: './stepper.component.html',
})
export class StepperComponent {
  // Input signals for PrimeNG Stepper properties
  public readonly value = input<number | undefined>(undefined);
  public readonly linear = input<boolean>(false);
  public readonly transitionOptions = input<string>('400ms cubic-bezier(0.86, 0, 0.07, 1)');

  // Styling properties
  public readonly style = input<{ [key: string]: any } | null | undefined>(undefined);
  public readonly styleClass = input<string | undefined>(undefined);

  // Output signals for PrimeNG Stepper events
  public readonly valueChange = output<number>();

  // Public methods for programmatic control
  public updateValue(value: number): void {
    this.handleValueChange(value);
  }

  public isStepActive(value: number): boolean {
    return this.value() === value;
  }

  // Event handlers
  protected handleValueChange(value: number | undefined): void {
    if (value !== undefined) {
      this.valueChange.emit(value);
    }
  }
}
