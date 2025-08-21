// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { RecurrenceType } from '../enums';
import { MeetingRecurrence } from '../interfaces';
import { TIME_ROUNDING_MINUTES, WEEKDAY_CODES, DEFAULT_REPEAT_INTERVAL, MINUTES_IN_HOUR, DAYS_IN_WEEK, MS_IN_DAY } from '../constants';

/**
 * Converts a Date object to ISO date string (YYYY-MM-DD format)
 */
export const formatDateToISOString = (date: Date | null | undefined): string | undefined => {
  if (!date) {
    return undefined;
  }

  return new Date(date).toISOString().split('T')[0];
};

/**
 * Converts a date string to Date object, handling null/undefined values
 */
export const parseISODateString = (dateString: string | null | undefined): Date | null => {
  if (!dateString) {
    return null;
  }

  return new Date(dateString);
};

/**
 * Combines a date and time string into an ISO string
 */
export function combineDateTime(date: Date, time: string): string {
  if (!date || !time) return '';

  // Parse the 12-hour format time (e.g., "12:45 AM" or "1:30 PM")
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    console.error('Invalid time format:', time);
    return '';
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  // Create a new date object with the selected date and time
  const combinedDate = new Date(date);
  combinedDate.setHours(hours, minutes, 0, 0);

  // Return ISO string
  return combinedDate.toISOString();
}

/**
 * Gets default start date and time (1 hour from now, rounded to next 15 minutes)
 */
export function getDefaultStartDateTime(): { date: Date; time: string } {
  const now = new Date();
  // Add 1 hour to current time
  now.setHours(now.getHours() + 1);

  // Round up to next 15 minutes
  const minutes = now.getMinutes();
  const roundedMinutes = Math.ceil(minutes / TIME_ROUNDING_MINUTES) * TIME_ROUNDING_MINUTES;
  now.setMinutes(roundedMinutes);
  now.setSeconds(0);
  now.setMilliseconds(0);

  // If rounding pushed us to next hour, adjust accordingly
  if (roundedMinutes === MINUTES_IN_HOUR) {
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
  }

  // Format time to 12-hour format (HH:MM AM/PM)
  const timeString = formatTo12Hour(now);

  return {
    date: new Date(now),
    time: timeString,
  };
}

/**
 * Formats a Date object to 12-hour time format
 */
export function formatTo12Hour(date: Date): string {
  const hours = date.getHours();
  const mins = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  let displayHours = hours > 12 ? hours - 12 : hours;
  if (displayHours === 0) {
    displayHours = 12;
  }
  return `${displayHours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} ${period}`;
}

/**
 * Parses a 12-hour time string and returns hours and minutes
 */
export function parseTime12Hour(time: string): { hours: number; minutes: number } | null {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) {
    return null;
  }

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  return { hours, minutes };
}

/**
 * Gets the week of month for a given date
 */
export function getWeekOfMonth(date: Date): { weekOfMonth: number; isLastWeek: boolean } {
  // Find the first occurrence of this day of week in the month
  const targetDayOfWeek = date.getDay();
  let firstOccurrence = 1;
  while (new Date(date.getFullYear(), date.getMonth(), firstOccurrence).getDay() !== targetDayOfWeek) {
    firstOccurrence++;
  }

  // Calculate which week this date is in
  const weekOfMonth = Math.floor((date.getDate() - firstOccurrence) / DAYS_IN_WEEK) + 1;

  // Check if this is the last occurrence of this day in the month
  const nextWeekDate = new Date(date.getTime() + DAYS_IN_WEEK * MS_IN_DAY);
  const isLastWeek = nextWeekDate.getMonth() !== date.getMonth();

  return { weekOfMonth, isLastWeek };
}

/**
 * Generates a recurrence object based on type and start date
 */
export function generateRecurrenceObject(recurrenceType: string, startDate: Date): MeetingRecurrence | undefined {
  if (recurrenceType === 'none') {
    return undefined;
  }

  const dayOfWeek = startDate.getDay() + 1; // Zoom API uses 1-7 (Sunday=1)
  const { weekOfMonth } = getWeekOfMonth(startDate);

  switch (recurrenceType) {
    case 'daily':
      return {
        type: RecurrenceType.DAILY,
        repeat_interval: DEFAULT_REPEAT_INTERVAL,
      };

    case 'weekly':
      return {
        type: RecurrenceType.WEEKLY,
        repeat_interval: DEFAULT_REPEAT_INTERVAL,
        weekly_days: dayOfWeek.toString(),
      };

    case 'monthly_nth':
      return {
        type: RecurrenceType.MONTHLY,
        repeat_interval: DEFAULT_REPEAT_INTERVAL,
        monthly_week: weekOfMonth,
        monthly_week_day: dayOfWeek,
      };

    case 'monthly_last':
      return {
        type: RecurrenceType.MONTHLY,
        repeat_interval: DEFAULT_REPEAT_INTERVAL,
        monthly_week: -1,
        monthly_week_day: dayOfWeek,
      };

    case 'weekdays':
      return {
        type: RecurrenceType.WEEKLY,
        repeat_interval: DEFAULT_REPEAT_INTERVAL,
        weekly_days: WEEKDAY_CODES, // Monday through Friday
      };

    default:
      return undefined;
  }
}

/**
 * Maps a meeting recurrence object back to form value
 */
export function mapRecurrenceToFormValue(recurrence: MeetingRecurrence | null | undefined): string {
  if (!recurrence) {
    return 'none';
  }

  switch (recurrence.type) {
    case RecurrenceType.DAILY:
      return 'daily';
    case RecurrenceType.WEEKLY:
      return recurrence.weekly_days === WEEKDAY_CODES ? 'weekdays' : 'weekly';
    case RecurrenceType.MONTHLY:
      return recurrence.monthly_week === -1 ? 'monthly_last' : 'monthly_nth';
    default:
      return 'none';
  }
}
