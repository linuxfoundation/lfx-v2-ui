// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import type { OrgTrainingStats } from '@lfx-one/shared/interfaces';

import { SnowflakeService } from './snowflake.service';

interface OrgTrainingStatsRow {
  CERTIFICATES_EARNED: number;
  TRAININGS_ENROLLED: number;
  EMPLOYEES_ENGAGED: number;
}

/** Aggregates training & certification counts from ORG_PEOPLE_TRAINING for an org account. */
export class OrgLensTrainingService {
  private readonly snowflakeService = SnowflakeService.getInstance();

  public async getTrainingStats(accountId: string): Promise<OrgTrainingStats> {
    // All three metrics count distinct people so they share a consistent semantic:
    //   CERTIFICATES_EARNED  — people who earned ≥1 certification
    //   TRAININGS_ENROLLED   — people enrolled in ≥1 training (non-certified status)
    //   EMPLOYEES_ENGAGED    — union: people with any training or certification record
    //
    // This ensures EMPLOYEES_ENGAGED ≥ each of the other two individually.
    // The sum of the first two can still exceed EMPLOYEES_ENGAGED when some
    // employees appear in both groups (i.e. have both trainings and certifications).
    const query = `
      SELECT
        COUNT(DISTINCT CASE WHEN STATUS = 'Certified'  THEN PERSON_KEY END) AS CERTIFICATES_EARNED,
        COUNT(DISTINCT CASE WHEN STATUS != 'Certified' THEN PERSON_KEY END) AS TRAININGS_ENROLLED,
        COUNT(DISTINCT PERSON_KEY)                                           AS EMPLOYEES_ENGAGED
      FROM ANALYTICS.PLATINUM_LFX_ONE.ORG_PEOPLE_TRAINING
      WHERE ACCOUNT_ID = ?
    `;

    const result = await this.snowflakeService.execute<OrgTrainingStatsRow>(query, [accountId]);
    const row = result.rows[0];

    return {
      certificatesEarned: row?.CERTIFICATES_EARNED ?? 0,
      trainingsEnrolled: row?.TRAININGS_ENROLLED ?? 0,
      employeesEngaged: row?.EMPLOYEES_ENGAGED ?? 0,
    };
  }
}
