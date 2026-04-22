// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { distinctUntilChanged } from 'rxjs';

/**
 * Derive a signal from a typed `FormControl`.
 *
 * Mirrors the control's value reactively, seeded with its current value so the
 * signal is non-`undefined` from the first read. Useful for wiring select /
 * filter controls into `computed()` signals without manual `valueChanges`
 * subscriptions or `(valueChange)` handlers.
 */
export function signalFromControl<T>(control: FormControl<T>): Signal<T> {
  return toSignal(control.valueChanges.pipe(distinctUntilChanged()), { initialValue: control.value });
}
