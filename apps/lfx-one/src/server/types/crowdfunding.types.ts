// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

// Generated with [Claude Code](https://claude.ai/code)

// Raw snake_case shapes from the upstream crowdfunding service — server-only.

export interface BackendGoal {
  id: string;
  name: string;
  goal_amount_cents: number;
  description?: string;
  donated_cents?: number;
  spent_cents?: number;
}

export interface BackendSponsor {
  id: string;
  name: string;
  avatar_url?: string;
  total_cents: number;
}

export interface BackendInitiative {
  id: string;
  initiative_type: string;
  owner_id: string;
  name: string;
  slug: string;
  status: string;
  industry?: string;
  description?: string;
  color?: string;
  logo_url?: string;
  website_url?: string;
  country?: string;
  city?: string;
  application_url?: string;
  event_start_date?: string;
  event_end_date?: string;
  created_on: string;
  updated_on: string;
  financials?: {
    total_raised_cents: number;
    supporters: number;
    goals_total_cents: number;
    total_disbursed_cents?: number;
    available_balance_cents?: number;
  };
  goals?: BackendGoal[];
  sponsors?: BackendSponsor[];
  balance?: {
    total_raised_cents: number;
    total_disbursed_cents: number;
    available_cents: number;
  };
}

export interface BackendCrowdfundingResponse {
  data: BackendInitiative[];
  meta: { total: number; limit: number; offset: number };
}
