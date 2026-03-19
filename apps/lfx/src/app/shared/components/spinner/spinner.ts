// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, input } from '@angular/core';

@Component({
  selector: 'lfx-spinner',
  imports: [],
  templateUrl: './spinner.html',
  styleUrl: './spinner.css',
})
export class Spinner {
  public size = input<'sm' | 'md' | 'lg'>('md');
}
