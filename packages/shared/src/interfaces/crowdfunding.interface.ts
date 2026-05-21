// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { FundType } from '../enums/crowdfunding.enum';

export type CrowdfundingInitiativeStatus = 'active' | 'pending' | 'closed';

export interface CrowdfundingInitiative {
  id: string;
  name: string;
  description: string;
  icon: string;
  fundType: FundType;
  status: CrowdfundingInitiativeStatus;
  raised: number;
  goal: number | null;
  sponsorsCount: number;
  publicUrl?: string;
}

export interface CrowdfundingInitiativesStats {
  activeCount: number;
  totalRaised: number;
  monthlyGain: number;
  totalSponsors: number;
}
