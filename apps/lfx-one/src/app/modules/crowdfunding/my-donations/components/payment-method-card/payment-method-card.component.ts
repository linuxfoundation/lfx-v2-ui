// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, input, output, signal } from '@angular/core';
import { PaymentMethod } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-payment-method-card',
  imports: [],
  templateUrl: './payment-method-card.component.html',
  styleUrl: './payment-method-card.component.scss',
})
export class PaymentMethodCardComponent {
  public readonly method = input.required<PaymentMethod>();
  public readonly remove = output<void>();

  protected readonly revealed = signal(false);

  protected toggleReveal(): void {
    this.revealed.update((v) => !v);
  }
}
