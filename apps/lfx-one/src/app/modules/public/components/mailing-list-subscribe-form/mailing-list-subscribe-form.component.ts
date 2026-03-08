// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { ButtonComponent } from '@components/button/button.component';

import { PublicMailingListService } from '../../../../shared/services/public-mailing-list.service';

@Component({
  selector: 'lfx-mailing-list-subscribe-form',
  imports: [ReactiveFormsModule, ButtonComponent],
  templateUrl: './mailing-list-subscribe-form.component.html',
})
export class MailingListSubscribeFormComponent {
  private readonly publicMailingListService = inject(PublicMailingListService);

  public readonly mailingListId = input.required<string>();
  public readonly mailingListTitle = input<string>('');
  public readonly compact = input<boolean>(true);

  public form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    first_name: new FormControl(''),
    last_name: new FormControl(''),
  });

  public loading = signal(false);
  public submitted = signal(false);
  public successMessage = signal('');
  public errorMessage = signal('');

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    const email = this.form.value.email?.trim() || '';
    const firstName = this.form.value.first_name?.trim() || undefined;
    const lastName = this.form.value.last_name?.trim() || undefined;

    this.publicMailingListService
      .subscribe(this.mailingListId(), {
        email,
        first_name: firstName,
        last_name: lastName,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.submitted.set(true);
          this.successMessage.set(response.message);
        },
        error: (err) => {
          this.loading.set(false);
          const message = err?.error?.message || 'Something went wrong. Please try again later.';
          this.errorMessage.set(message);
        },
      });
  }
}
