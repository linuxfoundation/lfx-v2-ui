// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component } from '@angular/core';

interface OrgUser {
  name: string;
  email: string;
  avatarInitials: string;
  role: 'Admin' | 'Manager' | 'Contributor' | 'Viewer';
  roleClass: string;
  access: string[];
  lastActive: string;
  status: 'Active' | 'Pending';
  statusClass: string;
}

@Component({
  selector: 'lfx-org-permissions',
  templateUrl: './org-permissions.component.html',
})
export class OrgPermissionsComponent {
  protected readonly users: OrgUser[] = [
    {
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      avatarInitials: 'JS',
      role: 'Admin',
      roleClass: 'bg-purple-50 text-purple-700 border border-purple-200',
      access: ['All Foundations', 'CLA Signing', 'Seat Management'],
      lastActive: 'Today',
      status: 'Active',
      statusClass: 'bg-green-50 text-green-700',
    },
    {
      name: 'John Doe',
      email: 'john.doe@company.com',
      avatarInitials: 'JD',
      role: 'Admin',
      roleClass: 'bg-purple-50 text-purple-700 border border-purple-200',
      access: ['All Foundations', 'CLA Signing', 'Seat Management'],
      lastActive: 'Yesterday',
      status: 'Active',
      statusClass: 'bg-green-50 text-green-700',
    },
    {
      name: 'Alice Chen',
      email: 'alice.chen@company.com',
      avatarInitials: 'AC',
      role: 'Manager',
      roleClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      access: ['CNCF', 'OpenSSF'],
      lastActive: '3 days ago',
      status: 'Active',
      statusClass: 'bg-green-50 text-green-700',
    },
    {
      name: 'Bob Wilson',
      email: 'bob.wilson@company.com',
      avatarInitials: 'BW',
      role: 'Contributor',
      roleClass: 'bg-teal-50 text-teal-700 border border-teal-200',
      access: ['CNCF'],
      lastActive: '1 week ago',
      status: 'Active',
      statusClass: 'bg-green-50 text-green-700',
    },
    {
      name: 'Carol Martinez',
      email: 'carol.martinez@company.com',
      avatarInitials: 'CM',
      role: 'Viewer',
      roleClass: 'bg-slate-50 text-slate-600 border border-slate-200',
      access: ['All Foundations (read-only)'],
      lastActive: '2 weeks ago',
      status: 'Active',
      statusClass: 'bg-green-50 text-green-700',
    },
    {
      name: 'David Park',
      email: 'david.park@company.com',
      avatarInitials: 'DP',
      role: 'Manager',
      roleClass: 'bg-blue-50 text-blue-700 border border-blue-200',
      access: ['Linux Foundation', 'ASWF'],
      lastActive: 'Never',
      status: 'Pending',
      statusClass: 'bg-amber-50 text-amber-700',
    },
  ];
}
