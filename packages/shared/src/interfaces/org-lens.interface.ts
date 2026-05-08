// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

/**
 * LFX Org Lens membership tier classes, in descending tier order.
 * Drives any tier-based ranking or filtering on the client side.
 * Backed by the accepted_values dbt test on
 * platinum_lfx_one_org_lens_account_context.membership_tier_class.
 */
export type MembershipTierClass = 'Platinum' | 'Premier' | 'Gold' | 'Silver' | 'Steering' | 'General' | 'Sponsor' | 'Other';

/**
 * Raw row from ANALYTICS.PLATINUM_LFX_ONE.ORG_LENS_ACCOUNT_CONTEXT — the
 * single denormalised platinum table that resolves a Salesforce
 * account_id to the full Org Lens display context (account attributes,
 * Crowd.dev mapping, highest active corporate membership tier).
 */
export interface OrgLensAccountContextRow {
  ACCOUNT_ID: string;
  ACCOUNT_NAME: string;
  ACCOUNT_SLUG: string | null;
  LOGO_URL: string | null;
  CDEV_ORG_ID: string | null;
  CDEV_ORG_NAME: string | null;
  CDEV_ORG_LOGO: string | null;
  IS_MEMBER: boolean;
  MEMBER_ACCOUNT_TYPE: string | null;
  MEMBERSHIP_ID: string | null;
  MEMBERSHIP_PROJECT_ID: string | null;
  MEMBERSHIP_PROJECT_NAME: string | null;
  MEMBERSHIP_TIER_DISPLAY_NAME: string | null;
  MEMBERSHIP_TIER_CLASS: MembershipTierClass | null;
}

export interface OrgLensAccountContextResponse {
  accountId: string;
  accountName: string;
  accountSlug: string | null;
  logoUrl: string | null;
  cdevOrgId: string | null;
  cdevOrgName: string | null;
  cdevOrgLogo: string | null;
  isMember: boolean;
  memberAccountType: string | null;
  membershipId: string | null;
  membershipProjectId: string | null;
  membershipProjectName: string | null;
  membershipTierDisplayName: string | null;
  membershipTierClass: MembershipTierClass | null;
}
