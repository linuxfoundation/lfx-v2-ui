// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { buildRecurrenceSummary, CustomRecurrencePattern, MeetingRecurrence, RECURRENCE_NO_END_SENTINEL_DATE } from '@lfx-one/shared';

@Pipe({
  name: 'recurrenceSummary',
})
export class RecurrenceSummaryPipe implements PipeTransform {
  public transform(recurrence: MeetingRecurrence | null | undefined, format: 'full' | 'description' | 'end' = 'full'): string {
    if (!recurrence) {
      return '';
    }

    const pattern = this.convertToRecurrencePattern(recurrence);
    const summary = buildRecurrenceSummary(pattern);

    switch (format) {
      case 'description':
        return summary.description;
      case 'end':
        return summary.endDescription;
      case 'full':
      default:
        return summary.fullSummary;
    }
  }

  private convertToRecurrencePattern(recurrence: MeetingRecurrence): CustomRecurrencePattern {
    const type = recurrence.type ?? 2;
    const monthlyDay = recurrence.monthly_day;
    const monthlyWeek = recurrence.monthly_week;
    const monthlyWeekDay = recurrence.monthly_week_day;
    const endTimes = recurrence.end_times;
    const repeatInterval = recurrence.repeat_interval ?? 1;

    // Determine pattern type from recurrence.type
    let patternType: 'daily' | 'weekly' | 'monthly' = 'weekly';
    if (type === 1) patternType = 'daily';
    else if (type === 2) patternType = 'weekly';
    else if (type === 3) patternType = 'monthly';

    // Determine monthly type
    // Use explicit undefined checks to handle 0 values correctly (0 is a valid day-of-week for Sunday)
    let monthlyType: 'dayOfMonth' | 'dayOfWeek' = 'dayOfMonth';
    if (monthlyDay !== undefined) {
      monthlyType = 'dayOfMonth';
    } else if (monthlyWeek !== undefined && monthlyWeekDay !== undefined) {
      monthlyType = 'dayOfWeek';
    }

    // Determine end type — sentinel means "never ends", not a real user-chosen date
    let endType: 'never' | 'date' | 'occurrences' = 'never';
    const endDateMs = recurrence.end_date_time ? new Date(recurrence.end_date_time).getTime() : NaN;
    const sentinelMs = new Date(RECURRENCE_NO_END_SENTINEL_DATE).getTime();
    const hasRealEndDate = Number.isFinite(endDateMs) && Number.isFinite(sentinelMs) && endDateMs !== sentinelMs;
    if (hasRealEndDate) endType = 'date';
    else if ((endTimes ?? 0) > 0) endType = 'occurrences';

    // Convert weekly_days to array if present
    let weeklyDaysArray: number[] = [];
    if (recurrence.weekly_days) {
      weeklyDaysArray = recurrence.weekly_days.split(',').map((d) => parseInt(d.trim()) - 1);
    }

    return {
      ...recurrence,
      type,
      monthly_day: monthlyDay,
      monthly_week: monthlyWeek,
      monthly_week_day: monthlyWeekDay,
      end_times: endTimes,
      repeat_interval: repeatInterval,
      patternType,
      monthlyType,
      endType,
      weeklyDaysArray,
    };
  }
}
