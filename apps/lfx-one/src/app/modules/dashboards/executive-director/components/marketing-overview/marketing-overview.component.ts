// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { ChartComponent } from '@components/chart/chart.component';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';

import { ED_EVOLUTION_FILTER_OPTIONS, ED_EVOLUTION_METRICS, NO_TOOLTIP_CHART_OPTIONS } from '@lfx-one/shared/constants';
import { DashboardDrawerType, DashboardMetricCard } from '@lfx-one/shared/interfaces';

import { ScrollShadowDirective } from '@shared/directives/scroll-shadow.directive';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'lfx-marketing-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, ChartComponent, FilterPillsComponent, MetricCardComponent, ScrollShadowDirective, TooltipModule],
  templateUrl: './marketing-overview.component.html',
  styleUrl: './marketing-overview.component.scss',
})
export class MarketingOverviewComponent {
  public readonly scrollShadowDirective = viewChild(ScrollShadowDirective);

  // === Constants ===
  protected readonly filterOptions = ED_EVOLUTION_FILTER_OPTIONS;
  protected readonly noTooltipChartOptions = NO_TOOLTIP_CHART_OPTIONS;
  protected readonly DashboardDrawerType = DashboardDrawerType;

  // === WritableSignals ===
  public readonly selectedFilter = signal<string>('all');
  public readonly activeDrawer = signal<DashboardDrawerType | null>(null);

  // === Computed Signals ===
  protected readonly filteredCards = computed<DashboardMetricCard[]>(() => {
    const filter = this.selectedFilter();
    if (filter === 'all') return ED_EVOLUTION_METRICS;
    return ED_EVOLUTION_METRICS.filter((card) => card.category === filter);
  });

  // === Public Methods ===
  public handleCardClick(drawerType: DashboardDrawerType): void {
    this.activeDrawer.set(drawerType);
  }

  public handleDrawerClose(): void {
    this.activeDrawer.set(null);
  }
}
