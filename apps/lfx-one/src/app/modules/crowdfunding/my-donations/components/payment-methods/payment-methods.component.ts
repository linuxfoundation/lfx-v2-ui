// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AddPaymentCardResult, PaymentMethod } from '@lfx-one/shared/interfaces';
import { DialogService } from 'primeng/dynamicdialog';
import { AddPaymentCardDialogComponent } from '../add-payment-card-dialog/add-payment-card-dialog.component';
import { PaymentMethodCardComponent } from '../payment-method-card/payment-method-card.component';

@Component({
  selector: 'lfx-payment-methods',
  imports: [PaymentMethodCardComponent],
  providers: [DialogService],
  templateUrl: './payment-methods.component.html',
  styleUrl: './payment-methods.component.scss',
})
export class PaymentMethodsComponent {
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);

  public readonly methods = input.required<PaymentMethod[]>();
  public readonly removeCard = output<PaymentMethod>();
  public readonly cardAdded = output<PaymentMethod>();

  protected openAddCardDialog(): void {
    const ref = this.dialogService.open(AddPaymentCardDialogComponent, {
      header: 'Add Payment Card',
      width: '420px',
      modal: true,
      draggable: false,
      resizable: false,
      closeOnEscape: true,
    });

    if (!ref) {
      return;
    }

    ref.onClose.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((result: AddPaymentCardResult | undefined) => {
      if (result?.added && result.paymentMethod) {
        this.cardAdded.emit(result.paymentMethod);
      }
    });
  }
}
