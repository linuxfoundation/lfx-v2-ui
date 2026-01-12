// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, input, Signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { map, of, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-selectable-card',
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './selectable-card.component.html',
})
export class SelectableCardComponent {
  /** The form group containing the control */
  public readonly form = input.required<FormGroup>();

  /** The control name within the form */
  public readonly control = input.required<string>();

  /** The value to set when selected (for radio-style behavior) */
  public readonly value = input<string>();

  /** Label text to display in the card */
  public readonly label = input.required<string>();

  /** Toggle mode - when true, clicking toggles a boolean control (checkbox-style) */
  public readonly toggle = input<boolean>(false);

  /** Custom style class for the card */
  public readonly styleClass = input<string>('');

  /** Test ID for the card */
  public readonly testId = input<string>('');

  /** Signal tracking the form control value reactively */
  private readonly controlValue: Signal<unknown> = this.initControlValue();

  /** Whether the card is currently selected */
  protected readonly isSelected = computed(() => {
    const targetValue = this.value();
    const isToggle = this.toggle();
    const currentValue = this.controlValue();

    if (isToggle) {
      return currentValue === true;
    }
    return currentValue === targetValue;
  });

  /** Whether the card is disabled */
  protected readonly isDisabled = computed(() => {
    const formGroup = this.form();
    const controlName = this.control();
    return formGroup.get(controlName)?.disabled ?? false;
  });

  /** Handle card click - sets or toggles the form control value */
  protected onCardClick(): void {
    if (this.isDisabled()) return;

    const formGroup = this.form();
    const controlName = this.control();
    const targetValue = this.value();
    const isToggle = this.toggle();
    const formControl = formGroup.get(controlName);

    if (!formControl) return;

    if (isToggle) {
      formControl.setValue(!formControl.value);
    } else if (targetValue !== undefined) {
      formControl.setValue(targetValue);
    }
  }

  /** Handle keyboard accessibility */
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.isDisabled() && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.onCardClick();
    }
  }

  /** Initialize control value signal reactively from form control */
  private initControlValue(): Signal<unknown> {
    const formControl$ = toObservable(computed(() => this.form().get(this.control())));

    return toSignal(
      formControl$.pipe(
        switchMap((formControl) => {
          if (!formControl) {
            return of(null);
          }
          return formControl.valueChanges.pipe(
            startWith(formControl.value),
            map((value) => value)
          );
        })
      ),
      { initialValue: null }
    );
  }
}
