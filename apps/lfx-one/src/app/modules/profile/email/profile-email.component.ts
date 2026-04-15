// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { NgClass } from '@angular/common';
import { Component, computed, inject, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BadgeComponent } from '@components/badge/badge.component';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { InputTextComponent } from '@components/input-text/input-text.component';
import { MessageComponent } from '@components/message/message.component';
import { EmailManagementData, UserEmail } from '@lfx-one/shared/interfaces';
import { UserService } from '@services/user.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BehaviorSubject, catchError, finalize, of, switchMap } from 'rxjs';

@Component({
  selector: 'lfx-profile-email',
  imports: [
    NgClass,
    ReactiveFormsModule,
    CardComponent,
    InputTextComponent,
    MessageComponent,
    ButtonComponent,
    BadgeComponent,
    ConfirmDialogModule,
    ToastModule,
    TooltipModule,
  ],
  templateUrl: './profile-email.component.html',
})
export class ProfileEmailComponent {
  private readonly userService = inject(UserService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  // Refresh mechanism
  private refresh = new BehaviorSubject<void>(undefined);

  // OTP flow state
  public otpStep = signal(false);
  public pendingEmail = signal('');
  public sendingCode = signal(false);
  public verifyingOtp = signal(false);

  // Forms
  public addEmailForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  public otpForm = new FormGroup({
    otp: new FormControl('', [Validators.required, Validators.minLength(6)]),
  });

  // State signals
  public loading = signal(false);

  // Data signals
  public emailData: Signal<EmailManagementData | null> = this.initializeEmailData();

  public allEmails = computed((): UserEmail[] => {
    const data = this.emailData();
    if (!data) return [];
    const primary: UserEmail = { email: data.primary_email, verified: true };
    const alternates = data.alternate_emails.filter((e) => e.email !== data.primary_email);
    return [primary, ...alternates];
  });

  public emailsWithMetadata = computed(() =>
    this.allEmails().map((email) => ({
      ...email,
      isPrimary: email.email === this.emailData()?.primary_email,
      canDelete: this.allEmails().length > 1 && email.email !== this.emailData()?.primary_email,
      canSetPrimary: email.email !== this.emailData()?.primary_email && email.verified,
    }))
  );

  // Public methods

  public sendVerificationCode(): void {
    if (this.addEmailForm.invalid) {
      return;
    }

    const email = this.addEmailForm.value.email!;
    this.sendingCode.set(true);

    this.userService
      .sendEmailVerificationCode(email)
      .pipe(finalize(() => this.sendingCode.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.pendingEmail.set(email);
            this.otpStep.set(true);
          } else {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message || 'Failed to send verification code' });
          }
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to send verification code' });
        },
      });
  }

  public verifyAndLink(): void {
    if (this.otpForm.invalid) {
      return;
    }

    const otp = this.otpForm.value.otp!;
    this.verifyingOtp.set(true);

    this.userService
      .verifyAndLinkEmail(this.pendingEmail(), otp)
      .pipe(finalize(() => this.verifyingOtp.set(false)))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.cancelOtpStep();
            this.refresh.next();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email address added successfully' });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: response.message || 'Verification failed. Please check your code and try again.',
            });
          }
        },
        error: (error) => {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Verification failed. Please try again.' });
        },
      });
  }

  public cancelOtpStep(): void {
    this.otpStep.set(false);
    this.pendingEmail.set('');
    this.addEmailForm.reset();
    this.otpForm.reset();
  }

  public setPrimary(email: UserEmail): void {
    if (email.email === this.emailData()?.primary_email) {
      return;
    }

    if (!email.verified) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Only verified email addresses can be set as primary' });
      return;
    }

    this.userService.setPrimaryEmail(email.email).subscribe({
      next: () => {
        this.refresh.next();
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Primary email updated successfully' });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update primary email' });
      },
    });
  }

  public deleteEmail(email: UserEmail): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete <strong>${email.email}</strong>? This action cannot be undone.`,
      header: 'Delete Email Address',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-outlined p-button-sm',
      accept: () => {
        this.userService.deleteEmail(email.email).subscribe({
          next: () => {
            this.refresh.next();
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Email address deleted successfully' });
          },
          error: (error) => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error?.message || 'Failed to delete email address' });
          },
        });
      },
    });
  }

  // Private methods
  private initializeEmailData(): Signal<EmailManagementData | null> {
    this.loading.set(true);
    return toSignal(
      this.refresh.pipe(
        switchMap(() =>
          this.userService.getUserEmails().pipe(
            catchError(() => of(null)),
            finalize(() => this.loading.set(false))
          )
        )
      ),
      { initialValue: null }
    );
  }
}
