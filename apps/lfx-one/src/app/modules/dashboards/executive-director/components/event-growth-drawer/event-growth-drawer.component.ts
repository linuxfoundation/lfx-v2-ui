// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { ButtonComponent } from '@components/button/button.component';
import { CardComponent } from '@components/card/card.component';
import { formatNumber } from '@lfx-one/shared/utils';
import { DrawerModule } from 'primeng/drawer';

import type { EventGrowthResponse } from '@lfx-one/shared/interfaces';

@Component({
  selector: 'lfx-event-growth-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, CardComponent, DrawerModule],
  templateUrl: './event-growth-drawer.component.html',
  styleUrl: './event-growth-drawer.component.scss',
})
export class EventGrowthDrawerComponent {
  public readonly visible = model<boolean>(false);

  public readonly data = input<EventGrowthResponse>({
    totalAttendees: 0,
    totalEvents: 0,
    totalRevenue: 0,
    revenuePerAttendee: 0,
    attendeeMomChange: 0,
    revenueMomChange: 0,
    trend: 'up',
    monthlyData: [],
    topEvents: [],
  });

  protected readonly formatNumber = formatNumber;

  protected formatCurrency(value: number): string {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
