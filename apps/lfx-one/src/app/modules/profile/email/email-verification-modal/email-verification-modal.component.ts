// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components/button/button.component';
import { MessageComponent } from '@shared/components/message/message.component';
import { UserService } from '@shared/services/user.service';
import { MessageService } from 'primeng/api';
import { AutoFocusModule } from 'primeng/autofocus';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputOtpModule } from 'primeng/inputotp';
import { ToastModule } from 'primeng/toast';
import { finalize, interval } from 'rxjs';

@Component({
  selector: 'lfx-email-verification-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, MessageComponent, ToastModule, InputOtpModule, AutoFocusModule],
  providers: [MessageService],
  templateUrl: './email-verification-modal.component.html',
})
export class EmailVerificationModalComponent implements OnInit {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = takeUntilDestroyed();

  // Timer configuration (5 minutes = 300 seconds)
  private readonly TIMER_DURATION = 300;
  public timeRemaining = signal(this.TIMER_DURATION);
  public timerExpired = signal(false);
  public resending = signal(false);

  // Computed signal for formatted time display
  public formattedTime = computed(() => {
    const minutes = Math.floor(this.timeRemaining() / 60);
    const seconds = this.timeRemaining() % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  // Email passed from parent
  public email = '';

  // Form for verification code - single control with 6-digit value
  public verificationForm = new FormGroup({
    code: new FormControl('', [Validators.required, Validators.pattern(/^\d{6}$/)]),
  });

  public submitting = signal(false);
  public errorMessage = signal<string | null>(null);

  public ngOnInit(): void {
    // Get email from dialog config
    this.email = this.config.data?.email || '';

    // Start the countdown timer
    this.startTimer();

    // Clear error message when user starts typing (not on reset)
    this.verificationForm
      .get('code')
      ?.valueChanges.pipe(this.destroyRef)
      .subscribe((value) => {
        // Only clear error if user is actually typing (value is not empty)
        if (value) {
          this.errorMessage.set(null);
        }
      });
  }

  public submitCode(): void {
    // Clear any previous error message first, before validation
    this.errorMessage.set(null);

    if (this.verificationForm.invalid || this.submitting() || this.timerExpired()) {
      return;
    }

    const code = this.verificationForm.value.code || '';
    this.submitting.set(true);

    // Call the verification API
    this.userService
      .verifyAndLinkEmail(this.email, code)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          // On success, close the dialog and notify parent
          this.dialogRef.close({ success: true, email: this.email });
        },
        error: (error) => {
          console.error('Failed to verify code:', error);
          
          // Check for specific error cases
          // ServiceValidationError structure: error.error.errors[0].message
          const specificMessage = error.error?.errors?.[0]?.message || '';
          const genericMessage = error.error?.message || error.message || '';
          
          // Check for microservice error format
          const errorCode = error.error?.error_code || '';
          const errorType = error.error?.error_type || '';
          
          // Check both the specific validation message and generic message
          const errorText = (specificMessage + ' ' + genericMessage + ' ' + errorCode).toLowerCase();
          
          let errorMsg = 'Invalid verification code. Please try again.';
          
          // Handle specific error cases
          if (errorText.includes('already linked')) {
            // Email is already linked to another account - close modal and signal parent
            this.dialogRef.close({ 
              alreadyLinked: true, 
              email: this.email 
            });
            return;
          }
          
          // Handle OTP verification failed
          if (errorCode === 'OTP_VERIFICATION_FAILED' || errorType === '_MicroserviceError') {
            errorMsg = 'Invalid or expired verification code. Please try again.';
          }
          
          // Clear the form first (this triggers valueChanges which would clear error message)
          this.verificationForm.reset();
          
          // Set error message AFTER reset to prevent it from being cleared
          this.errorMessage.set(errorMsg);
          console.log('Error message signal value:', this.errorMessage());
        },
      });
  }

  public cancel(): void {
    this.dialogRef.close(null);
  }

  private startTimer(): void {
    interval(1000)
      .pipe(this.destroyRef)
      .subscribe(() => {
        const remaining = this.timeRemaining() - 1;
        
        if (remaining <= 0) {
          this.timeRemaining.set(0);
          this.timerExpired.set(true);
          this.verificationForm.disable();
          // Timer will auto-cleanup on component destroy
        } else {
          this.timeRemaining.set(remaining);
        }
      });
  }

  public resendCode(): void {
    this.resending.set(true);

    // Call the backend to resend verification code
    this.userService
      .sendEmailVerification(this.email)
      .pipe(finalize(() => this.resending.set(false)))
      .subscribe({
        next: () => {
          // Reset the timer and form
          this.timeRemaining.set(this.TIMER_DURATION);
          this.timerExpired.set(false);
          this.verificationForm.enable();
          this.verificationForm.reset();
          
          // Clear any previous error message
          this.errorMessage.set(null);

          // Restart the timer
          this.startTimer();

          // Show success message
          this.messageService.add({
            severity: 'success',
            summary: 'Code Sent',
            detail: 'A new verification code has been sent to your email',
          });
        },
        error: (error) => {
          console.error('Failed to resend verification code:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to send verification code. Please try again.',
          });
        },
      });
  }
}

