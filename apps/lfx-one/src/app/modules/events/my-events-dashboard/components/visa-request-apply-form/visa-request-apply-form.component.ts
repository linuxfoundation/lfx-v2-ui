// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject, output, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EventsService } from '@app/shared/services/events.service';
import { UserService } from '@app/shared/services/user.service';
import { AutocompleteComponent } from '@components/autocomplete/autocomplete.component';
import { CalendarComponent } from '@components/calendar/calendar.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { SelectComponent } from '@components/select/select.component';
import { TextareaComponent } from '@components/textarea/textarea.component';
import { ACCOMMODATION_PAID_BY_OPTIONS, ATTENDEE_TYPE_OPTIONS, COUNTRIES } from '@lfx-one/shared/constants';
import { AttendeeAccommodationPaidBy, AttendeeType, OrgSearchResult, VisaRequestApplicantInfo } from '@lfx-one/shared/interfaces';
import { MessageService } from 'primeng/api';
import { AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { catchError, debounceTime, map, of, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-visa-request-apply-form',
  imports: [ReactiveFormsModule, InputTextComponent, SelectComponent, TextareaComponent, CalendarComponent, AutocompleteComponent],
  templateUrl: './visa-request-apply-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaRequestApplyFormComponent {
  private readonly userService = inject(UserService);
  private readonly eventsService = inject(EventsService);
  private readonly messageService = inject(MessageService);
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
    birthDate: [null as Date | null, Validators.required],
    embassyCity: ['', Validators.required],
    company: ['', Validators.required],
    organizationID: ['', Validators.required],
    mailingAddress: ['', Validators.required],
    attendeeType: ['' as AttendeeType, Validators.required],
    attendeeAccommodationPaidBy: ['' as AttendeeAccommodationPaidBy, Validators.required],
  });

  /** Separate form used only for the autocomplete binding — keeps the main form controls clean */
  public readonly orgForm = new FormGroup({ company: new FormControl<OrgSearchResult | null>(null) });

  public readonly countryOptions = [...COUNTRIES];
  public readonly attendeeTypeOptions = ATTENDEE_TYPE_OPTIONS;
  public readonly accommodationOptions = ACCOMMODATION_PAID_BY_OPTIONS;

  protected readonly orgSearchQuery = signal('');
  protected readonly orgSuggestions: Signal<OrgSearchResult[]> = this.initOrgSuggestions();

  protected readonly isCompanyInvalid = computed(
    () => this.form.get('company')?.invalid && (this.form.get('company')?.touched || this.orgForm.get('company')?.touched || this.orgForm.get('company')?.dirty)
  );

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

    this.form.statusChanges.pipe(startWith(this.form.status), takeUntilDestroyed()).subscribe(() => {
      this.formValidityChange.emit(this.form.valid && !this.isCompanyInvalid());
    });

    this.form.valueChanges.pipe(startWith(this.form.getRawValue()), takeUntilDestroyed()).subscribe(() => {
      this.formChange.emit(this.buildFormValue());
    });
  }

  public onOrgSearch(event: AutoCompleteCompleteEvent): void {
    this.orgSearchQuery.set(event.query.trim());
  }

  public onOrgSelect(event: AutoCompleteSelectEvent): void {
    const org = event.value as OrgSearchResult;
    this.form.patchValue({ company: org.name, organizationID: org.id });
  }

  public onOrgClear(): void {
    this.form.patchValue({ company: '', organizationID: '' });
    this.orgSearchQuery.set('');
  }

  public onOrgBlur(): void {
    const orgValue = this.orgForm.get('company')?.value;
    if (!orgValue) {
      this.form.patchValue({ company: '', organizationID: '' });
      this.form.get('company')?.markAsTouched();
    }
  }

  private initOrgSuggestions(): Signal<OrgSearchResult[]> {
    return toSignal(
      toObservable(this.orgSearchQuery).pipe(
        debounceTime(400),
        switchMap((query) => {
          if (!query) {
            return of([]);
          }
          return this.eventsService.searchOrganizations(query).pipe(
            map((response) => response.data),
            catchError(() => {
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to search organizations. Please try again.',
              });
              return of([]);
            })
          );
        })
      ),
      { initialValue: [] }
    );
  }

  private buildFormValue(): VisaRequestApplicantInfo {
    return this.form.getRawValue() as VisaRequestApplicantInfo;
  }
}
