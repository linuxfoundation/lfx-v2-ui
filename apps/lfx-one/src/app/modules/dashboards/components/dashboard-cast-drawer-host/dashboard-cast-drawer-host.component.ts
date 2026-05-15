// Copyright The Linux Foundation and each contributor to LFX.
// SPDX-License-Identifier: MIT

import { Component, input, model, output } from '@angular/core';
import { VoteCastDrawerComponent } from '@app/modules/votes/components/vote-cast-drawer/vote-cast-drawer.component';

@Component({
  selector: 'lfx-dashboard-cast-drawer-host',
  imports: [VoteCastDrawerComponent],
  templateUrl: './dashboard-cast-drawer-host.component.html',
  styleUrl: './dashboard-cast-drawer-host.component.scss',
})
export class DashboardCastDrawerHostComponent {
  public readonly voteId = input<string | null>(null);
  public readonly visible = model<boolean>(false);
  public readonly voteSubmitted = output<string>();
}
