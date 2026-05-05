// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * Account entity representing an organization in the system
 * @description Maps account ID to organization name for board member dashboard
 */
export interface Account {
  /** Unique account identifier */
  accountId: string;
  /** Organization display name */
  accountName: string;
  /** URL-friendly slug derived from the account name */
  accountSlug?: string;
  /** Logo URL for the organization */
  logoUrl?: string;
  /** Highest membership tier across active memberships (e.g. "Platinum", "Gold") */
  membershipTier?: string;
  /** Related accounts in the same Salesforce hierarchy (conglomerate siblings) */
  accountsRelated?: Account[];
}
