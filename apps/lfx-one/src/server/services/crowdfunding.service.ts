// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

import { InitiativeBase, InitiativesResponse } from '@lfx-one/shared/interfaces';
import { Request } from 'express';

import { MOCK_INITIATIVES } from '../mock-data/crowdfunding.mock';
import { BackendInitiative } from '../types/crowdfunding.types';
import { logger } from './logger.service';

export class CrowdfundingService {
  public async getMyInitiatives(req: Request, username: string): Promise<InitiativesResponse> {
    logger.debug(req, 'get_my_initiatives', 'Fetching crowdfunding initiatives for user', { username });

    const initiatives = MOCK_INITIATIVES.map((b) => this.mapToInitiativeBase(b));

    logger.debug(req, 'get_my_initiatives', 'Returning initiatives', { count: initiatives.length });

    return {
      data: initiatives,
      total: initiatives.length,
      pageSize: initiatives.length,
      offset: 0,
    };
  }

  private mapToInitiativeBase(b: BackendInitiative): InitiativeBase {
    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      description: b.description ?? '',
      status: b.status,
      initiativeType: b.initiative_type,
      color: b.color ?? '',
      createdOn: b.created_on,
      updatedOn: b.updated_on,
      industry: b.industry,
      logoUrl: b.logo_url,
      country: b.country,
      city: b.city,
      websiteURL: b.website_url,
      applicationURL: b.application_url,
      eventStartDate: b.event_start_date,
      eventEndDate: b.event_end_date,
      fundingStatus: b.financials
        ? {
            goalsTotalCents: b.financials.goals_total_cents,
            amountRaisedCents: b.financials.total_raised_cents,
          }
        : undefined,
      initiativeStats: b.financials ? { supporters: b.financials.supporters } : undefined,
    };
  }
}
