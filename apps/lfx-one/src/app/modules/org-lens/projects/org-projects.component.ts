// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { DecimalPipe } from '@angular/common';
import { Component, signal } from '@angular/core';

type InfluenceLevel = 'Leading' | 'Contributing' | 'Participating' | 'Silent';

interface Project {
  name: string;
  foundation: string;
  level: InfluenceLevel;
  commits: number;
  contributors: number;
  maintainers: number;
  healthScore: number;
}

@Component({
  selector: 'lfx-org-projects',
  imports: [DecimalPipe],
  templateUrl: './org-projects.component.html',
})
export class OrgProjectsComponent {
  protected readonly activeFilter = signal<InfluenceLevel | 'All'>('All');

  protected readonly influenceCounts = { leading: 8, contributing: 15, participating: 18, silent: 42 };

  protected readonly filters: (InfluenceLevel | 'All')[] = ['All', 'Leading', 'Contributing', 'Participating', 'Silent'];

  protected readonly projects: Project[] = [
    { name: 'Kubernetes', foundation: 'CNCF', level: 'Leading', commits: 2847, contributors: 156, maintainers: 12, healthScore: 98 },
    { name: 'Linux Kernel', foundation: 'Linux Foundation', level: 'Leading', commits: 1203, contributors: 89, maintainers: 8, healthScore: 95 },
    { name: 'Envoy Proxy', foundation: 'CNCF', level: 'Leading', commits: 934, contributors: 67, maintainers: 5, healthScore: 91 },
    { name: 'Prometheus', foundation: 'CNCF', level: 'Contributing', commits: 734, contributors: 42, maintainers: 3, healthScore: 88 },
    { name: 'OpenTelemetry', foundation: 'CNCF', level: 'Contributing', commits: 521, contributors: 31, maintainers: 2, healthScore: 84 },
    { name: 'Argo CD', foundation: 'CNCF', level: 'Contributing', commits: 412, contributors: 28, maintainers: 2, healthScore: 80 },
    { name: 'Fluentd', foundation: 'CNCF', level: 'Participating', commits: 298, contributors: 18, maintainers: 1, healthScore: 72 },
    { name: 'Jaeger', foundation: 'CNCF', level: 'Participating', commits: 187, contributors: 11, maintainers: 1, healthScore: 65 },
    { name: 'Harbor', foundation: 'CNCF', level: 'Participating', commits: 145, contributors: 9, maintainers: 1, healthScore: 61 },
    { name: 'OpenSSF Scorecard', foundation: 'OpenSSF', level: 'Silent', commits: 12, contributors: 2, maintainers: 0, healthScore: 45 },
  ];

  protected get filteredProjects(): Project[] {
    const filter = this.activeFilter();
    if (filter === 'All') return this.projects;
    return this.projects.filter((p) => p.level === filter);
  }

  protected levelClass(level: InfluenceLevel): string {
    switch (level) {
      case 'Leading': return 'bg-green-50 text-green-700 border border-green-200';
      case 'Contributing': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'Participating': return 'bg-amber-50 text-amber-700 border border-amber-200';
      default: return 'bg-slate-100 text-slate-500';
    }
  }

  protected healthClass(score: number): string {
    if (score >= 85) return 'text-green-600';
    if (score >= 65) return 'text-amber-600';
    return 'text-red-500';
  }

  protected filterClass(filter: InfluenceLevel | 'All'): string {
    return this.activeFilter() === filter
      ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-white text-slate-600 border-gray-200 hover:border-blue-400 hover:text-blue-600';
  }
}
