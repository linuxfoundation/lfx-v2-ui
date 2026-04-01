// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, HostListener, signal } from '@angular/core';
import { RouterModule } from '@angular/router';

type HealthLabel = 'Excellent' | 'Healthy' | 'At Risk';
type InfluenceLevel = 'Leading' | 'Contributing' | 'Participating' | 'Silent' | 'Non-LF Project';

interface Project {
  name: string;
  slug: string;
  healthLabel: HealthLabel;
  technicalInfluence: InfluenceLevel;
  ecosystemInfluence: InfluenceLevel | 'Non-LF Project';
  contributorAvatars: number;
  contributorCount: number;
  participantAvatars: number;
  participantCount: number;
  activityChange: number;
  activityPositive: boolean;
  sparklinePoints: string;
}

interface Workspace {
  id: string;
  label: string;
  projectSlugs: string[];
}

@Component({
  selector: 'lfx-org-projects',
  imports: [RouterModule],
  templateUrl: './org-projects.component.html',
})
export class OrgProjectsComponent {
  protected readonly workspaceDropdownOpen = signal(false);
  protected readonly activeWorkspaceId = signal('most-active');

  protected readonly workspaces: Workspace[] = [
    { id: 'most-active', label: 'Most Active Projects', projectSlugs: ['juju', 'lxd', 'upstream-multipath', 'cloud-init', 'snapcraft', 'sos', 'linux-kernel', 'islet'] },
    { id: 'cncf', label: 'CNCF Projects', projectSlugs: ['kubernetes', 'prometheus', 'envoy', 'opentelemetry'] },
    { id: 'all', label: 'All Projects', projectSlugs: ['juju', 'lxd', 'upstream-multipath', 'cloud-init', 'snapcraft', 'sos', 'linux-kernel', 'islet', 'kubernetes', 'prometheus', 'envoy', 'opentelemetry'] },
  ];

  protected readonly projects: Project[] = [
    {
      name: 'Juju',
      slug: 'juju',
      healthLabel: 'Excellent',
      technicalInfluence: 'Leading',
      ecosystemInfluence: 'Non-LF Project',
      contributorAvatars: 3,
      contributorCount: 41,
      participantAvatars: 3,
      participantCount: 76,
      activityChange: 67.12,
      activityPositive: true,
      sparklinePoints: '2,15 8,12 14,10 20,8 26,9 32,7 38,6',
    },
    {
      name: 'LXD',
      slug: 'lxd',
      healthLabel: 'Excellent',
      technicalInfluence: 'Leading',
      ecosystemInfluence: 'Non-LF Project',
      contributorAvatars: 2,
      contributorCount: 31,
      participantAvatars: 2,
      participantCount: 63,
      activityChange: 131.99,
      activityPositive: true,
      sparklinePoints: '2,18 8,14 14,11 20,9 26,8 32,7 38,5',
    },
    {
      name: 'Upstream MultiPath TCP Linux Kernel Development',
      slug: 'upstream-multipath',
      healthLabel: 'Healthy',
      technicalInfluence: 'Participating',
      ecosystemInfluence: 'Non-LF Project',
      contributorAvatars: 2,
      contributorCount: 26,
      participantAvatars: 1,
      participantCount: 26,
      activityChange: 4.45,
      activityPositive: true,
      sparklinePoints: '2,12 8,11 14,10 20,10 26,10 32,9 38,9',
    },
    {
      name: 'cloud-init',
      slug: 'cloud-init',
      healthLabel: 'Excellent',
      technicalInfluence: 'Leading',
      ecosystemInfluence: 'Non-LF Project',
      contributorAvatars: 2,
      contributorCount: 24,
      participantAvatars: 1,
      participantCount: 28,
      activityChange: 15.94,
      activityPositive: false,
      sparklinePoints: '2,8 8,10 14,11 20,12 26,13 32,14 38,15',
    },
    {
      name: 'Snapcraft',
      slug: 'snapcraft',
      healthLabel: 'Excellent',
      technicalInfluence: 'Leading',
      ecosystemInfluence: 'Non-LF Project',
      contributorAvatars: 2,
      contributorCount: 22,
      participantAvatars: 2,
      participantCount: 44,
      activityChange: 65.5,
      activityPositive: true,
      sparklinePoints: '2,14 8,11 14,9 20,8 26,7 32,7 38,6',
    },
    {
      name: 'SoS',
      slug: 'sos',
      healthLabel: 'Excellent',
      technicalInfluence: 'Leading',
      ecosystemInfluence: 'Non-LF Project',
      contributorAvatars: 2,
      contributorCount: 20,
      participantAvatars: 1,
      participantCount: 21,
      activityChange: 79.15,
      activityPositive: true,
      sparklinePoints: '2,13 8,10 14,8 20,6 26,7 32,6 38,5',
    },
    {
      name: 'The Linux Kernel',
      slug: 'linux-kernel',
      healthLabel: 'Healthy',
      technicalInfluence: 'Contributing',
      ecosystemInfluence: 'Participating',
      contributorAvatars: 1,
      contributorCount: 18,
      participantAvatars: 2,
      participantCount: 54,
      activityChange: 30.4,
      activityPositive: false,
      sparklinePoints: '2,6 8,9 14,11 20,13 26,14 32,15 38,17',
    },
    {
      name: 'Islet',
      slug: 'islet',
      healthLabel: 'Healthy',
      technicalInfluence: 'Participating',
      ecosystemInfluence: 'Silent',
      contributorAvatars: 1,
      contributorCount: 16,
      participantAvatars: 1,
      participantCount: 20,
      activityChange: 75.12,
      activityPositive: false,
      sparklinePoints: '2,5 8,8 14,10 20,12 26,14 32,16 38,18',
    },
    {
      name: 'Kubernetes',
      slug: 'kubernetes',
      healthLabel: 'Excellent',
      technicalInfluence: 'Leading',
      ecosystemInfluence: 'Leading',
      contributorAvatars: 3,
      contributorCount: 156,
      participantAvatars: 3,
      participantCount: 243,
      activityChange: 12.5,
      activityPositive: true,
      sparklinePoints: '2,14 8,12 14,10 20,9 26,8 32,7 38,6',
    },
    {
      name: 'Prometheus',
      slug: 'prometheus',
      healthLabel: 'Healthy',
      technicalInfluence: 'Contributing',
      ecosystemInfluence: 'Contributing',
      contributorAvatars: 2,
      contributorCount: 42,
      participantAvatars: 2,
      participantCount: 67,
      activityChange: 8.3,
      activityPositive: true,
      sparklinePoints: '2,13 8,12 14,11 20,10 26,10 32,9 38,8',
    },
    {
      name: 'Envoy',
      slug: 'envoy',
      healthLabel: 'Excellent',
      technicalInfluence: 'Contributing',
      ecosystemInfluence: 'Contributing',
      contributorAvatars: 2,
      contributorCount: 98,
      participantAvatars: 2,
      participantCount: 134,
      activityChange: 34.0,
      activityPositive: true,
      sparklinePoints: '2,15 8,12 14,10 20,8 26,7 32,6 38,5',
    },
    {
      name: 'OpenTelemetry',
      slug: 'opentelemetry',
      healthLabel: 'Healthy',
      technicalInfluence: 'Participating',
      ecosystemInfluence: 'Participating',
      contributorAvatars: 1,
      contributorCount: 31,
      participantAvatars: 2,
      participantCount: 48,
      activityChange: 18.0,
      activityPositive: false,
      sparklinePoints: '2,6 8,9 14,11 20,13 26,14 32,16 38,17',
    },
  ];

  protected get activeWorkspace(): Workspace {
    return this.workspaces.find((w) => w.id === this.activeWorkspaceId()) ?? this.workspaces[0];
  }

  protected get visibleProjects(): Project[] {
    const slugs = this.activeWorkspace.projectSlugs;
    return this.projects.filter((p) => slugs.includes(p.slug));
  }

  protected readonly contributorColors = ['#EF4444', '#F97316', '#EAB308'];
  protected readonly participantColors = ['#3B82F6', '#06B6D4', '#8B5CF6'];

  protected selectWorkspace(id: string): void {
    this.activeWorkspaceId.set(id);
    this.workspaceDropdownOpen.set(false);
  }

  protected healthClass(label: HealthLabel): string {
    switch (label) {
      case 'Excellent': return 'bg-emerald-100 text-emerald-800';
      case 'Healthy': return 'bg-blue-100 text-blue-800';
      default: return 'bg-red-100 text-red-700';
    }
  }

  protected technicalInfluenceClass(level: InfluenceLevel): string {
    switch (level) {
      case 'Leading': return 'text-slate-900';
      case 'Contributing': return 'text-slate-900';
      case 'Participating': return 'text-slate-900';
      default: return 'text-slate-400';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-workspace-dropdown]')) {
      this.workspaceDropdownOpen.set(false);
    }
  }
}
