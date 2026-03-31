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

interface ProjectInfluence {
  name: string;
  detail: string;
  level: 'Leading' | 'Contributing' | 'Participating' | 'Silent';
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

  protected readonly employeeActivityStats = {
    codeProjects: 75,
    commits: 8423,
    meetingsAttended: 124,
    eventsAttended: 24,
    trainingsCompleted: 89,
    certifications: 28,
  };

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

  protected readonly influenceCounts = { leading: 8, contributing: 15, participating: 18, silent: 42 };

  protected readonly topProjects: ProjectInfluence[] = [
    { name: 'Kubernetes', detail: '2,847 commits · 156 contributors', level: 'Leading' },
    { name: 'Linux Kernel', detail: '1,203 commits · 89 contributors', level: 'Leading' },
    { name: 'Prometheus', detail: '734 commits · 42 contributors', level: 'Contributing' },
    { name: 'Envoy', detail: '521 commits · 31 contributors', level: 'Contributing' },
    { name: 'OpenTelemetry', detail: '298 commits · 18 contributors', level: 'Participating' },
  ];

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
