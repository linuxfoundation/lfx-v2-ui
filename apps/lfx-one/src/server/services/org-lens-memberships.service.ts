// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import type {
  OrgActiveMembership,
  OrgActiveMembershipsResponse,
  OrgDiscoverOpportunitiesResponse,
  OrgDiscoverOpportunity,
  OrgExpiredMembership,
  OrgExpiredMembershipsResponse,
} from '@lfx-one/shared/interfaces';

const DEMO_ACCOUNT_ID_PREFIX = '001';

const ACTIVE_MEMBERSHIPS: OrgActiveMembership[] = [
  {
    foundationId: 'agl-001',
    foundationName: 'Automotive Grade Linux (AGL)',
    foundationLogo: null,
    foundationInitials: 'AG',
    projectCount: 43,
    memberCount: 338,
    membershipTier: 'Platinum Member',
    tierStartDate: '2026-01-01',
    tierEndDate: '2026-12-31',
    memberSince: '2012-07-01',
    boardMembers: 0,
    committeeMembers: 0,
    orgProjects: 4,
  },
  {
    foundationId: 'cncf-001',
    foundationName: 'Cloud Native Computing Foundation (CNCF)',
    foundationLogo: null,
    foundationInitials: 'CN',
    projectCount: 55,
    memberCount: 440,
    membershipTier: 'Silver Member',
    tierStartDate: '2026-01-01',
    tierEndDate: '2026-12-31',
    memberSince: '2020-01-01',
    boardMembers: 0,
    committeeMembers: 0,
    orgProjects: 2,
  },
  {
    foundationId: 'ebpf-001',
    foundationName: 'eBPF Foundation',
    foundationLogo: null,
    foundationInitials: 'eB',
    projectCount: 58,
    memberCount: 443,
    membershipTier: 'Silver Member',
    tierStartDate: '2026-01-01',
    tierEndDate: '2026-10-31',
    memberSince: '2022-01-01',
    boardMembers: 1,
    committeeMembers: 0,
    orgProjects: 5,
  },
  {
    foundationId: 'openchain-001',
    foundationName: 'OpenChain Project',
    foundationLogo: null,
    foundationInitials: 'OC',
    projectCount: 54,
    memberCount: 179,
    membershipTier: 'Platinum Member',
    tierStartDate: '2026-01-01',
    tierEndDate: '2026-12-31',
    memberSince: '2017-01-01',
    boardMembers: 0,
    committeeMembers: 20,
    orgProjects: 5,
  },
  {
    foundationId: 'lf-001',
    foundationName: 'The Linux Foundation',
    foundationLogo: null,
    foundationInitials: 'LF',
    projectCount: 61,
    memberCount: 356,
    membershipTier: 'Gold Member',
    tierStartDate: '2026-01-01',
    tierEndDate: '2026-12-31',
    memberSince: '2015-01-01',
    boardMembers: 1,
    committeeMembers: 2,
    orgProjects: 6,
  },
  {
    foundationId: 'todo-001',
    foundationName: 'TODO Group',
    foundationLogo: null,
    foundationInitials: 'TODO',
    projectCount: 10,
    memberCount: 225,
    membershipTier: 'General Member',
    tierStartDate: '2026-01-01',
    tierEndDate: '2026-12-31',
    memberSince: null,
    boardMembers: 0,
    committeeMembers: 0,
    orgProjects: 3,
  },
  {
    foundationId: 'uec-001',
    foundationName: 'Ultra Ethernet Consortium Fund',
    foundationLogo: null,
    foundationInitials: 'UE',
    projectCount: 77,
    memberCount: 462,
    membershipTier: 'Contributor Member',
    tierStartDate: '2026-01-01',
    tierEndDate: '2026-12-31',
    memberSince: '2023-07-01',
    boardMembers: 0,
    committeeMembers: 0,
    orgProjects: 0,
  },
];

const EXPIRED_MEMBERSHIPS: OrgExpiredMembership[] = [
  {
    foundationId: 'soda-001',
    foundationName: 'SODA Foundation',
    foundationInitials: 'SF',
    foundationColor: 'bg-blue-600',
    membershipTier: 'General Member',
    tierStartDate: '2022-03-01',
    tierEndDate: '2025-12-31',
    expirationDate: '2025-12-31',
    actionType: 'renew',
  },
  {
    foundationId: 'lfph-001',
    foundationName: 'LF Public Health',
    foundationInitials: 'LP',
    foundationColor: 'bg-purple-600',
    membershipTier: 'Premier Member',
    tierStartDate: '2020-04-01',
    tierEndDate: '2023-12-31',
    expirationDate: '2023-12-31',
    actionType: 'contact',
  },
  {
    foundationId: 'magma-001',
    foundationName: 'Magma Fund',
    foundationInitials: 'MF',
    foundationColor: 'bg-green-600',
    membershipTier: 'Silver Member',
    tierStartDate: '2021-01-01',
    tierEndDate: '2022-12-31',
    expirationDate: '2022-12-31',
    actionType: 'renew',
  },
  {
    foundationId: 'edgex-001',
    foundationName: 'EdgeX Foundry',
    foundationInitials: 'EF',
    foundationColor: 'bg-teal-600',
    membershipTier: 'Silver Member',
    tierStartDate: '2018-01-01',
    tierEndDate: '2020-12-31',
    expirationDate: '2020-12-31',
    actionType: 'renew',
  },
  {
    foundationId: 'iovisor-001',
    foundationName: 'IO Visor Project',
    foundationInitials: 'IV',
    foundationColor: 'bg-red-600',
    membershipTier: 'Silver Member',
    tierStartDate: '2016-01-01',
    tierEndDate: '2018-12-31',
    expirationDate: '2018-12-31',
    actionType: 'contact',
  },
  {
    foundationId: 'onap-001',
    foundationName: 'ONAP',
    foundationInitials: 'O',
    foundationColor: 'bg-pink-600',
    membershipTier: 'Silver Member',
    tierStartDate: '2017-01-01',
    tierEndDate: '2019-12-31',
    expirationDate: '2019-12-31',
    actionType: 'contact',
  },
];

const DISCOVER_OPPORTUNITIES: OrgDiscoverOpportunity[] = [
  {
    foundationId: 'lfenergy-001',
    foundationName: 'LF Energy',
    foundationInitials: 'LE',
    foundationColor: 'bg-red-700',
    category: 'EV Charging & Grid',
    suggestedTier: 'Strategic Membership',
    relevantProjects: 5,
    contributors: 8,
    contributions: 184,
  },
  {
    foundationId: 'lfai-001',
    foundationName: 'LF AI & Data',
    foundationInitials: 'LA',
    foundationColor: 'bg-orange-600',
    category: 'Autonomous Driving',
    suggestedTier: 'General Membership',
    relevantProjects: 4,
    contributors: 12,
    contributions: 312,
  },
  {
    foundationId: 'pytorch-001',
    foundationName: 'PyTorch Foundation',
    foundationInitials: 'PT',
    foundationColor: 'bg-orange-700',
    category: 'Machine Learning',
    suggestedTier: 'Gold Membership',
    relevantProjects: 2,
    contributors: 7,
    contributions: 142,
  },
  {
    foundationId: 'openssf-001',
    foundationName: 'OpenSSF',
    foundationInitials: 'OS',
    foundationColor: 'bg-blue-800',
    category: 'Supply Chain Security',
    suggestedTier: 'Premier Membership',
    relevantProjects: 3,
    contributors: 4,
    contributions: 56,
  },
  {
    foundationId: 'ccc-001',
    foundationName: 'Confidential Computing Consortium',
    foundationInitials: 'CC',
    foundationColor: 'bg-green-700',
    category: 'Secure Compute',
    suggestedTier: 'Premier Membership',
    relevantProjects: 2,
    contributors: 2,
    contributions: 28,
  },
  {
    foundationId: 'lfedge-001',
    foundationName: 'LF Edge',
    foundationInitials: 'LE',
    foundationColor: 'bg-red-600',
    category: 'Edge Compute',
    suggestedTier: 'Premier Membership',
    relevantProjects: 4,
    contributors: 5,
    contributions: 96,
  },
];

export class OrgLensMembershipsService {
  public getActiveMemberships(accountId: string, search?: string, tier?: string, renewal?: string): OrgActiveMembershipsResponse {
    if (!this.isDemoAccount(accountId)) {
      return { accountId, summary: { activeMemberships: 0, renewingWithin90Days: 0, governanceRoles: 0 }, memberships: [] };
    }

    let filtered = [...ACTIVE_MEMBERSHIPS];

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((m) => m.foundationName.toLowerCase().includes(term));
    }

    if (tier) {
      filtered = filtered.filter((m) => m.membershipTier === tier);
    }

    if (renewal === '90' || renewal === '30') {
      const now = new Date();
      const days = Number(renewal);
      const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter((m) => new Date(m.tierEndDate) <= cutoff);
    }

    const renewingWithin90Days = filtered.filter((m) => {
      const now = new Date();
      const cutoff90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
      return new Date(m.tierEndDate) <= cutoff90;
    }).length;

    const governanceRoles = filtered.reduce((sum, m) => sum + m.boardMembers + m.committeeMembers, 0);

    return {
      accountId,
      summary: {
        activeMemberships: filtered.length,
        renewingWithin90Days,
        governanceRoles,
      },
      memberships: filtered,
    };
  }

  public getExpiredMemberships(accountId: string, search?: string): OrgExpiredMembershipsResponse {
    if (!this.isDemoAccount(accountId)) {
      return { accountId, memberships: [] };
    }

    let filtered = [...EXPIRED_MEMBERSHIPS];

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((m) => m.foundationName.toLowerCase().includes(term));
    }

    return { accountId, memberships: filtered };
  }

  public getDiscoverOpportunities(accountId: string): OrgDiscoverOpportunitiesResponse {
    if (!this.isDemoAccount(accountId)) {
      return { accountId, opportunities: [] };
    }

    return { accountId, opportunities: [...DISCOVER_OPPORTUNITIES] };
  }

  private isDemoAccount(accountId: string): boolean {
    return accountId.startsWith(DEMO_ACCOUNT_ID_PREFIX);
  }
}
