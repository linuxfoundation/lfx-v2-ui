// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EmailManagementData, EmailPreferences, UpdateEmailPreferencesRequest, UserEmail } from '@lfx-one/shared/interfaces';
import { BadgeComponent } from '@shared/components/badge/badge.component';
import { ButtonComponent } from '@shared/components/button/button.component';
import { CardComponent } from '@shared/components/card/card.component';
import { InputTextComponent } from '@shared/components/input-text/input-text.component';
import { MessageComponent } from '@shared/components/message/message.component';
import { SelectComponent } from '@shared/components/select/select.component';
import { UserService } from '@shared/services/user.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService, DynamicDialogModule, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { BehaviorSubject, finalize, switchMap, tap } from 'rxjs';

import { EmailVerificationModalComponent } from './email-verification-modal/email-verification-modal.component';

interface EmailOption {
  label: string;
  value: string | null;
}

@Component({
  selector: 'lfx-profile-email',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardComponent,
    InputTextComponent,
    MessageComponent,
    ButtonComponent,
    BadgeComponent,
    SelectComponent,
    ConfirmDialogModule,
    DynamicDialogModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [DialogService],
  templateUrl: './profile-email.component.html',
})
export class ProfileEmailComponent {
  private readonly userService = inject(UserService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly dialogService = inject(DialogService);
  private readonly destroyRef = takeUntilDestroyed();

  // Dialog reference
  private dialogRef: DynamicDialogRef | undefined;

  // Refresh mechanism
  private refresh = new BehaviorSubject<void>(undefined);

  // Forms
  public addEmailForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  constructor() {
    // Clear error message when user changes email input
    this.addEmailForm
      .get('email')
      ?.valueChanges.pipe(this.destroyRef)
      .subscribe(() => {
        this.emailFieldError.set(null);
      });
  }

  public preferencesForm = new FormGroup({
    meetingEmailId: new FormControl<string | null>(null),
    notificationEmailId: new FormControl<string | null>(null),
    billingEmailId: new FormControl<string | null>(null),
  });

  // State signals
  public loading = signal(false);
  public addingEmail = signal(false);
  public updatingPreferences = signal(false);
  public emailFieldError = signal<string | null>(null);

  // Data signals using toSignal with refresh
  public emailData = this.initializeEmailData();
  public emails = computed(() => this.emailData()?.emails || []);
  public preferences = computed(() => this.emailData()?.preferences || null);
  public emailOptions = this.initializeEmailOptions();

  // Computed values for template - never use functions in templates!
  public emailsWithMetadata = computed(() =>
    this.emails().map((email) => ({
      ...email,
      isPrimary: email.is_primary,
      isMeetingEmail: this.preferences()?.meeting_email_id === email.id,
      isNotificationEmail: this.preferences()?.notification_email_id === email.id,
      isBillingEmail: this.preferences()?.billing_email_id === email.id,
      canDelete: false, // Temporarily disabled - email deletion via NATS not yet implemented
      canSetPrimary: false, // Temporarily disabled - primary email management via NATS not yet implemented
    }))
  );
  // Public methods

  public addEmail(): void {
    if (this.addEmailForm.invalid) {
      return;
    }

    // Clear any previous error
    this.emailFieldError.set(null);

    const email = this.addEmailForm.value.email!;
    this.addingEmail.set(true);

    // Step 1: Send verification code
    this.userService
      .sendEmailVerification(email)
      .pipe(finalize(() => this.addingEmail.set(false)))
      .subscribe({
        next: () => {
          // Show verification modal
          this.showVerificationModal(email);
        },
        error: (error) => {
          console.error('Failed to send verification code:', error);
          
          // Check for specific error cases
          // ServiceValidationError structure: error.error.errors[0].message
          const specificMessage = error.error?.errors?.[0]?.message || '';
          const genericMessage = error.error?.message || error.message || '';
          
          // Check both the specific validation message and generic message
          const errorText = (specificMessage + ' ' + genericMessage).toLowerCase();
          
          if (errorText.includes('already linked')) {
            // Show error below the email field
            this.emailFieldError.set('This email address is already in use.');
          } else {
            // Show generic error as toast for other errors
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to send verification code. Please try again.',
            });
          }
        },
      });
  }

  private showVerificationModal(email: string): void {
    this.dialogRef = this.dialogService.open(EmailVerificationModalComponent, {
      header: 'Email Verification',
      width: '500px',
      modal: true,
      dismissableMask: false,
      closable: true,
      data: {
        email,
      },
    });

    this.dialogRef.onClose.subscribe((result) => {
      if (result && result.success) {
        // Email was successfully verified and linked
        this.addEmailForm.reset();
        this.emailFieldError.set(null);
        this.refresh.next();
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Email address verified and linked successfully',
        });
      } else if (result && result.alreadyLinked) {
        // This email address is already in use - show error below field only
        this.emailFieldError.set('This email address is already in use.');
        // Don't show a toast - the inline error is enough
      } else if (result === null || result === undefined) {
        // Modal was closed/cancelled by user (X button)
        this.addEmailForm.reset();
        this.emailFieldError.set(null);
        // Don't show cancelled toast - it's unnecessary
      }
    });
  }

  public setPrimary(email: UserEmail): void {
    if (email.is_primary) {
      return;
    }

    // Only allow verified emails to be set as primary
    if (!email.is_verified) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Only verified email addresses can be set as primary',
      });
      return;
    }

    // Temporarily disabled - primary email management via NATS not yet implemented
    this.messageService.add({
      severity: 'info',
      summary: 'Feature Coming Soon',
      detail: 'Changing the primary email is not yet available. This feature will be enabled soon.',
    });
    return;

    // TODO: Implement setPrimaryEmail via NATS
    // this.userService.setPrimaryEmail(email.id).subscribe({
    //   next: () => {
    //     this.refresh.next();
    //     this.messageService.add({
    //       severity: 'success',
    //       summary: 'Success',
    //       detail: 'Primary email updated successfully',
    //     });
    //   },
    //   error: (error) => {
    //     console.error('Failed to set primary email:', error);
    //     this.messageService.add({
    //       severity: 'error',
    //       summary: 'Error',
    //       detail: 'Failed to update primary email',
    //     });
    //   },
    // });
  }

  public deleteEmail(email: UserEmail): void {
    // Temporarily disabled - email deletion via NATS not yet implemented
    this.messageService.add({
      severity: 'info',
      summary: 'Feature Coming Soon',
      detail: 'Email deletion is not yet available. This feature will be enabled soon.',
    });
    return;

    // TODO: Implement deleteEmail via NATS
    // this.confirmationService.confirm({
    //   message: `Are you sure you want to delete <strong>${email.email}</strong>? This action cannot be undone.`,
    //   header: 'Delete Email Address',
    //   acceptLabel: 'Delete',
    //   rejectLabel: 'Cancel',
    //   acceptButtonStyleClass: 'p-button-danger p-button-sm',
    //   rejectButtonStyleClass: 'p-button-outlined p-button-sm',
    //   accept: () => {
    //     this.userService.deleteEmail(email.id).subscribe({
    //       next: () => {
    //         this.refresh.next();
    //         this.messageService.add({
    //           severity: 'success',
    //           summary: 'Success',
    //           detail: 'Email address deleted successfully',
    //         });
    //       },
    //       error: (error) => {
    //         console.error('Failed to delete email:', error);
    //         const message = error.error?.message || 'Failed to delete email address';
    //         this.messageService.add({
    //           severity: 'error',
    //           summary: 'Error',
    //           detail: message,
    //         });
    //       },
    //     });
    //   },
    // });
  }

  public updatePreferences(): void {
    this.updatingPreferences.set(true);

    const preferences: UpdateEmailPreferencesRequest = {
      meeting_email_id: this.preferencesForm.value.meetingEmailId || null,
      notification_email_id: this.preferencesForm.value.notificationEmailId || null,
      billing_email_id: this.preferencesForm.value.billingEmailId || null,
    };

    this.userService
      .updateEmailPreferences(preferences)
      .pipe(finalize(() => this.updatingPreferences.set(false)))
      .subscribe({
        next: () => {
          this.refresh.next();
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Email preferences updated successfully',
          });
        },
        error: (error) => {
          console.error('Failed to update preferences:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to update email preferences',
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
            tap((data) => {
              this.initializePreferencesForm(data.preferences);
            }),
            finalize(() => this.loading.set(false))
          )
        )
      ),
      { initialValue: null }
    );
  }

  private initializeEmailOptions(): Signal<EmailOption[]> {
    return computed(() => {
      // Only include verified emails in notification preferences
      const verifiedEmails = this.emails()
        .filter((email) => email.is_verified)
        .map((email) => ({
          label: email.email,
          value: email.id,
        }));
      return verifiedEmails;
    });
  }

  private initializePreferencesForm(preferences: EmailPreferences | null): void {
    if (preferences && this.preferencesForm) {
      this.preferencesForm.patchValue({
        meetingEmailId: preferences.meeting_email_id,
        notificationEmailId: preferences.notification_email_id,
        billingEmailId: preferences.billing_email_id,
      });
    }
  }
}
