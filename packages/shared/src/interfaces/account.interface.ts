// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Account entity representing an organization in the system
 * @description Maps account ID to organization name for board member dashboard
 */
export interface Account {
  /** Salesforce account_id (also known as b2b_account_id) — primary join key */
  accountId: string;
  /** Organization display name */
  accountName: string;
  /** Crowd.dev organization id — secondary identifier, mapped from accountId in Snowflake */
  cdevOrgId?: string;
  /** URL-friendly slug derived from the account name */
  accountSlug?: string;
  /** Logo URL for the organization */
  logoUrl?: string;
  /** Highest membership tier across active memberships (e.g. "Platinum", "Gold") */
  membershipTier?: string;
  /** Related accounts in the same Salesforce hierarchy (conglomerate siblings) */
  accountsRelated?: Account[];
}
