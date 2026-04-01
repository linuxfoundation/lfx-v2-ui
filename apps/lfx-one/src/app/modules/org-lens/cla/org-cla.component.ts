// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';

interface ClaAgreement {
  project: string;
  foundation: string;
  type: 'CCLA' | 'ICLA';
  typeClass: string;
  signedBy: string;
  signedDate: string;
  expiresDate: string | null;
  status: 'Signed' | 'Pending' | 'Expired';
  statusClass: string;
  contributors: number;
}

@Component({
  selector: 'lfx-org-cla',
  imports: [ButtonComponent],
  templateUrl: './org-cla.component.html',
})
export class OrgClaComponent {
  protected readonly agreements: ClaAgreement[] = [
    {
      project: 'Kubernetes',
      foundation: 'CNCF',
      type: 'CCLA',
      typeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      signedBy: 'Jane Smith',
      signedDate: 'Jan 12, 2020',
      expiresDate: null,
      status: 'Signed',
      statusClass: 'bg-green-50 text-green-700',
      contributors: 156,
    },
    {
      project: 'Linux Kernel',
      foundation: 'Linux Foundation',
      type: 'CCLA',
      typeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      signedBy: 'John Doe',
      signedDate: 'Mar 5, 2018',
      expiresDate: null,
      status: 'Signed',
      statusClass: 'bg-green-50 text-green-700',
      contributors: 89,
    },
    {
      project: 'Envoy Proxy',
      foundation: 'CNCF',
      type: 'CCLA',
      typeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      signedBy: 'Jane Smith',
      signedDate: 'Jun 22, 2021',
      expiresDate: null,
      status: 'Signed',
      statusClass: 'bg-green-50 text-green-700',
      contributors: 67,
    },
    {
      project: 'Prometheus',
      foundation: 'CNCF',
      type: 'CCLA',
      typeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      signedBy: 'Alice Chen',
      signedDate: 'Feb 14, 2022',
      expiresDate: null,
      status: 'Signed',
      statusClass: 'bg-green-50 text-green-700',
      contributors: 42,
    },
    {
      project: 'OpenTelemetry',
      foundation: 'CNCF',
      type: 'CCLA',
      typeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      signedBy: 'Bob Wilson',
      signedDate: 'Sep 1, 2022',
      expiresDate: null,
      status: 'Pending',
      statusClass: 'bg-amber-50 text-amber-700',
      contributors: 31,
    },
    {
      project: 'FINOS Legend',
      foundation: 'FINOS',
      type: 'CCLA',
      typeClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      signedBy: 'Jane Smith',
      signedDate: 'Nov 30, 2022',
      expiresDate: 'Nov 30, 2024',
      status: 'Expired',
      statusClass: 'bg-red-50 text-red-700',
      contributors: 8,
    },
  ];
}
