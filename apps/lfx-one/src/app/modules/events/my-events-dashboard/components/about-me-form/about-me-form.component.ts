// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '@app/shared/services/user.service';
import { CheckboxComponent } from '@components/checkbox/checkbox.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { COUNTRIES } from '@lfx-one/shared/constants';
import { TravelFundAboutMe } from '@lfx-one/shared/interfaces';

const YES_NO_OPTIONS = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

@Component({
  selector: 'lfx-about-me-form',
  imports: [ReactiveFormsModule, InputTextComponent, SelectComponent, TextareaComponent, CheckboxComponent],
  templateUrl: './about-me-form.component.html',
  styleUrl: './about-me-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutMeFormComponent {
  private readonly userService = inject(UserService);
  private readonly fb = inject(NonNullableFormBuilder);

  public readonly formValidityChange = output<boolean>();
  public readonly formChange = output<TravelFundAboutMe>();

  public readonly form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: [''],
    citizenshipCountry: ['', Validators.required],
    profileLink: ['', Validators.required],
    company: ['', Validators.required],
    canReceiveFunds: ['', Validators.required],
    travelFromCountry: ['', Validators.required],
    openSourceInvolvement: ['', Validators.required],
    isLgbtqia: [false],
    isWoman: [false],
    isPersonWithDisability: [false],
    isDiversityOther: [false],
    preferNotToAnswer: [false],
    attendingForCompany: ['', Validators.required],
    willingToBlog: ['', Validators.required],
  });

  public readonly countryOptions = [...COUNTRIES];
  public readonly yesNoOptions = YES_NO_OPTIONS;

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

  private buildFormValue(): TravelFundAboutMe {
    const raw = this.form.getRawValue();
    return {
      firstName: raw.firstName,
      lastName: raw.lastName,
      email: raw.email,
      citizenshipCountry: raw.citizenshipCountry,
      profileLink: raw.profileLink,
      company: raw.company,
      canReceiveFunds: raw.canReceiveFunds,
      travelFromCountry: raw.travelFromCountry,
      openSourceInvolvement: raw.openSourceInvolvement,
      isLgbtqia: raw.isLgbtqia,
      isWoman: raw.isWoman,
      isPersonWithDisability: raw.isPersonWithDisability,
      isDiversityOther: raw.isDiversityOther,
      preferNotToAnswer: raw.preferNotToAnswer,
      attendingForCompany: raw.attendingForCompany,
      willingToBlog: raw.willingToBlog,
    };
  }
}
