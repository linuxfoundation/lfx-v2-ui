// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, signal, ViewChild } from '@angular/core';
import { FilterPillsComponent } from '@components/filter-pills/filter-pills.component';
import { MetricCardComponent } from '@components/metric-card/metric-card.component';
import { MARKETING_OVERVIEW_METRICS } from '@lfx-one/shared/constants';
import { DashboardMetricCard, FilterPillOption } from '@lfx-one/shared/interfaces';
import { ScrollShadowDirective } from '@shared/directives/scroll-shadow.directive';

@Component({
  selector: 'lfx-marketing-overview',
  imports: [FilterPillsComponent, MetricCardComponent, ScrollShadowDirective],
  templateUrl: './marketing-overview.component.html',
})
export class MarketingOverviewComponent {
  @ViewChild(ScrollShadowDirective) public scrollShadowDirective!: ScrollShadowDirective;

  protected readonly filterOptions: FilterPillOption[] = [
    { id: 'all', label: 'All' },
    { id: 'marketing', label: 'Marketing' },
  ];

  protected readonly selectedFilter = signal<string>('all');
  protected readonly marketingCards: DashboardMetricCard[] = MARKETING_OVERVIEW_METRICS;

  protected handleFilterChange(filter: string): void {
    this.selectedFilter.set(filter);
  }
}
