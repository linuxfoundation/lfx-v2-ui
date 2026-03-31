// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { AccountContextService } from '@services/account-context.service';
import { AppService } from '@services/app.service';

type CompanyDataTab = 'profile' | 'data';

interface Domain {
  domain: string;
  verified: boolean;
  employees: number;
  addedDate: string;
}

interface LinkedOrg {
  name: string;
  initials: string;
  relationship: 'Parent' | 'Subsidiary';
  memberships: number;
}

@Component({
  selector: 'lfx-org-profile',
  templateUrl: './org-profile.component.html',
})
export class OrgProfileComponent {
  private readonly accountContextService = inject(AccountContextService);
  private readonly appService = inject(AppService);

  protected readonly orgName = this.accountContextService.selectedAccount;
  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly isAdmin = computed(() => this.orgUserType() !== 'employee');
  protected readonly canEdit = computed(() => this.orgUserType() === 'admin-edit' || this.orgUserType() === 'conglomerate-admin');

  protected readonly activeTab = signal<CompanyDataTab>('profile');

  protected readonly profileCompleteness: number = 72;

  protected readonly profile = {
    description: 'A global technology company focused on cloud infrastructure, open source software, and enterprise solutions. Active member of the Linux Foundation and multiple CNCF foundations.',
    industry: 'Technology',
    size: '10,000–50,000 employees',
    headquarters: 'San Francisco, CA, USA',
    founded: '1994',
    website: 'https://www.company.com',
    linkedIn: 'linkedin.com/company/example',
    twitter: '@examplecorp',
    logoUrl: null as string | null,
  };

  protected readonly domains: Domain[] = [
    { domain: 'company.com', verified: true, employees: 284, addedDate: 'Jan 2018' },
    { domain: 'company.io', verified: true, employees: 3, addedDate: 'Mar 2021' },
    { domain: 'company-labs.dev', verified: false, employees: 0, addedDate: 'Pending' },
  ];

  protected readonly linkedOrgs: LinkedOrg[] = [
    { name: 'Global Holdings Corp', initials: 'GH', relationship: 'Parent', memberships: 22 },
    { name: 'Company Labs Inc.', initials: 'CL', relationship: 'Subsidiary', memberships: 4 },
    { name: 'Company Asia Pacific', initials: 'CA', relationship: 'Subsidiary', memberships: 7 },
  ];

  protected readonly isConglomerate = computed(() => this.orgUserType() === 'conglomerate-admin');

  protected setTab(tab: CompanyDataTab): void {
    this.activeTab.set(tab);
  }
}
