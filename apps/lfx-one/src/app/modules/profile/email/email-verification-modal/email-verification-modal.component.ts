// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonComponent } from '@shared/components/button/button.component';
import { MessageComponent } from '@shared/components/message/message.component';
import { UserService } from '@shared/services/user.service';
import { MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ToastModule } from 'primeng/toast';
import { finalize, interval, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'lfx-email-verification-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, MessageComponent, ToastModule],
  providers: [MessageService],
  templateUrl: './email-verification-modal.component.html',
})
export class EmailVerificationModalComponent implements OnInit, OnDestroy {
  private readonly dialogRef = inject(DynamicDialogRef);
  private readonly config = inject(DynamicDialogConfig);
  private readonly userService = inject(UserService);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();

  // Timer configuration (5 minutes = 300 seconds)
  private readonly TIMER_DURATION = 300;
  public timeRemaining = signal(this.TIMER_DURATION);
  public timerExpired = signal(false);
  public resending = signal(false);

  // Email passed from parent
  public email = '';

  // Form for verification code - 6 separate digit inputs
  public verificationForm = new FormGroup({
    digit1: new FormControl('', [Validators.required, Validators.pattern(/^\d$/)]),
    digit2: new FormControl('', [Validators.required, Validators.pattern(/^\d$/)]),
    digit3: new FormControl('', [Validators.required, Validators.pattern(/^\d$/)]),
    digit4: new FormControl('', [Validators.required, Validators.pattern(/^\d$/)]),
    digit5: new FormControl('', [Validators.required, Validators.pattern(/^\d$/)]),
    digit6: new FormControl('', [Validators.required, Validators.pattern(/^\d$/)]),
  });

  public submitting = signal(false);

  public ngOnInit(): void {
    // Get email from dialog config
    this.email = this.config.data?.email || '';

    // Start the countdown timer
    this.startTimer();

    // Auto-focus the first input field
    setTimeout(() => {
      const firstInput = document.getElementById('digit1') as HTMLInputElement;
      if (firstInput) {
        firstInput.focus();
      }
    }, 100);
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public get formattedTime(): string {
    const minutes = Math.floor(this.timeRemaining() / 60);
    const seconds = this.timeRemaining() % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  public submitCode(): void {
    if (this.verificationForm.invalid || this.submitting() || this.timerExpired()) {
      return;
    }

    // Combine all 6 digits into a single code
    const code = `${this.verificationForm.value.digit1}${this.verificationForm.value.digit2}${this.verificationForm.value.digit3}${this.verificationForm.value.digit4}${this.verificationForm.value.digit5}${this.verificationForm.value.digit6}`;
    this.submitting.set(true);

    // Simulate submission - in real implementation this would call an API
    setTimeout(() => {
      this.submitting.set(false);
      // Close the dialog and return the verification code
      this.dialogRef.close({ code, email: this.email });
    }, 500);
  }

  public onDigitInput(event: Event, digitNumber: number): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    // Only allow single digit numbers
    if (value && !/^\d$/.test(value)) {
      input.value = '';
      return;
    }

    // If a digit was entered, move to next input
    if (value && digitNumber < 6) {
      const nextInput = document.getElementById(`digit${digitNumber + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }

  public onDigitKeyDown(event: KeyboardEvent, digitNumber: number): void {
    const input = event.target as HTMLInputElement;

    // Handle backspace - move to previous input if current is empty
    if (event.key === 'Backspace' && !input.value && digitNumber > 1) {
      event.preventDefault();
      const prevInput = document.getElementById(`digit${digitNumber - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }

    // Handle arrow keys
    if (event.key === 'ArrowLeft' && digitNumber > 1) {
      event.preventDefault();
      const prevInput = document.getElementById(`digit${digitNumber - 1}`) as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }

    if (event.key === 'ArrowRight' && digitNumber < 6) {
      event.preventDefault();
      const nextInput = document.getElementById(`digit${digitNumber + 1}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }

    // Prevent non-numeric keys (except backspace, delete, arrows, tab)
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (!allowedKeys.includes(event.key) && !/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  public onDigitPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length > 0) {
      // Fill in the digits
      for (let i = 0; i < digits.length && i < 6; i++) {
        const controlName = `digit${i + 1}` as 'digit1' | 'digit2' | 'digit3' | 'digit4' | 'digit5' | 'digit6';
        this.verificationForm.get(controlName)?.setValue(digits[i]);
      }

      // Focus the next empty input or the last one
      const nextEmptyIndex = digits.length < 6 ? digits.length + 1 : 6;
      const nextInput = document.getElementById(`digit${nextEmptyIndex}`) as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
  }

  public cancel(): void {
    this.dialogRef.close(null);
  }

  private startTimer(): void {
    interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const remaining = this.timeRemaining() - 1;
        
        if (remaining <= 0) {
          this.timeRemaining.set(0);
          this.timerExpired.set(true);
          this.verificationForm.disable();
          this.destroy$.next(); // Stop the timer
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

          // Restart the timer
          this.startTimer();

          // Show success message
          this.messageService.add({
            severity: 'success',
            summary: 'Code Sent',
            detail: 'A new verification code has been sent to your email',
          });

          // Focus the first input
          setTimeout(() => {
            const firstInput = document.getElementById('digit1') as HTMLInputElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 100);
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

