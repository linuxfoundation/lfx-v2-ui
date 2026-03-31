// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { AppService } from '@services/app.service';

type MembershipListTab = 'active' | 'expired' | 'discover';
type MembershipDetailTab = 'docs' | 'contacts' | 'board' | 'onboarding' | 'roi';

interface Membership {
  foundation: string;
  tier: string;
  tierLabel: string;
  tierDateRange: string;
  memberSince: string;
  renewalDate: string;
  projects: number;
  boardMembers: number;
  keyContacts: number;
  keyContactsTotal: number;
  annualFee: string;
  onboarding: number;
  expired?: boolean;
}

interface DiscoverMembership {
  foundation: string;
  description: string;
  relevance: string;
}

interface KeyContact {
  role: string;
  name: string | null;
  email: string | null;
  filled: boolean;
}

interface BoardSeat {
  committee: string;
  type: 'Board' | 'Committee';
  member: string | null;
  filled: boolean;
}

interface OnboardingStep {
  label: string;
  done: boolean;
  category: string;
}

@Component({
  selector: 'lfx-org-membership',
  templateUrl: './org-membership.component.html',
})
export class OrgMembershipComponent {
  private readonly appService = inject(AppService);

  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly isAdmin = computed(() => this.orgUserType() !== 'employee');
  protected readonly canEdit = computed(() => this.orgUserType() === 'admin-edit' || this.orgUserType() === 'conglomerate-admin');

  protected readonly activeListTab = signal<MembershipListTab>('active');
  protected readonly selectedMembership = signal<Membership | null>(null);
  protected readonly activeDetailTab = signal<MembershipDetailTab>('docs');
  protected readonly searchQuery = signal('');

  protected readonly activeMemberships: Membership[] = [
    {
      foundation: 'Academy Software Foundation (ASWF)',
      tier: 'General Membership',
      tierLabel: 'General',
      tierDateRange: 'Jun 30, 2022 – Dec 31, 2026',
      memberSince: 'Jun 30, 2022',
      renewalDate: 'Jan 1, 2027',
      projects: 2,
      boardMembers: 0,
      keyContacts: 8,
      keyContactsTotal: 9,
      annualFee: '$25,000',
      onboarding: 60,
    },
    {
      foundation: 'Ceph Foundation',
      tier: 'Silver Membership',
      tierLabel: 'Silver',
      tierDateRange: 'Oct 31, 2018 – Dec 31, 2026',
      memberSince: 'Oct 31, 2018',
      renewalDate: 'Jan 1, 2027',
      projects: 1,
      boardMembers: 0,
      keyContacts: 8,
      keyContactsTotal: 9,
      annualFee: '$15,000',
      onboarding: 100,
    },
    {
      foundation: 'Cloud Native Computing Foundation (CNCF)',
      tier: 'Silver Membership',
      tierLabel: 'Silver',
      tierDateRange: 'Dec 31, 2016 – Dec 31, 2026',
      memberSince: 'Dec 31, 2016',
      renewalDate: 'Jan 1, 2027',
      projects: 28,
      boardMembers: 0,
      keyContacts: 9,
      keyContactsTotal: 9,
      annualFee: '$370,000',
      onboarding: 100,
    },
    {
      foundation: 'Confidential Computing Consortium (CCC)',
      tier: 'General Membership',
      tierLabel: 'General',
      tierDateRange: 'Dec 31, 2022 – Dec 31, 2026',
      memberSince: 'Dec 31, 2022',
      renewalDate: 'Jan 1, 2027',
      projects: 3,
      boardMembers: 0,
      keyContacts: 8,
      keyContactsTotal: 9,
      annualFee: '$25,000',
      onboarding: 85,
    },
    {
      foundation: 'ELISA Fund',
      tier: 'General Membership',
      tierLabel: 'General',
      tierDateRange: 'Feb 29, 2024 – Dec 31, 2026',
      memberSince: 'Feb 29, 2024',
      renewalDate: 'Jan 1, 2027',
      projects: 2,
      boardMembers: 1,
      keyContacts: 8,
      keyContactsTotal: 9,
      annualFee: '$15,000',
      onboarding: 90,
    },
    {
      foundation: 'FINOS',
      tier: 'Silver Membership',
      tierLabel: 'Silver',
      tierDateRange: 'Mar 31, 2021 – Dec 31, 2026',
      memberSince: 'Mar 31, 2021',
      renewalDate: 'Jan 1, 2027',
      projects: 1,
      boardMembers: 0,
      keyContacts: 7,
      keyContactsTotal: 9,
      annualFee: '$50,000',
      onboarding: 20,
    },
    {
      foundation: 'LF Edge',
      tier: 'General Membership',
      tierLabel: 'General',
      tierDateRange: 'Jan 31, 2019 – Dec 31, 2026',
      memberSince: 'Jan 31, 2019',
      renewalDate: 'Jan 1, 2027',
      projects: 3,
      boardMembers: 0,
      keyContacts: 5,
      keyContactsTotal: 9,
      annualFee: '$15,000',
      onboarding: 75,
    },
    {
      foundation: 'LF Networking (LFN)',
      tier: 'Silver Membership',
      tierLabel: 'Silver',
      tierDateRange: 'Dec 31, 2017 – Dec 31, 2026',
      memberSince: 'Dec 31, 2017',
      renewalDate: 'Jan 1, 2027',
      projects: 2,
      boardMembers: 0,
      keyContacts: 8,
      keyContactsTotal: 9,
      annualFee: '$50,000',
      onboarding: 95,
    },
  ];

  protected readonly expiredMemberships: Membership[] = [
    {
      foundation: 'Open Source Security Foundation (OpenSSF)',
      tier: 'Premier Membership',
      tierLabel: 'Premier',
      tierDateRange: 'Jan 1, 2020 – Apr 30, 2025',
      memberSince: 'Jan 1, 2020',
      renewalDate: 'Apr 30, 2025',
      projects: 4,
      boardMembers: 1,
      keyContacts: 2,
      keyContactsTotal: 9,
      annualFee: '$150,000',
      onboarding: 100,
      expired: true,
    },
    {
      foundation: 'Open Mainframe Project',
      tier: 'Silver Membership',
      tierLabel: 'Silver',
      tierDateRange: 'Mar 1, 2019 – Mar 1, 2024',
      memberSince: 'Mar 1, 2019',
      renewalDate: 'Mar 1, 2024',
      projects: 1,
      boardMembers: 0,
      keyContacts: 3,
      keyContactsTotal: 9,
      annualFee: '$20,000',
      onboarding: 100,
      expired: true,
    },
  ];

  protected readonly discoverMemberships: DiscoverMembership[] = [
    { foundation: 'OpenSSF (Open Source Security Foundation)', description: 'Strengthen security of open source software through community-driven best practices and tooling.', relevance: 'Matches your security & cloud-native focus' },
    { foundation: 'PyTorch Foundation', description: 'Advance open source deep learning and AI frameworks with a strong contributor community.', relevance: 'Matches your AI/ML engineering team activity' },
    { foundation: 'LF AI & Data Foundation', description: 'Neutral home for AI, ML, and data open source projects under LF governance.', relevance: 'Aligns with your key project portfolio' },
    { foundation: 'OpenWallet Foundation', description: 'Open standards and open source components for digital wallet development.', relevance: 'New membership opportunity' },
  ];

  protected readonly filteredActive = computed(() => {
    const q = this.searchQuery().toLowerCase();
    if (!q) return this.activeMemberships;
    return this.activeMemberships.filter((m) => m.foundation.toLowerCase().includes(q));
  });

  protected readonly detailKeyContacts: KeyContact[] = [
    { role: 'Primary Contact', name: 'Jane Smith', email: 'jane.smith@company.com', filled: true },
    { role: 'Technical Contact', name: 'Alice Chen', email: 'alice.chen@company.com', filled: true },
    { role: 'Billing Contact', name: 'Mark Johnson', email: 'mark.johnson@company.com', filled: true },
    { role: 'Legal Contact', name: null, email: null, filled: false },
  ];

  protected readonly detailBoardSeats: BoardSeat[] = [
    { committee: 'Governing Board', type: 'Board', member: 'Jane Smith', filled: true },
    { committee: 'TOC (Technical Oversight Committee)', type: 'Committee', member: 'Alice Chen', filled: true },
    { committee: 'Security TAG', type: 'Committee', member: 'Bob Wilson', filled: true },
    { committee: 'End User TAG', type: 'Committee', member: null, filled: false },
  ];

  protected readonly detailOnboardingSteps: OnboardingStep[] = [
    { label: 'Sign membership agreement', done: true, category: 'Documentation' },
    { label: 'Upload executed charter', done: true, category: 'Documentation' },
    { label: 'Set renewal date reminder', done: true, category: 'Documentation' },
    { label: 'Assign Primary Contact', done: true, category: 'Key Contacts' },
    { label: 'Assign Technical Contact', done: true, category: 'Key Contacts' },
    { label: 'Assign Billing Contact', done: true, category: 'Key Contacts' },
    { label: 'Assign Legal Contact', done: false, category: 'Key Contacts' },
    { label: 'Assign Governing Board representative', done: true, category: 'Board & Committees' },
    { label: 'Assign TOC representative', done: true, category: 'Board & Committees' },
    { label: 'Assign End User TAG representative', done: false, category: 'Board & Committees' },
    { label: 'Join Slack workspace', done: true, category: 'Communications' },
    { label: 'Subscribe to foundation mailing list', done: false, category: 'Communications' },
  ];

  protected readonly onboardingDoneCount = computed(() => this.detailOnboardingSteps.filter((s) => s.done).length);

  protected readonly onboardingPercent = computed(() => {
    return Math.round((this.onboardingDoneCount() / this.detailOnboardingSteps.length) * 100);
  });

  protected setListTab(tab: MembershipListTab): void {
    this.activeListTab.set(tab);
  }

  protected selectMembership(m: Membership): void {
    this.selectedMembership.set(m);
    this.activeDetailTab.set('docs');
  }

  protected clearMembership(): void {
    this.selectedMembership.set(null);
  }

  protected setDetailTab(tab: string): void {
    this.activeDetailTab.set(tab as MembershipDetailTab);
  }

  protected initials(name: string): string {
    return name.split(' ').map((n) => n[0]).join('');
  }
}
