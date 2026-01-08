// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Pipe, PipeTransform } from '@angular/core';
import { COMBINED_SURVEY_STATUS_LABELS, SurveyResponseStatus, SurveyStatus } from '@lfx-one/shared';
import { UserSurvey } from '@lfx-one/shared/interfaces';

type CombinedSurveyStatus = 'open' | 'submitted' | 'closed';

@Pipe({
  name: 'combinedSurveyStatusLabel',
})
export class CombinedSurveyStatusLabelPipe implements PipeTransform {
  public transform(survey: UserSurvey): string {
    const status = this.getCombinedStatus(survey);
    return COMBINED_SURVEY_STATUS_LABELS[status];
  }

  private getCombinedStatus(survey: UserSurvey): CombinedSurveyStatus {
    if (survey.survey_status === SurveyStatus.CLOSED) {
      return 'closed';
    }

    if (survey.survey_status === SurveyStatus.OPEN) {
      return survey.response_status === SurveyResponseStatus.RESPONDED ? 'submitted' : 'open';
    }

    return 'closed';
  }
}
