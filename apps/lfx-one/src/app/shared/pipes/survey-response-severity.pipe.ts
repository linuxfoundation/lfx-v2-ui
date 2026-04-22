// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { SurveyResponseStatus, SURVEY_RESPONSE_STATUS_SEVERITY, TagSeverity } from '@lfx-one/shared';

/**
 * Transforms survey response status to tag severity for consistent styling
 * @description Maps response status values to tag colors. Accepts the raw API
 * value (which may be null or uppercase like 'RESPONDED') and normalizes
 * before lookup to mirror the survey utility helpers.
 * @example
 * <!-- In template -->
 * <lfx-tag [severity]="survey.response_status | surveyResponseSeverity">{{ survey.response_status }}</lfx-tag>
 */
@Pipe({
  name: 'surveyResponseSeverity',
})
export class SurveyResponseSeverityPipe implements PipeTransform {
  public transform(status: string | null | undefined): TagSeverity {
    const normalized = status?.toLowerCase() as SurveyResponseStatus | undefined;
    return (normalized && SURVEY_RESPONSE_STATUS_SEVERITY[normalized]) ?? 'secondary';
  }
}
