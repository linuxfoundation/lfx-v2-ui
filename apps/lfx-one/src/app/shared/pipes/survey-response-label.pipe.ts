// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { SURVEY_RESPONSE_STATUS_LABELS, SurveyResponseStatus } from '@lfx-one/shared';

/**
 * Transforms a survey response status into a human-readable label.
 * Accepts the raw API value (possibly null or uppercase) and normalizes
 * before lookup to mirror the survey utility helpers.
 */
@Pipe({
  name: 'surveyResponseLabel',
})
export class SurveyResponseLabelPipe implements PipeTransform {
  public transform(status: string | null | undefined): string {
    if (!status) return '';
    const normalized = status.toLowerCase() as SurveyResponseStatus;
    return SURVEY_RESPONSE_STATUS_LABELS[normalized] ?? status;
  }
}
