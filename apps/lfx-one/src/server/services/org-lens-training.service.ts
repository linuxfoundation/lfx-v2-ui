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
    const query = `
      SELECT
        COUNT_IF(STATUS = 'Certified')  AS CERTIFICATES_EARNED,
        COUNT_IF(STATUS != 'Certified') AS TRAININGS_ENROLLED,
        COUNT(DISTINCT PERSON_KEY)      AS EMPLOYEES_ENGAGED
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
