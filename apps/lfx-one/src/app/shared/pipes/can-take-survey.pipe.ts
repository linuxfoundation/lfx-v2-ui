// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { UserSurvey } from '@lfx-one/shared/interfaces';
import { COMBINED_SURVEY_STATUS, getCombinedSurveyStatus } from '@lfx-one/shared/utils';

@Pipe({
  name: 'canTakeSurvey',
})
export class CanTakeSurveyPipe implements PipeTransform {
  public transform(survey: UserSurvey): boolean {
    return getCombinedSurveyStatus(survey) === COMBINED_SURVEY_STATUS.OPEN;
  }
}
