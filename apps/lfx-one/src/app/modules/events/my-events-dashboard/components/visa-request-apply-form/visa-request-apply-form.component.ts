// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '@app/shared/services/user.service';
import { CalendarComponent } from '@components/calendar/calendar.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { COUNTRIES } from '@lfx-one/shared/constants';
import { VisaRequestApplicantInfo } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-visa-request-apply-form',
  imports: [ReactiveFormsModule, InputTextComponent, SelectComponent, TextareaComponent, CalendarComponent],
  templateUrl: './visa-request-apply-form.component.html',
  styleUrl: './visa-request-apply-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaRequestApplyFormComponent {
  private readonly userService = inject(UserService);
  private readonly fb = inject(NonNullableFormBuilder);

  public readonly formValidityChange = output<boolean>();
  public readonly formChange = output<VisaRequestApplicantInfo>();

  public readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [''],
    passportNumber: ['', Validators.required],
    citizenshipCountry: ['', Validators.required],
    passportExpiryDate: [null as Date | null, Validators.required],
    embassyCity: ['', Validators.required],
    company: [''],
    mailingAddress: ['', Validators.required],
  });

  public readonly countryOptions = [...COUNTRIES];

  public constructor() {
    this.form.get('email')?.disable();

    const user = this.userService.user();
    if (user) {
      this.form.patchValue({
        firstName: user.given_name ?? '',
        lastName: user.family_name ?? '',
        email: user.email ?? '',
      });
    }

    this.form.statusChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formValidityChange.emit(this.form.valid);
    });

    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.formChange.emit(this.buildFormValue());
    });
  }

  private buildFormValue(): VisaRequestApplicantInfo {
    const raw = this.form.getRawValue();
    return {
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      passportNumber: raw.passportNumber,
      citizenshipCountry: raw.citizenshipCountry,
      passportExpiryDate: raw.passportExpiryDate,
      embassyCity: raw.embassyCity,
      company: raw.company,
      mailingAddress: raw.mailingAddress,
    };
  }
}
