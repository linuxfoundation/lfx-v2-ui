// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject } from '@angular/core';
import { AppService } from '@services/app.service';

interface Domain {
  domain: string;
  primaryUse: string;
  employeeCount: number;
  status: 'Active' | 'Shared';
}

interface LinkedOrg {
  name: string;
  relationship: string;
}

@Component({
  selector: 'lfx-org-profile',
  templateUrl: './org-profile.component.html',
})
export class OrgProfileComponent {
  private readonly appService = inject(AppService);

  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly canEdit = computed(() => this.orgUserType() === 'admin-edit' || this.orgUserType() === 'conglomerate-admin');

  protected readonly profile = {
    uid: '451efe4e-9322-4b58-97f5-c8e57b5b99f4',
    name: 'The Linux Foundation',
    founded: 'October 2, 2002',
    website: 'linuxfoundation.org',
    description: 'The Linux Foundation is the nonprofit consortium dedicated to fostering the growth of Linux and collaborative software development. Founded in 2002, we promote, protect, and advance Linux and open source software and communities.',
  };

  protected readonly domains: Domain[] = [
    { domain: 'linuxfoundation.org', primaryUse: 'General corporate', employeeCount: 189, status: 'Active' },
    { domain: 'linux.com', primaryUse: 'Community & projects', employeeCount: 34, status: 'Active' },
    { domain: 'lfx.dev', primaryUse: 'Engineering tools', employeeCount: 11, status: 'Active' },
    { domain: 'cncf.io', primaryUse: 'CNCF program', employeeCount: 0, status: 'Shared' },
  ];

  protected readonly conglomerateExpanded = true;

  protected readonly linkedOrgs: LinkedOrg[] = [
    { name: 'Linux Foundation Europe', relationship: 'Related Entity' },
    { name: 'Linux Foundation Japan', relationship: 'Related Entity' },
    { name: 'Linux Foundation China', relationship: 'Related Entity' },
  ];

  protected readonly linkedOrgNames = this.linkedOrgs.map((o) => o.name).join(', ');
}
