// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { combineDateTime } from '../utils/date-time.utils';

/**
 * Validator to ensure meeting date/time is in the future
 */
export function futureDateTimeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const formGroup = control as any; // FormGroup
    const startDate = formGroup.get?.('startDate')?.value;
    const startTime = formGroup.get?.('startTime')?.value;
    const timezone = formGroup.get?.('timezone')?.value;

    if (!startDate || !startTime || !timezone) {
      return null; // Don't validate if values are not set
    }

    // Combine the date and time
    const combinedDateTime = combineDateTime(startDate, startTime);
    if (!combinedDateTime) {
      return null; // Invalid time format
    }

    // Parse the combined datetime
    const selectedDate = new Date(combinedDateTime);

    // Get current time in the selected timezone
    const now = new Date();

    // Create timezone-aware date strings for comparison
    const selectedTimeString = selectedDate.toLocaleString('en-US', { timeZone: timezone });
    const currentTimeString = now.toLocaleString('en-US', { timeZone: timezone });

    // Convert back to Date objects for comparison
    const selectedTimeInZone = new Date(selectedTimeString);
    const currentTimeInZone = new Date(currentTimeString);

    // Check if the selected time is in the future
    if (selectedTimeInZone <= currentTimeInZone) {
      return { futureDateTime: true };
    }

    return null;
  };
}

/**
 * Validator to check if a time string is in valid 12-hour format
 */
export function timeFormatValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Don't validate empty values
    }

    // Check if time matches 12-hour format (e.g., "12:45 AM" or "1:30 PM")
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i;
    if (!timeRegex.test(value)) {
      return { invalidTimeFormat: true };
    }

    return null;
  };
}

/**
 * Validator for meeting topic/title
 */
export function meetingTopicValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Required validator handles empty values
    }

    // Check minimum length
    if (value.trim().length < 3) {
      return { minLength: { requiredLength: 3, actualLength: value.trim().length } };
    }

    // Check maximum length
    if (value.length > 255) {
      return { maxLength: { requiredLength: 255, actualLength: value.length } };
    }

    return null;
  };
}

/**
 * Validator for meeting agenda
 */
export function meetingAgendaValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Required validator handles empty values
    }

    // Check minimum length
    if (value.trim().length < 10) {
      return { minLength: { requiredLength: 10, actualLength: value.trim().length } };
    }

    // Check maximum length
    if (value.length > 5000) {
      return { maxLength: { requiredLength: 5000, actualLength: value.length } };
    }

    return null;
  };
}

/**
 * Validator for custom duration
 */
export function customDurationValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null; // Don't validate if not set
    }

    const duration = Number(value);

    if (isNaN(duration)) {
      return { invalidNumber: true };
    }

    if (duration < 15) {
      return { min: { min: 15, actual: duration } };
    }

    if (duration > 480) {
      // 8 hours max
      return { max: { max: 480, actual: duration } };
    }

    return null;
  };
}
