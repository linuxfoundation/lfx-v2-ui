// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { OrgUserType } from '@lfx-one/shared/interfaces';
import { AppService } from '@services/app.service';

type ActivityTab = 'code' | 'training' | 'events';

interface CodeContributor {
  name: string;
  initials: string;
  project: string;
  commits: number;
  prs: number;
  reviews: number;
  lastActive: string;
}

interface CodeProject {
  name: string;
  foundation: string;
  commits: number;
  contributors: number;
  prsOpened: number;
  prsMerged: number;
  linesChanged: number;
}

interface TrainingRecord {
  name: string;
  initials: string;
  course: string;
  type: 'Training' | 'Certification';
  enrolled: string;
  completed: string;
  status: 'Completed' | 'In Progress' | 'Enrolled';
  statusClass: string;
}

interface EventRecord {
  date: string;
  name: string;
  location: string;
  registrants: number;
  capacity: number;
  sponsor: boolean;
  speakers: number;
}

@Component({
  selector: 'lfx-org-code',
  imports: [DecimalPipe],
  templateUrl: './org-code.component.html',
})
export class OrgCodeComponent {
  private readonly appService = inject(AppService);

  protected readonly orgUserType = this.appService.orgUserType;
  protected readonly isAdmin = computed(() => this.orgUserType() !== 'employee');
  protected readonly canEdit = computed(() => this.orgUserType() === 'admin-edit' || this.orgUserType() === 'conglomerate-admin');

  protected readonly activeTab = signal<ActivityTab>('code');

  protected readonly codeStats = {
    totalCommits: 8423,
    totalContributors: 287,
    maintainers: 15,
    activeRepos: 64,
  };

  protected readonly codeProjects: CodeProject[] = [
    { name: 'Kubernetes', foundation: 'CNCF', commits: 2847, contributors: 156, prsOpened: 412, prsMerged: 389, linesChanged: 284500 },
    { name: 'Linux Kernel', foundation: 'Linux Foundation', commits: 1203, contributors: 89, prsOpened: 215, prsMerged: 198, linesChanged: 142300 },
    { name: 'Envoy Proxy', foundation: 'CNCF', commits: 934, contributors: 67, prsOpened: 178, prsMerged: 162, linesChanged: 98700 },
    { name: 'Prometheus', foundation: 'CNCF', commits: 734, contributors: 42, prsOpened: 134, prsMerged: 121, linesChanged: 67400 },
    { name: 'OpenTelemetry', foundation: 'CNCF', commits: 521, contributors: 31, prsOpened: 98, prsMerged: 87, linesChanged: 48200 },
    { name: 'Argo CD', foundation: 'CNCF', commits: 412, contributors: 28, prsOpened: 76, prsMerged: 69, linesChanged: 35600 },
    { name: 'Fluentd', foundation: 'CNCF', commits: 298, contributors: 18, prsOpened: 54, prsMerged: 48, linesChanged: 24100 },
  ];

  protected readonly topContributors: CodeContributor[] = [
    { name: 'Alice Chen', initials: 'AC', project: 'Kubernetes', commits: 412, prs: 89, reviews: 234, lastActive: 'Today' },
    { name: 'Bob Wilson', initials: 'BW', project: 'Linux Kernel', commits: 298, prs: 54, reviews: 178, lastActive: 'Yesterday' },
    { name: 'Carol Martinez', initials: 'CM', project: 'Envoy Proxy', commits: 187, prs: 43, reviews: 112, lastActive: '3 days ago' },
    { name: 'David Park', initials: 'DP', project: 'Prometheus', commits: 134, prs: 31, reviews: 89, lastActive: '1 week ago' },
    { name: 'Emma Johnson', initials: 'EJ', project: 'Kubernetes', commits: 98, prs: 22, reviews: 67, lastActive: 'Today' },
  ];

  protected readonly trainingStats = {
    totalEnrollments: 143,
    completed: 89,
    inProgress: 34,
    certifications: 28,
  };

  protected readonly trainingRecords: TrainingRecord[] = [
    { name: 'Alice Chen', initials: 'AC', course: 'Certified Kubernetes Administrator (CKA)', type: 'Certification', enrolled: 'Jan 10, 2025', completed: 'Mar 15, 2025', status: 'Completed', statusClass: 'bg-green-50 text-green-700' },
    { name: 'Bob Wilson', initials: 'BW', course: 'LFD201: Introduction to Open Source', type: 'Training', enrolled: 'Feb 1, 2025', completed: 'Feb 28, 2025', status: 'Completed', statusClass: 'bg-green-50 text-green-700' },
    { name: 'Carol Martinez', initials: 'CM', course: 'LFS258: Kubernetes Fundamentals', type: 'Training', enrolled: 'Mar 5, 2025', completed: '—', status: 'In Progress', statusClass: 'bg-blue-50 text-blue-700' },
    { name: 'David Park', initials: 'DP', course: 'Certified Kubernetes Security Specialist (CKS)', type: 'Certification', enrolled: 'Mar 20, 2025', completed: '—', status: 'Enrolled', statusClass: 'bg-amber-50 text-amber-700' },
    { name: 'Emma Johnson', initials: 'EJ', course: 'LFS250: Kubernetes and Cloud Native Essentials', type: 'Training', enrolled: 'Feb 15, 2025', completed: 'Mar 30, 2025', status: 'Completed', statusClass: 'bg-green-50 text-green-700' },
    { name: 'Frank Lee', initials: 'FL', course: 'LFS162: Introduction to DevOps and Site Reliability Engineering', type: 'Training', enrolled: 'Jan 25, 2025', completed: 'Feb 20, 2025', status: 'Completed', statusClass: 'bg-green-50 text-green-700' },
  ];

  protected readonly eventStats = {
    attended: 24,
    speakers: 8,
    upcoming: 5,
    sponsored: 3,
  };

  protected readonly events: EventRecord[] = [
    { date: 'May 12–14, 2025', name: 'KubeCon EU 2025', location: 'London, UK', registrants: 18, capacity: 18, sponsor: true, speakers: 3 },
    { date: 'Mar 25–27, 2025', name: 'Open Source Summit NA', location: 'Denver, CO', registrants: 12, capacity: 15, sponsor: false, speakers: 2 },
    { date: 'Feb 3–5, 2025', name: 'FOSDEM 2025', location: 'Brussels, BE', registrants: 6, capacity: 10, sponsor: false, speakers: 1 },
    { date: 'Jan 20–22, 2025', name: 'Linux Foundation Member Summit', location: 'Napa, CA', registrants: 4, capacity: 6, sponsor: true, speakers: 0 },
    { date: 'Jun 23–25, 2025', name: 'Open Source Summit Europe (Upcoming)', location: 'Amsterdam, NL', registrants: 9, capacity: 12, sponsor: true, speakers: 2 },
  ];

  protected setTab(tab: ActivityTab): void {
    this.activeTab.set(tab);
  }
}
