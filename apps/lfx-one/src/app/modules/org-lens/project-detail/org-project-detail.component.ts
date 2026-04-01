// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { ChartComponent } from '@components/chart/chart.component';
import { lfxColors } from '@lfx-one/shared/constants';
import { hexToRgba } from '@lfx-one/shared/utils';

import type { ChartData, ChartOptions } from 'chart.js';

type ActiveTab = 'influence' | 'leaderboards';
type TimeRange = '1y' | '2y' | 'all';
type LeaderboardMode = 'calculated' | 'activity';

interface TechMetricCard {
  label: string;
  description: string;
  companyData: number[];
  avgData: number[];
  negative?: boolean;
}

interface EcoMetricCard {
  label: string;
  description: string;
  companyData: number[] | null;
}

interface LeaderboardEntry {
  rank: number;
  org: string;
  level: 'Leading' | 'Contributing' | 'Participating' | 'Silent';
  highlight: boolean;
}

interface BubbleOrg {
  name: string;
  size: number;
  dark: boolean;
}

const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];

const PROJECT_DATA: Record<string, {
  name: string;
  initial: string;
  description: string;
  foundation: string;
  firstCommit: string;
  softwareValue: string;
  healthLabel: string;
  techLevel: string;
  ecoLevel: string;
  membershipTier: string;
  membershipDescription: string;
  platinumCount: number;
  platinumTotal: number;
  memberTotal: number;
}> = {
  'juju': { name: 'Juju', initial: 'J', description: 'Open source application modelling tool for Kubernetes and bare metal.', foundation: 'Non-LF Project', firstCommit: 'Mar 2011', softwareValue: '$4.2M', healthLabel: 'Excellent', techLevel: 'Leading', ecoLevel: 'Non-LF Project', membershipTier: 'N/A', membershipDescription: 'This is a non-LF project. Your organization contributes directly to the project.', platinumCount: 0, platinumTotal: 0, memberTotal: 0 },
  'lxd': { name: 'LXD', initial: 'L', description: 'Powerful system container and virtual machine manager.', foundation: 'Non-LF Project', firstCommit: 'Nov 2014', softwareValue: '$3.1M', healthLabel: 'Excellent', techLevel: 'Leading', ecoLevel: 'Non-LF Project', membershipTier: 'N/A', membershipDescription: 'This is a non-LF project. Your organization contributes directly to the project.', platinumCount: 0, platinumTotal: 0, memberTotal: 0 },
  'upstream-multipath': { name: 'Upstream MultiPath TCP Linux Kernel Development', initial: 'U', description: 'Multipath TCP implementation for the Linux kernel.', foundation: 'Non-LF Project', firstCommit: 'Jan 2013', softwareValue: '$1.8M', healthLabel: 'Healthy', techLevel: 'Participating', ecoLevel: 'Non-LF Project', membershipTier: 'N/A', membershipDescription: 'This is a non-LF project. Your organization contributes directly to the project.', platinumCount: 0, platinumTotal: 0, memberTotal: 0 },
  'cloud-init': { name: 'cloud-init', initial: 'C', description: 'Industry standard multi-distribution method for cross-platform cloud instance initialization.', foundation: 'Non-LF Project', firstCommit: 'Feb 2012', softwareValue: '$2.9M', healthLabel: 'Excellent', techLevel: 'Leading', ecoLevel: 'Non-LF Project', membershipTier: 'N/A', membershipDescription: 'This is a non-LF project. Your organization contributes directly to the project.', platinumCount: 0, platinumTotal: 0, memberTotal: 0 },
  'snapcraft': { name: 'Snapcraft', initial: 'S', description: 'Tool for building and publishing snaps — universal Linux packages.', foundation: 'Non-LF Project', firstCommit: 'Oct 2015', softwareValue: '$2.3M', healthLabel: 'Excellent', techLevel: 'Leading', ecoLevel: 'Non-LF Project', membershipTier: 'N/A', membershipDescription: 'This is a non-LF project. Your organization contributes directly to the project.', platinumCount: 0, platinumTotal: 0, memberTotal: 0 },
  'sos': { name: 'SoS', initial: 'S', description: 'A unified tool for collecting system logs and diagnostic information.', foundation: 'Non-LF Project', firstCommit: 'Jun 2007', softwareValue: '$1.2M', healthLabel: 'Excellent', techLevel: 'Leading', ecoLevel: 'Non-LF Project', membershipTier: 'N/A', membershipDescription: 'This is a non-LF project. Your organization contributes directly to the project.', platinumCount: 0, platinumTotal: 0, memberTotal: 0 },
  'linux-kernel': { name: 'The Linux Kernel', initial: 'L', description: 'The Linux kernel is a free and open-source, monolithic Unix-like operating system kernel.', foundation: 'Linux Foundation', firstCommit: 'Apr 1991', softwareValue: '$14.7B', healthLabel: 'Healthy', techLevel: 'Contributing', ecoLevel: 'Participating', membershipTier: 'Platinum Member', membershipDescription: 'The Linux Kernel is the core project of the Linux Foundation. Your organization is a Platinum Member.', platinumCount: 1, platinumTotal: 14, memberTotal: 721 },
  'islet': { name: 'Islet', initial: 'I', description: 'A software platform to enable Confidential Computing on Arm architecture.', foundation: 'Confidential Computing Consortium', firstCommit: 'Sep 2022', softwareValue: '$0.4M', healthLabel: 'Healthy', techLevel: 'Participating', ecoLevel: 'Silent', membershipTier: 'Silver Member', membershipDescription: 'Islet is a project of the Confidential Computing Consortium. Your organization is a Silver Member.', platinumCount: 1, platinumTotal: 8, memberTotal: 143 },
  'kubernetes': { name: 'Kubernetes', initial: 'K', description: 'Open-source container orchestration system for automating deployment, scaling, and management.', foundation: 'CNCF', firstCommit: 'Jun 2014', softwareValue: '$18.2B', healthLabel: 'Excellent', techLevel: 'Leading', ecoLevel: 'Leading', membershipTier: 'Platinum Member', membershipDescription: 'Kubernetes is a Graduated Project of CNCF. Your organization is a Platinum Member.', platinumCount: 1, platinumTotal: 14, memberTotal: 721 },
  'prometheus': { name: 'Prometheus', initial: 'P', description: 'Open-source systems monitoring and alerting toolkit.', foundation: 'CNCF', firstCommit: 'Nov 2012', softwareValue: '$2.4M', healthLabel: 'Healthy', techLevel: 'Contributing', ecoLevel: 'Contributing', membershipTier: 'Platinum Member', membershipDescription: 'Prometheus is a Graduated Project of CNCF. Your organization is a Platinum Member.', platinumCount: 1, platinumTotal: 14, memberTotal: 721 },
  'envoy': { name: 'Envoy', initial: 'E', description: 'Envoy is an open source edge and service proxy, designed for cloud-native applications.', foundation: 'CNCF', firstCommit: 'Aug 2016', softwareValue: '$3.9B', healthLabel: 'Excellent', techLevel: 'Leading', ecoLevel: 'Leading', membershipTier: 'Platinum Member', membershipDescription: 'Envoy is a Graduated Project of CNCF. Your organization is a Platinum Member.', platinumCount: 1, platinumTotal: 14, memberTotal: 721 },
  'opentelemetry': { name: 'OpenTelemetry', initial: 'O', description: 'Observability framework and toolkit designed to create and manage telemetry data.', foundation: 'CNCF', firstCommit: 'May 2019', softwareValue: '$1.9M', healthLabel: 'Healthy', techLevel: 'Participating', ecoLevel: 'Participating', membershipTier: 'Platinum Member', membershipDescription: 'OpenTelemetry is a Graduated Project of CNCF. Your organization is a Platinum Member.', platinumCount: 1, platinumTotal: 14, memberTotal: 721 },
};

@Component({
  selector: 'lfx-org-project-detail',
  imports: [RouterModule, ChartComponent],
  templateUrl: './org-project-detail.component.html',
})
export class OrgProjectDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), { initialValue: '' });

  protected readonly projectMeta = computed(() => PROJECT_DATA[this.slug()] ?? {
    name: this.slug(), initial: '?', description: '', foundation: '', firstCommit: '', softwareValue: '', healthLabel: 'Healthy',
    techLevel: '', ecoLevel: '', membershipTier: '', membershipDescription: '', platinumCount: 0, platinumTotal: 0, memberTotal: 0,
  });

  protected readonly activeTab = signal<ActiveTab>('influence');
  protected readonly timeRange = signal<TimeRange>('2y');
  protected readonly leaderboardMode = signal<LeaderboardMode>('calculated');
  protected readonly months = MONTHS;

  // ─── Sparkline chart options ────────────────────────────────────────────────
  protected readonly sparklineTechOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: { x: { display: false }, y: { display: false } },
    datasets: { line: { tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 0 } },
    layout: { padding: 2 },
  };

  protected readonly sparklineEcoOptions: ChartOptions<'line'> = {
    ...this.sparklineTechOptions,
  };

  // ─── Technical metric cards ──────────────────────────────────────────────
  protected readonly technicalMetrics: TechMetricCard[] = [
    { label: 'Maintainers', description: 'Our company employs <strong>1 or more</strong> maintainers for this project.', companyData: [3, 4, 3, 5, 6, 7, 8, 9], avgData: [2, 2, 3, 3, 3, 4, 4, 4] },
    { label: 'Contributors', description: 'Our company employs <strong>4.7%</strong> of contributors to this project.', companyData: [5, 5, 6, 6, 7, 7, 7, 8], avgData: [4, 4, 4, 5, 5, 5, 6, 6] },
    { label: 'Commit Activities', description: 'Employees made <strong>10.56%</strong> of all commit activities.', companyData: [4, 5, 6, 7, 8, 9, 9, 10], avgData: [5, 5, 5, 6, 6, 7, 7, 7] },
    { label: 'Pull Requests Opened', description: 'Employees opened <strong>16.33%</strong> of all PRs.', companyData: [5, 6, 7, 8, 9, 10, 11, 12], avgData: [4, 4, 5, 5, 6, 6, 7, 7] },
    { label: 'Avg Time to Merge PRs', description: 'PRs merged <strong class="text-red-500">22.67% slower</strong> than average.', companyData: [8, 8, 7, 7, 6, 6, 5, 4], avgData: [7, 7, 7, 7, 7, 7, 7, 7], negative: true },
  ];

  // ─── Ecosystem metric cards ──────────────────────────────────────────────
  protected readonly ecosystemMetrics: EcoMetricCard[] = [
    { label: 'Collaboration Activity', description: 'Employees contributed <strong>9.6%</strong> of all collaboration activities.', companyData: [4, 5, 5, 6, 7, 7, 8, 9] },
    { label: 'Meeting Attendance', description: 'Our company has no meeting attendance for this project.', companyData: null },
    { label: 'Board Members', description: 'Our company employs <strong>2 board members</strong> for this foundation.', companyData: [3, 4, 4, 5, 5, 6, 6, 7] },
    { label: 'Committee Members', description: 'Employees make up <strong>1.1%</strong> of all committee members.', companyData: [3, 3, 4, 4, 5, 5, 5, 6] },
    { label: 'Event Attendance', description: 'Employees attended <strong>63.0%</strong> of all foundation events.', companyData: [5, 7, 8, 10, 12, 14, 15, 17] },
    { label: 'Event Speakers', description: 'Employees represented <strong>2.4%</strong> of all speakers at foundation events.', companyData: [3, 3, 4, 4, 5, 5, 6, 6] },
    { label: 'Event Sponsorships', description: 'Our company reached <strong>2.6%</strong> of attendees through sponsorship.', companyData: [3, 4, 4, 5, 5, 6, 6, 7] },
    { label: 'Meetup Attendance', description: 'Employees attended <strong>0.8%</strong> of all foundation meetups.', companyData: [2, 2, 3, 3, 3, 4, 4, 4] },
    { label: 'Certified Individuals', description: 'Employees make up <strong>0.3%</strong> of all certified individuals.', companyData: [2, 2, 2, 3, 3, 3, 4, 4] },
  ];

  protected readonly technicalLeaderboard: LeaderboardEntry[] = [
    { rank: 1, org: 'Tetrate.io Inc', level: 'Leading', highlight: false },
    { rank: 2, org: 'Google LLC', level: 'Leading', highlight: true },
    { rank: 3, org: 'Mosaic', level: 'Leading', highlight: false },
    { rank: 4, org: 'Red Hat', level: 'Leading', highlight: false },
    { rank: 5, org: 'NetEase, Inc.', level: 'Leading', highlight: false },
    { rank: 6, org: 'Microsoft Corporation', level: 'Leading', highlight: false },
    { rank: 7, org: 'Nutanix, Inc.', level: 'Leading', highlight: false },
    { rank: 8, org: 'The Trade Desk, Inc.', level: 'Leading', highlight: false },
    { rank: 9, org: 'SAP SE', level: 'Leading', highlight: false },
    { rank: 10, org: 'Apple Inc.', level: 'Leading', highlight: false },
  ];

  protected readonly ecosystemLeaderboard: LeaderboardEntry[] = [
    { rank: 1, org: 'Tetrate.io Inc', level: 'Leading', highlight: false },
    { rank: 2, org: 'Bloomberg LP', level: 'Leading', highlight: false },
    { rank: 3, org: 'Nutanix, Inc.', level: 'Leading', highlight: false },
    { rank: 4, org: 'Google LLC', level: 'Leading', highlight: true },
    { rank: 5, org: 'Microsoft Corporation', level: 'Contributing', highlight: false },
    { rank: 6, org: 'IBM', level: 'Contributing', highlight: false },
    { rank: 7, org: 'Red Hat', level: 'Contributing', highlight: false },
    { rank: 8, org: 'Apple Inc.', level: 'Participating', highlight: false },
    { rank: 9, org: 'AWS CloudFormation', level: 'Participating', highlight: false },
    { rank: 10, org: 'SAP SE', level: 'Participating', highlight: false },
  ];

  protected readonly bubbleOrgs: BubbleOrg[] = [
    { name: 'Tetrate.io', size: 100, dark: true },
    { name: 'Bloomberg', size: 80, dark: true },
    { name: 'Nutanix', size: 70, dark: true },
    { name: 'Google', size: 65, dark: true },
    { name: 'Microsoft', size: 50, dark: false },
    { name: 'Red Hat', size: 45, dark: false },
    { name: 'IBM', size: 40, dark: false },
    { name: '', size: 35, dark: false },
    { name: '', size: 30, dark: false },
    { name: '', size: 25, dark: false },
  ];

  // ─── Chart data builders ─────────────────────────────────────────────────
  protected techChartData(metric: TechMetricCard): ChartData<'line'> {
    const color = metric.negative ? lfxColors.red[500] : lfxColors.blue[500];
    return {
      labels: MONTHS,
      datasets: [
        {
          data: metric.companyData,
          borderColor: color,
          backgroundColor: hexToRgba(color, 0.1),
          fill: false,
        },
        {
          data: metric.avgData,
          borderColor: lfxColors.gray[200],
          backgroundColor: 'transparent',
          fill: false,
        },
      ],
    };
  }

  protected ecoChartData(companyData: number[]): ChartData<'line'> {
    return {
      labels: MONTHS,
      datasets: [
        {
          data: companyData,
          borderColor: lfxColors.violet[500],
          backgroundColor: hexToRgba(lfxColors.violet[500], 0.1),
          fill: false,
        },
        {
          data: [3, 3, 3, 4, 4, 4, 5, 5],
          borderColor: lfxColors.gray[200],
          backgroundColor: 'transparent',
          fill: false,
        },
      ],
    };
  }

  protected setTimeRange(range: string): void {
    this.timeRange.set(range as TimeRange);
  }

  protected levelClass(level: string): string {
    switch (level) {
      case 'Leading': return 'bg-green-50 text-green-700 border border-green-200';
      case 'Contributing': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Participating': return 'bg-amber-50 text-amber-700 border border-amber-200';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  protected healthClass(label: string): string {
    switch (label) {
      case 'Excellent': return 'bg-emerald-100 text-emerald-800';
      case 'Healthy': return 'bg-blue-100 text-blue-800';
      default: return 'bg-red-100 text-red-700';
    }
  }

  protected bubbleOpacity(size: number): string {
    if (size >= 80) return 'bg-blue-600';
    if (size >= 60) return 'bg-blue-400';
    if (size >= 45) return 'bg-blue-300';
    return 'bg-blue-100';
  }

  protected bubbleTextColor(size: number): string {
    return size >= 45 ? 'text-white' : 'text-blue-700';
  }
}
