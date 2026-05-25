// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { environment } from '@environments/environment';
import { CrowdfundingInitiativesStats, InitiativeBase, InitiativesResponse } from '@lfx-one/shared/interfaces';
import { CrowdfundingService } from '@services/crowdfunding.service';
import { map } from 'rxjs';
import { InitiativesStatsBarComponent } from './components/initiatives-stats-bar/initiatives-stats-bar.component';
import { InitiativesListComponent } from './components/initiatives-list/initiatives-list.component';

const EMPTY_STATS: CrowdfundingInitiativesStats = { activeCount: 0, totalRaised: 0, monthlyGain: 0, totalSponsors: 0 };

@Component({
  selector: 'lfx-my-initiatives',
  imports: [InitiativesStatsBarComponent, InitiativesListComponent],
  templateUrl: './my-initiatives.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyInitiativesComponent {
  // ─── Private Injections ────────────────────────────────────────────────────
  private readonly router = inject(Router);
  private readonly crowdfundingService = inject(CrowdfundingService);

  // ─── Public Fields ─────────────────────────────────────────────────────────
  protected readonly crowdfundingUrl = environment.urls.crowdfunding;

  // ─── Computed Signals ──────────────────────────────────────────────────────
  protected readonly initiatives: Signal<InitiativeBase[]> = this.initInitiatives();
  protected readonly stats: Signal<CrowdfundingInitiativesStats> = this.initStats();

  // ─── Protected Methods ─────────────────────────────────────────────────────
  protected onInitiativeClick(id: string): void {
    void this.router.navigate(['/crowdfunding/initiatives', id]);
  }

  // ─── Private Initializers ──────────────────────────────────────────────────
  private initInitiatives(): Signal<InitiativeBase[]> {
    return toSignal(
      this.crowdfundingService.getMyInitiatives().pipe(map((res: InitiativesResponse) => res.data)),
      { initialValue: [] },
    );
  }

  private initStats(): Signal<CrowdfundingInitiativesStats> {
    return toSignal(this.crowdfundingService.getMyInitiativesStats(), { initialValue: EMPTY_STATS });
  }
}
