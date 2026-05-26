// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { CrowdfundingInitiativesStats, InitiativesResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { MOCK_INITIATIVES } from '../mock-data/crowdfunding.mock';
import { mapToInitiativeBase } from '../utils/crowdfunding-mapper';
import { logger } from './logger.service';

export class CrowdfundingService {
  public async getMyInitiatives(req: Request, username: string): Promise<InitiativesResponse> {
    logger.debug(req, 'get_my_initiatives', 'Fetching crowdfunding initiatives for user', { username });

    const initiatives = MOCK_INITIATIVES.map(mapToInitiativeBase);

    logger.debug(req, 'get_my_initiatives', 'Returning initiatives', { count: initiatives.length });

    return {
      data: initiatives,
      total: initiatives.length,
      pageSize: initiatives.length,
      offset: 0,
    };
  }

  public async getInitiativesStats(req: Request, username: string): Promise<CrowdfundingInitiativesStats> {
    logger.debug(req, 'get_initiatives_stats', 'Computing initiatives stats for user', { username });

    const initiatives = MOCK_INITIATIVES.map(mapToInitiativeBase);

    const stats: CrowdfundingInitiativesStats = {
      activeCount: initiatives.filter((i) => i.status === 'active').length,
      totalRaised: initiatives.reduce((sum, i) => sum + (i.fundingStatus?.amountRaisedCents ?? 0), 0) / 100,
      monthlyGain: 0, // TODO: derive from real API once upstream exposes monthly gain
      totalSponsors: initiatives.reduce((sum, i) => sum + (i.initiativeStats?.supporters ?? 0), 0),
    };

    logger.debug(req, 'get_initiatives_stats', 'Returning initiatives stats', {
      activeCount: stats.activeCount,
      totalSponsors: stats.totalSponsors,
    });

    return stats;
  }
}
