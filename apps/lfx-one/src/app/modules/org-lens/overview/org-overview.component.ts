// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AccountContextService } from '@services/account-context.service';
import { AppService } from '@services/app.service';

interface DataMaintenanceCard {
  badge: string;
  badgeClass: string;
  count: number;
  label: string;
  actionLabel: string;
  actionRoute: string;
  actionClass: string;
}

interface MembershipOnboarding {
  id: string;
  name: string;
  status: 'action-needed' | 'complete';
  stepsRemaining: number;
  missingItems: string;
  progress: number;
  memberSince?: string;
}

interface MostActiveProject {
  name: string;
  detail: string;
  level: 'Leading' | 'Contributing' | 'Participating' | 'Silent';
}

interface MostInfluentialProject {
  name: string;
  ecosystemScore: string;
  technicalScore: string;
  totalScore: number;
  scoreColor: string;
}

interface InfluenceChange {
  name: string;
  percentChange: number;
  fromLevel: string;
  toLevel: string;
  why: string;
  positive: boolean;
}

interface TopContributor {
  rank: number;
  name: string;
  value: number;
}

interface OrgEvent {
  name: string;
  location: string;
  startDate: string;
  endDate?: string;
  myRegistrants: number;
  totalRegistrants: string;
  speakingProposals?: number;
  speakingTotal?: number;
}

@Component({
  selector: 'lfx-org-overview',
  imports: [RouterModule],
  templateUrl: './org-overview.component.html',
})
export class OrgOverviewComponent {
  private readonly accountContextService = inject(AccountContextService);
  private readonly appService = inject(AppService);

  protected readonly orgName = this.accountContextService.selectedAccount;
  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly isAdmin = computed(() => this.orgUserType() !== 'employee');

  protected readonly summaryStats = {
    today: { foundations: 18, committeeMembers: 44, withinFoundations: 15 },
    pastYear: { lfProjects: 75, nonLfProjects: 578, contributors: 287, maintainers: 15 },
  };

  protected readonly dataMaintenanceCards: DataMaintenanceCard[] = [
    {
      badge: 'Action needed',
      badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
      count: 7,
      label: 'Key Contacts Unfilled',
      actionLabel: 'Review Contacts',
      actionRoute: '/org/membership',
      actionClass: 'text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100',
    },
    {
      badge: 'Past 1 year',
      badgeClass: 'bg-green-50 text-green-700 border border-green-200',
      count: 2,
      label: 'Seats to Reassign',
      actionLabel: 'View Details',
      actionRoute: '/org/membership',
      actionClass: 'text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100',
    },
    {
      badge: '1 vacancy',
      badgeClass: 'bg-green-50 text-green-700 border border-green-200',
      count: 18,
      label: 'Board Members',
      actionLabel: 'Fill Vacancy',
      actionRoute: '/org/groups',
      actionClass: 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100',
    },
    {
      badge: '3 open seats',
      badgeClass: 'bg-green-50 text-green-700 border border-green-200',
      count: 24,
      label: 'Committee Members',
      actionLabel: 'Fill Seats',
      actionRoute: '/org/groups',
      actionClass: 'text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100',
    },
  ];

  protected readonly membershipOnboarding: MembershipOnboarding[] = [
    {
      id: 'aswf',
      name: 'Academy Software Foundation (ASWF)',
      status: 'action-needed',
      stepsRemaining: 3,
      missingItems: 'Board seat unfilled · 2 key contacts needed · Mailing list not joined',
      progress: 60,
    },
    {
      id: 'ccc',
      name: 'Confidential Computing Consortium (CCC)',
      status: 'action-needed',
      stepsRemaining: 1,
      missingItems: 'Primary technical contact not assigned',
      progress: 85,
    },
    {
      id: 'cncf',
      name: 'Cloud Native Computing Foundation (CNCF)',
      status: 'complete',
      stepsRemaining: 0,
      missingItems: '',
      progress: 100,
      memberSince: 'Dec 2016',
    },
    {
      id: 'ceph',
      name: 'Ceph Foundation',
      status: 'complete',
      stepsRemaining: 0,
      missingItems: '',
      progress: 100,
      memberSince: 'Oct 2018',
    },
  ];

  // ─── Key Projects ─────────────────────────────────────────────────────────
  protected readonly influenceCounts = { leading: 8, contributing: 15, participating: 18, silent: 42 };

  protected readonly mostActiveProjects: MostActiveProject[] = [
    { name: 'Kubernetes', detail: '2,847 commits · 156 contributors', level: 'Leading' },
    { name: 'Linux Kernel', detail: '1,923 commits · 243 contributors', level: 'Leading' },
    { name: 'Envoy', detail: '1,456 commits · 98 contributors', level: 'Contributing' },
  ];

  protected readonly mostInfluentialProjects: MostInfluentialProject[] = [
    { name: 'Kubernetes', ecosystemScore: '24/27', technicalScore: '11/12', totalScore: 35, scoreColor: 'text-green-700' },
    { name: 'Linux Kernel', ecosystemScore: '22/27', technicalScore: '10/12', totalScore: 32, scoreColor: 'text-green-700' },
    { name: 'Prometheus', ecosystemScore: '20/27', technicalScore: '9/12', totalScore: 29, scoreColor: 'text-blue-700' },
  ];

  protected readonly influenceChanges: InfluenceChange[] = [
    {
      name: 'Envoy',
      percentChange: 34,
      fromLevel: 'Participating',
      toLevel: 'Contributing',
      why: '+3 new code contributors (Priya Sharma, James Wu, Mei Lin) · Commits up 210% · 2 employees accepted as conference speakers · Priya Sharma promoted to core reviewer',
      positive: true,
    },
    {
      name: 'OpenTelemetry',
      percentChange: 18,
      fromLevel: 'Contributing',
      toLevel: 'Participating',
      why: 'Alex Torres (primary contributor) left the company · Commits down 62% · Meeting attendance dropped from 18 to 4 · No event speakers submitted this year',
      positive: false,
    },
  ];

  // ─── Employee Activities Summary ──────────────────────────────────────────
  protected readonly employeeActivitySummary = {
    activeProjects: 75,
    commits: '2,847',
    meetingsAttended: 127,
    activeContributors: 156,
  };

  protected readonly topCommitters: TopContributor[] = [
    { rank: 1, name: 'Sarah Chen', value: 847 },
    { rank: 2, name: 'Marcus Rivera', value: 623 },
    { rank: 3, name: 'Priya Sharma', value: 412 },
    { rank: 4, name: 'James Wu', value: 389 },
    { rank: 5, name: 'Elena Popov', value: 287 },
    { rank: 6, name: 'David Kim', value: 234 },
    { rank: 7, name: 'Aisha Okafor', value: 198 },
    { rank: 8, name: 'Lars Andersen', value: 176 },
    { rank: 9, name: 'Mei Lin', value: 154 },
    { rank: 10, name: 'Tom Bradley', value: 132 },
  ];

  protected readonly topMeetingAttendees: TopContributor[] = [
    { rank: 1, name: 'Marcus Rivera', value: 48 },
    { rank: 2, name: 'Sarah Chen', value: 42 },
    { rank: 3, name: 'Elena Popov', value: 36 },
    { rank: 4, name: 'David Kim', value: 31 },
    { rank: 5, name: 'James Wu', value: 28 },
    { rank: 6, name: 'Priya Sharma', value: 24 },
    { rank: 7, name: 'Aisha Okafor', value: 21 },
    { rank: 8, name: 'Tom Bradley', value: 18 },
    { rank: 9, name: 'Lars Andersen', value: 15 },
    { rank: 10, name: 'Mei Lin', value: 12 },
  ];

  // ─── Events ───────────────────────────────────────────────────────────────
  protected readonly events: OrgEvent[] = [
    {
      name: 'Open Source in Finance Forum Toronto 2026',
      location: 'Toronto Canada',
      startDate: 'Apr 14, 2026',
      myRegistrants: 2,
      totalRegistrants: '325',
      speakingProposals: 0,
      speakingTotal: 1,
    },
    {
      name: 'OpenSearchCon Europe 2026',
      location: 'Nové Město Czechia',
      startDate: 'Apr 16, 2026',
      endDate: 'Apr 17, 2026',
      myRegistrants: 1,
      totalRegistrants: '250',
    },
    {
      name: 'Open Source Summit + Embedded Linux Conference North America 2026',
      location: 'Minneapolis United States',
      startDate: 'May 18, 2026',
      endDate: 'May 20, 2026',
      myRegistrants: 1,
      totalRegistrants: '2,000',
      speakingProposals: 0,
      speakingTotal: 1,
    },
  ];

  // ─── Helpers ──────────────────────────────────────────────────────────────
  protected levelClass(level: string): string {
    switch (level) {
      case 'Leading':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'Contributing':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Participating':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  }

}
