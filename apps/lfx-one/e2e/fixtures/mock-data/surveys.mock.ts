// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Survey } from '@lfx-one/shared/interfaces';

const COMMITTEE_UID = 'cbf60a42-07db-4677-886c-2e51e9c82661';
const COMMITTEE_NAME = 'AI Ethics & Governance Working Group';
const PROJECT_UID = 'a27394a3-7a6c-4d0f-9e0f-692d8753924f';
const PROJECT_NAME = 'LFX Governance';

/**
 * Mock survey data for Playwright tests
 * Scoped to the AI Ethics & Governance Working Group
 */
export const mockSurveys: Record<string, Survey> = {
  'q2-maintainer-survey': {
    id: 'srv-001-q2-maintainer-survey',
    survey_title: 'AI Ethics WG \u2014 Q2 2026 Maintainer Survey',
    survey_status: 'sent',
    survey_cutoff_date: '2026-04-10T23:59:59Z',
    is_nps_survey: true,
    is_project_survey: false,
    committee_category: 'Working Group',
    committees: [
      {
        committee_id: COMMITTEE_UID,
        committee_uid: COMMITTEE_UID,
        committee_name: COMMITTEE_NAME,
        project_id: PROJECT_UID,
        project_uid: PROJECT_UID,
        project_name: PROJECT_NAME,
        total_recipients: 9,
        total_responses: 0,
        nps_value: 0,
        num_detractors: 0,
        num_passives: 0,
        num_promoters: 0,
      },
    ],
    total_responses: 0,
    total_recipients: 9,
    created_at: '2026-03-10T14:00:00Z',
    last_modified_at: '2026-03-10T14:00:00Z',
    creator_name: 'Admin User',
  },
};

/**
 * Get all mock surveys as an array
 */
export function getAllMockSurveys(): Survey[] {
  return Object.values(mockSurveys);
}

/**
 * Get mock surveys filtered by project UID
 */
export function getMockSurveysByProject(projectUid: string): Survey[] {
  return getAllMockSurveys().filter((s) => s.committees?.some((c) => c.project_uid === projectUid));
}

/**
 * Get mock surveys filtered by committee UID
 */
export function getMockSurveysByCommittee(committeeUid: string): Survey[] {
  return getAllMockSurveys().filter((s) => s.committees?.some((c) => c.committee_uid === committeeUid));
}
