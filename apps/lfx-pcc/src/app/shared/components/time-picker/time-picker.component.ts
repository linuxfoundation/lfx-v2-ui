// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TimePickerProps } from '@lfx-pcc/shared/interfaces';
import { AutoCompleteCompleteEvent, AutoCompleteModule } from 'primeng/autocomplete';

interface TimeOption {
  label: string;
  value: string;
}

@Component({
  selector: 'lfx-time-picker',
  standalone: true,
  imports: [AutoCompleteModule, ReactiveFormsModule],
  templateUrl: './time-picker.component.html',
})
export class TimePickerComponent {
  // Required form inputs following LFX pattern
  public form = input.required<FormGroup>();
  public control = input.required<string>();

  // Optional properties
  public readonly label = input<TimePickerProps['label']>('');
  public readonly placeholder = input<TimePickerProps['placeholder']>('Select or type time');
  public readonly required = input<TimePickerProps['required']>(false);
  public readonly size = input<TimePickerProps['size']>('small');

  // Time options signal
  private timeOptions = signal<TimeOption[]>([]);
  public filteredTimeOptions = signal<TimeOption[]>([]);

  public constructor() {
    this.timeOptions.set(this.generateTimeOptions());
    this.filteredTimeOptions.set(this.timeOptions());
  }

  // Public methods
  public onCompleteMethod(event: AutoCompleteCompleteEvent): void {
    const query = event.query.toLowerCase();
    const filtered = this.timeOptions().filter((option) => option.label.toLowerCase().includes(query));
    this.filteredTimeOptions.set(filtered);
  }

  public onInput(event: any): void {
    const inputValue = event.target.value;
    if (inputValue) {
      const convertedTime = this.convertTimeFormat(inputValue);
      if (convertedTime !== inputValue) {
        // Update the form control with converted time
        const formControl = this.form().get(this.control());
        if (formControl) {
          formControl.setValue(convertedTime);
        }
      }
    }
  }

  // Private methods
  private generateTimeOptions(): TimeOption[] {
    const options: TimeOption[] = [];

    // Generate 15-minute intervals for 24 hours (96 total options)
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = this.formatTime(hour, minute);
        options.push({
          label: timeString,
          value: timeString,
        });
      }
    }

    return options;
  }

  private formatTime(hour: number, minute: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    let displayHour: number;
    if (hour === 0) {
      displayHour = 12;
    } else if (hour > 12) {
      displayHour = hour - 12;
    } else {
      displayHour = hour;
    }
    const displayMinute = minute.toString().padStart(2, '0');

    return `${displayHour}:${displayMinute} ${period}`;
  }

  private convertTimeFormat(input: string): string {
    // Remove extra spaces and normalize input
    const cleanedInput = input.trim();

    // Check if it's already in 12-hour format (contains AM/PM)
    if (/[ap]m/i.test(cleanedInput)) {
      return this.normalizeTime(cleanedInput);
    }

    // Check if it's in 24-hour format (HH:MM or H:MM)
    const time24Match = cleanedInput.match(/^(\d{1,2}):(\d{2})$/);
    if (time24Match) {
      const hour = parseInt(time24Match[1], 10);
      const minute = parseInt(time24Match[2], 10);

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        return this.formatTime(hour, minute);
      }
    }

    // Check for simple hour input (e.g., "9" -> "9:00 AM")
    const hourMatch = cleanedInput.match(/^(\d{1,2})$/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1], 10);
      if (hour >= 1 && hour <= 24) {
        const adjustedHour = hour === 24 ? 0 : hour;
        return this.formatTime(adjustedHour, 0);
      }
    }

    return cleanedInput; // Return original if no conversion needed
  }

  private normalizeTime(timeString: string): string {
    // Normalize AM/PM format to consistent format
    const match = timeString.match(/^(\d{1,2}):?(\d{2})?\s*([ap]m?)/i);
    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = match[2] ? parseInt(match[2], 10) : 0;
      const period = match[3].toLowerCase().includes('p') ? 'PM' : 'AM';

      if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
        let adjustedHour: number;
        if (period === 'PM' && hour !== 12) {
          adjustedHour = hour + 12;
        } else if (period === 'AM' && hour === 12) {
          adjustedHour = 0;
        } else {
          adjustedHour = hour;
        }
        return this.formatTime(adjustedHour, minute);
      }
    }

    return timeString;
  }
}
