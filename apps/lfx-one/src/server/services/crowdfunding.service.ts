// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { CrowdfundingInitiativesStats, CrowdfundingTransactionList, InitiativeDetail, InitiativesResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { MOCK_INITIATIVES, MOCK_TRANSACTIONS } from '../mock-data/crowdfunding.mock';
import { mapToInitiativeBase, mapToInitiativeDetail, mapToTransaction } from '../utils/crowdfunding-mapper';
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

  public async getInitiativeBySlug(req: Request, username: string, slug: string): Promise<InitiativeDetail | null> {
    logger.debug(req, 'get_initiative_by_slug', 'Fetching initiative by slug', { username, slug });

    const initiative = MOCK_INITIATIVES.find((i) => i.slug === slug);

    if (!initiative) {
      logger.warning(req, 'get_initiative_by_slug', 'Initiative not found', { slug });
      return null;
    }

    return mapToInitiativeDetail(initiative);
  }

  public async getInitiativeTransactions(
    req: Request,
    username: string,
    slug: string,
    type?: string,
    size?: number,
    from?: number,
  ): Promise<CrowdfundingTransactionList | null> {
    logger.debug(req, 'get_initiative_transactions', 'Fetching transactions for initiative', { username, slug, type, size, from });

    const allTransactions = MOCK_TRANSACTIONS[slug];

    if (allTransactions === undefined) {
      logger.warning(req, 'get_initiative_transactions', 'Initiative not found', { slug });
      return null;
    }

    const filtered = type ? allTransactions.filter((t) => t.type === type) : allTransactions;
    const pageSize = size ?? filtered.length;
    const offset = from ?? 0;
    const page = filtered.slice(offset, offset + pageSize);

    logger.debug(req, 'get_initiative_transactions', 'Returning transactions', { total: filtered.length, page: page.length });

    return {
      data: page.map(mapToTransaction),
      totalCount: filtered.length,
      from: offset,
      size: pageSize,
    };
  }
}
