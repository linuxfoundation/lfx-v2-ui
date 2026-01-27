// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { SurveyResponseStatus, SurveyStatus } from '../enums/survey.enum';
import { CommitteeReference } from './committee.interface';

/**
 * User's survey participation
 * @description Represents a user's participation in a survey - aligns with lfx-pcc IndividualSurveyResponse
 */
export interface UserSurvey {
  /** Unique survey identifier */
  survey_id: string;
  /** Display title of the survey */
  survey_title: string;
  /** Current status of the survey */
  survey_status: SurveyStatus;
  /** Associated committees with allowed voting statuses */
  committees: CommitteeReference[];
  /** Survey deadline/cutoff date */
  survey_cutoff_date: string;
  /** User's response status */
  response_status: SurveyResponseStatus;
  /** Timestamp when user submitted their response (null if not responded) */
  response_datetime: string | null;
}

/**
 * Committee reference within a survey entity
 * @description Committee data with response metrics and NPS scores
 */
export interface SurveyCommittee {
  /** Committee ID */
  committee_id: string;
  /** Committee UID */
  committee_uid: string;
  /** Committee display name */
  committee_name: string;
  /** Project ID */
  project_id: string;
  /** Project UID */
  project_uid: string;
  /** Project display name */
  project_name: string;
  /** Total recipients for this committee */
  total_recipients: number;
  /** Total responses from this committee */
  total_responses: number;
  /** NPS score value */
  nps_value: number;
  /** Number of detractors */
  num_detractors: number;
  /** Number of passives */
  num_passives: number;
  /** Number of promoters */
  num_promoters: number;
}

/**
 * Survey dashboard entity
 * @description Represents a survey in the dashboard/list view from the query service
 */
export interface Survey {
  /** Unique survey identifier */
  id: string;
  /** Display title of the survey */
  survey_title: string;
  /** Current status of the survey */
  survey_status: string;
  /** Survey deadline/cutoff date */
  survey_cutoff_date: string;
  /** Whether this is an NPS survey */
  is_nps_survey: boolean;
  /** Whether this is a project-level survey */
  is_project_survey: boolean;
  /** Associated committees */
  committees: SurveyCommittee[];
  /** Committee category */
  committee_category: string;
  /** Total responses received */
  total_responses: number;
  /** Total recipients */
  total_recipients: number;
  /** Creation timestamp */
  created_at: string;
  /** Last modification timestamp */
  last_modified_at: string;
  /** Name of the creator */
  creator_name: string;
}
