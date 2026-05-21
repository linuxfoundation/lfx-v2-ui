// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { FundType } from '@lfx-one/shared/enums';
import { CrowdfundingInitiative, CrowdfundingInitiativesStats } from '@lfx-one/shared/interfaces';
import { InitiativesStatsBarComponent } from './components/initiatives-stats-bar/initiatives-stats-bar.component';
import { InitiativesListComponent } from './components/initiatives-list/initiatives-list.component';
import { environment } from '@environments/environment';

const MOCK_INITIATIVES: CrowdfundingInitiative[] = [
  {
    id: 'otel',
    name: 'OpenTelemetry Community Fund',
    description: 'Growing the observability standard for cloud-native software',
    icon: '📡',
    fundType: FundType.GENERAL_FUND,
    status: 'active',
    raised: 68000,
    goal: 175000,
    sponsorsCount: 94,
    publicUrl: environment.urls.crowdfunding,
  },
  {
    id: 'zephyr',
    name: 'Zephyr RTOS Security Hardening',
    description: 'Securing the real-time OS powering billions of IoT devices',
    icon: '⚡',
    fundType: FundType.SECURITY_AUDIT,
    status: 'active',
    raised: 52000,
    goal: 200000,
    sponsorsCount: 41,
    publicUrl: environment.urls.crowdfunding,
  },
  {
    id: 'lkm',
    name: 'Linux Kernel Mentorship Fund',
    description: 'Supporting contributors entering the Linux kernel ecosystem',
    icon: '🌱',
    fundType: FundType.MENTORSHIP,
    status: 'pending',
    raised: 0,
    goal: null,
    sponsorsCount: 0,
  },
];

@Component({
  selector: 'lfx-my-initiatives',
  imports: [InitiativesStatsBarComponent, InitiativesListComponent],
  templateUrl: './my-initiatives.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInitiativesComponent {
  private readonly router = inject(Router);
  protected readonly crowdfundingUrl = environment.urls.crowdfunding;
  protected readonly initiatives = signal<CrowdfundingInitiative[]>(MOCK_INITIATIVES);

  protected readonly stats: Signal<CrowdfundingInitiativesStats> = computed(() => {
    const all = this.initiatives();
    return {
      activeCount: all.filter((i) => i.status === 'active').length,
      totalRaised: all.reduce((sum, i) => sum + i.raised, 0),
      monthlyGain: 8400,
      totalSponsors: all.reduce((sum, i) => sum + i.sponsorsCount, 0),
    };
  });

  protected onInitiativeClick(id: string): void {
    void this.router.navigate(['/crowdfunding/initiatives', id]);
  }
}
